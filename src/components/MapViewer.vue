<template>
  <div id="map-container" class="h-full w-full bg-slate-200"></div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import {
  createArrivalFeature,
  featureToAmapPaths,
  getFeatureAreaKm2,
  getFeatureBBox,
  getFeatureCenter,
  getIntersectionFeature,
  getTurf,
  isPointInsideFeature,
} from '../utils/isochrone'

window._AMapSecurityConfig = {
  securityJsCode: '3520102b9eaeb6a112ae1bde944dd842',
}

const emit = defineEmits([
  'marker-clicked',
  'route-calculated',
  'isochrone-calculated',
  'poi-results-updated',
  'max-commute-time-updated',
])

const props = defineProps({
  locations: {
    type: Array,
    default: () => [],
  },
  anchorPoints: {
    type: Object,
    default: () => ({ start: '', end: '' }),
  },
  commuteTime: {
    type: Number,
    default: 30,
  },
})

const map = ref(null)
const markers = ref([])
const rangeOverlays = ref([])
const intersectionOverlays = ref([])
const poiMarkers = ref([])

let AMap = null
let infoWindow = null
let driving = null
let transit = null
let placeSearch = null
let poiSearch = null
let arrivalRange = null
let updateSequence = 0

const RANGE_STYLES = {
  start: {
    strokeColor: '#2563eb',
    strokeOpacity: 0.7,
    strokeWeight: 2,
    fillColor: '#93c5fd',
    fillOpacity: 0.18,
    zIndex: 20,
  },
  end: {
    strokeColor: '#16a34a',
    strokeOpacity: 0.7,
    strokeWeight: 2,
    fillColor: '#86efac',
    fillOpacity: 0.18,
    zIndex: 21,
  },
  intersection: {
    strokeColor: '#ea580c',
    strokeOpacity: 0.95,
    strokeWeight: 2.5,
    fillColor: '#fb923c',
    fillOpacity: 0.38,
    zIndex: 30,
  },
}

const baseIsochroneResult = {
  status: 'idle',
  hasIntersection: false,
  overlapAreaKm2: null,
  center: null,
  renderedRangeCount: 0,
  unresolvedAnchors: [],
}

const poiKeywords = [
  { keyword: '咖啡馆', scene: '咖啡' },
  { keyword: '美食', scene: '美食' },
]

const emitIsochroneResult = (payload = {}) => {
  emit('isochrone-calculated', {
    ...baseIsochroneResult,
    ...payload,
  })
}

const emitPoiResults = (pois = []) => {
  emit('poi-results-updated', pois)
}

const initMap = async () => {
  try {
    AMap = await AMapLoader.load({
      key: '2755c149ab561bac1e37da8e61d4467c',
      version: '2.0',
      plugins: ['AMap.Marker', 'AMap.InfoWindow', 'AMap.Driving', 'AMap.Transit', 'AMap.PlaceSearch', 'AMap.ArrivalRange'],
    })

    map.value = new AMap.Map('map-container', {
      zoom: 11,
      center: [116.397428, 39.90923],
      viewMode: '2D',
      pitch: 0,
    })

    driving = new AMap.Driving({
      panel: null,
      hideMarkers: true,
      showTraffic: false,
      autoFitView: false,
    })

    transit = new AMap.Transit({
      policy: AMap.TransitPolicy.LEAST_TIME
    })

    placeSearch = new AMap.PlaceSearch({
      city: '全国',
      pageSize: 1,
      pageIndex: 1,
    })

    poiSearch = new AMap.PlaceSearch({
      city: '全国',
      pageSize: 10,
      pageIndex: 1,
    })

    arrivalRange = new AMap.ArrivalRange()

    updateMap()
  } catch (error) {
    console.error('高德地图加载失败:', error)
    emitIsochroneResult({ status: 'error' })
    emitPoiResults([])
  }
}

const removeOverlays = (overlays) => {
  overlays.forEach((overlay) => map.value?.remove(overlay))
}

const clearMapState = () => {
  removeOverlays(markers.value)
  markers.value = []

  removeOverlays(rangeOverlays.value)
  rangeOverlays.value = []

  removeOverlays(intersectionOverlays.value)
  intersectionOverlays.value = []

  removeOverlays(poiMarkers.value)
  poiMarkers.value = []

  if (infoWindow) {
    infoWindow.close()
    infoWindow = null
  }
}

const searchKeyword = (keyword) => new Promise((resolve) => {
  if (!keyword || !placeSearch) {
    resolve(null)
    return
  }

  placeSearch.search(keyword, (status, result) => {
    if (status === 'complete' && result.poiList && result.poiList.pois.length > 0) {
      const poi = result.poiList.pois[0]
      resolve({
        name: keyword,
        longitude: poi.location.lng,
        latitude: poi.location.lat,
      })
      return
    }

    resolve(null)
  })
})

const getArrivalRangeBounds = (anchor, commuteTime) => new Promise((resolve) => {
  if (!arrivalRange || !anchor || !anchor.longitude || !anchor.latitude) {
    console.log('Debug - ArrivalRange or anchor missing, using fallback')
    // 使用圆形缓冲区作为备选方案
    if (anchor && anchor.longitude && anchor.latitude) {
      const fallbackBounds = createCircularBuffer(anchor, commuteTime)
      resolve(fallbackBounds)
    } else {
      resolve([])
    }
    return
  }

  console.log('Debug - Calling ArrivalRange with:', anchor, commuteTime)
  arrivalRange.search(
    new AMap.LngLat(anchor.longitude, anchor.latitude),
    Number(commuteTime),
    (status, result) => {
      console.log('Debug - ArrivalRange result:', status, result)
      if (status === 'complete' && Array.isArray(result?.bounds) && result.bounds.length > 0) {
        console.log('Debug - ArrivalRange bounds found:', result.bounds.length)
        resolve(result.bounds)
        return
      }

      console.log('Debug - ArrivalRange failed, using fallback circular buffer')
      // 使用圆形缓冲区作为备选方案
      const fallbackBounds = createCircularBuffer(anchor, commuteTime)
      resolve(fallbackBounds)
    },
    {
      policy: 'LEAST_TIME',
    },
  )
})

// 创建圆形缓冲区作为备选方案
const createCircularBuffer = (anchor, commuteTime) => {
  if (!anchor || !anchor.longitude || !anchor.latitude) {
    console.log('Debug - Invalid anchor for circular buffer')
    return []
  }

  // 假设平均速度：地铁/公交约 15km/h，即 0.25km/min
  const avgSpeed = 0.25 // km/min
  const radius = commuteTime * avgSpeed // km

  // 将半径转换为经纬度度数（粗略估算）
  // 1度经度约等于 111km，1度纬度约等于 111km
  const radiusInDegrees = radius / 111

  const center = [anchor.longitude, anchor.latitude]
  const points = []
  const segments = 36 // 圆的分段数

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI
    const lng = center[0] + radiusInDegrees * Math.cos(angle)
    const lat = center[1] + radiusInDegrees * Math.sin(angle)
    points.push([lng, lat])
  }

  return [points]
}

const searchPoiInBounds = (keyword, bounds) => new Promise((resolve) => {
  if (!keyword || !bounds || !poiSearch) {
    resolve([])
    return
  }

  poiSearch.searchInBounds(keyword, bounds, (status, result) => {
    if (status === 'complete' && result.poiList && Array.isArray(result.poiList.pois)) {
      resolve(result.poiList.pois)
      return
    }

    resolve([])
  })
})

const renderBounds = (bounds, style, targetCollection) => {
  bounds.forEach((path) => {
    const polygon = new AMap.Polygon({
      path,
      ...style,
    })

    map.value.add(polygon)
    targetCollection.value.push(polygon)
  })
}

const renderFeature = (feature, style, targetCollection) => {
  featureToAmapPaths(feature).forEach((path) => {
    const polygon = new AMap.Polygon({
      path,
      ...style,
    })

    map.value.add(polygon)
    targetCollection.value.push(polygon)
  })
}

const addAnchorMarker = (anchor, labelPrefix, iconName) => {
  if (!anchor || !anchor.longitude || !anchor.latitude) {
    console.log('Debug - Invalid anchor for marker')
    return
  }

  const marker = new AMap.Marker({
    position: [anchor.longitude, anchor.latitude],
    title: anchor.name,
    icon: new AMap.Icon({
      image: `https://webapi.amap.com/theme/v1.3/markers/n/${iconName}.png`,
      size: new AMap.Size(25, 34),
      imageSize: new AMap.Size(25, 34),
    }),
    label: {
      content: `${labelPrefix}: ${anchor.name}`,
      direction: 'top',
    },
  })

  map.value.add(marker)
  markers.value.push(marker)
}

const buildPoiInfoContent = (poi, index) => {
  const addressLine = poi.address ? `<p style="margin: 4px 0 0 0; color: #475569; font-size: 13px; line-height: 1.6;">${poi.address}</p>` : ''
  const typeLine = poi.type ? `<p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">${poi.type}</p>` : ''

  return `
    <div style="padding: 12px; min-width: 240px;">
      <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #0f172a;">${poi.name}</h3>
      <p style="margin: 0; color: #f97316; font-size: 12px; font-weight: 600;">推荐点 ${index + 1}</p>
      ${addressLine}
      ${typeLine}
    </div>
  `
}

const showPoiInfoWindow = (poi, index = 0) => {
  if (!map.value || !AMap) {
    return
  }

  if (!poi || !poi.longitude || !poi.latitude) {
    console.log('Debug - Invalid POI for info window')
    return
  }

  if (infoWindow) {
    infoWindow.close()
  }

  infoWindow = new AMap.InfoWindow({
    content: buildPoiInfoContent(poi, index),
    offset: new AMap.Pixel(0, -22),
  })

  infoWindow.open(map.value, [poi.longitude, poi.latitude])
}

const addLocationMarkers = (locations) => {
  locations.forEach((location, index) => {
    if (!location || !location.longitude || !location.latitude) {
      console.log('Debug - Invalid location for marker:', location)
      return
    }

    const marker = new AMap.Marker({
      position: [location.longitude, location.latitude],
      title: location.name,
      label: {
        content: `${index + 1}. ${location.name}`,
        direction: 'top',
      },
    })

    marker.on('click', () => {
      showPoiInfoWindow(
        {
          name: location.name,
          longitude: location.longitude,
          latitude: location.latitude,
          address: location.description ?? '',
          type: '',
        },
        index,
      )
      emit('marker-clicked', index)
    })

    map.value.add(marker)
    markers.value.push(marker)
  })
}

const renderRecommendedPoiMarkers = (pois) => {
  pois.forEach((poi, index) => {
    if (!poi || !poi.longitude || !poi.latitude) {
      console.log('Debug - Invalid POI for marker:', poi)
      return
    }

    const marker = new AMap.Marker({
      position: [poi.longitude, poi.latitude],
      offset: new AMap.Pixel(-14, -14),
      content: `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: #f97316;
          border: 2px solid #ffffff;
          box-shadow: 0 10px 20px rgba(249, 115, 22, 0.35);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        ">${index + 1}</div>
      `,
    })

    marker.on('click', () => {
      showPoiInfoWindow(poi, index)
    })

    map.value.add(marker)
    poiMarkers.value.push(marker)
  })
}

const calculateRouteReference = (startPoi, endPoi, currentSequence) => {
  if (!driving || !startPoi || !endPoi || !startPoi.longitude || !startPoi.latitude || !endPoi.longitude || !endPoi.latitude) {
    return
  }

  driving.search(
    new AMap.LngLat(startPoi.longitude, startPoi.latitude),
    new AMap.LngLat(endPoi.longitude, endPoi.latitude),
    {
      policy: AMap.DrivingPolicy.LEAST_TIME,
    },
    (status, result) => {
      if (currentSequence !== updateSequence) {
        return
      }

      if (status !== 'complete' || !result.routes || result.routes.length === 0) {
        return
      }

      const distance = result.routes[0].distance
      const duration = result.routes[0].time

      emit('route-calculated', {
        distance: (distance / 1000).toFixed(1),
        duration: Math.ceil(duration / 60),
      })
    },
  )
}

const calculateMaxCommuteTime = (startPoi, endPoi, currentSequence) => {
  if (!startPoi || !endPoi || !startPoi.longitude || !startPoi.latitude || !endPoi.longitude || !endPoi.latitude) {
    return
  }

  // 计算驾车时间
  const drivingPromise = new Promise((resolve) => {
    if (!driving) {
      resolve(0)
      return
    }

    driving.search(
      new AMap.LngLat(startPoi.longitude, startPoi.latitude),
      new AMap.LngLat(endPoi.longitude, endPoi.latitude),
      {
        policy: AMap.DrivingPolicy.LEAST_TIME,
      },
      (status, result) => {
        if (currentSequence !== updateSequence) {
          resolve(0)
          return
        }

        if (status === 'complete' && result.routes && result.routes.length > 0) {
          resolve(result.routes[0].time / 60) // 转换为分钟
          return
        }

        resolve(0)
      },
    )
  })

  // 计算公交时间
  const transitPromise = new Promise((resolve) => {
    if (!transit) {
      resolve(0)
      return
    }

    transit.search(
      new AMap.LngLat(startPoi.longitude, startPoi.latitude),
      new AMap.LngLat(endPoi.longitude, endPoi.latitude),
      (status, result) => {
        if (currentSequence !== updateSequence) {
          resolve(0)
          return
        }

        if (status === 'complete' && result.plans && result.plans.length > 0) {
          resolve(result.plans[0].time / 60) // 转换为分钟
          return
        }

        resolve(0)
      },
    )
  })

  // 获取最大时间并计算滑块最大值
  Promise.all([drivingPromise, transitPromise]).then(([drivingTime, transitTime]) => {
    if (currentSequence !== updateSequence) {
      return
    }

    const maxTime = Math.max(drivingTime, transitTime)
    if (maxTime > 0) {
      // 动态计算滑块最大值：向上取整到最近的10，再加20作为缓冲
      const maxSliderValue = Math.ceil(maxTime / 10) * 10 + 20
      console.log('Max commute time calculated:', maxTime, 'Slider max value:', maxSliderValue)
      emit('max-commute-time-updated', maxSliderValue)
    }
  })
}

const fitMapToOverlays = (overlays) => {
  if (!map.value || overlays.length === 0) {
    return
  }

  map.value.setFitView(overlays)
}

const getBoundsFromFeature = (feature, turf) => {
  const bbox = getFeatureBBox(feature, turf)
  if (!bbox) {
    return null
  }

  const [minLng, minLat, maxLng, maxLat] = bbox
  return new AMap.Bounds(
    new AMap.LngLat(minLng, minLat),
    new AMap.LngLat(maxLng, maxLat),
  )
}

const normalizePoi = (poi, scene) => {
  if (!poi?.location) {
    return null
  }

  const address = [poi.pname, poi.cityname, poi.adname, poi.address]
    .filter(Boolean)
    .join(' ')

  return {
    id: poi.id ?? `${poi.name}-${poi.location.lng}-${poi.location.lat}`,
    name: poi.name,
    scene,
    type: poi.type ?? '',
    address,
    longitude: poi.location.lng,
    latitude: poi.location.lat,
  }
}

const searchRecommendationsInIntersection = async (intersectionFeature, turf, currentSequence) => {
  const bounds = getBoundsFromFeature(intersectionFeature, turf)

  if (!bounds) {
    return []
  }

  const searchResults = await Promise.all(
    poiKeywords.map(async ({ keyword, scene }) => {
      const pois = await searchPoiInBounds(keyword, bounds)
      if (currentSequence !== updateSequence) {
        return []
      }

      return pois
        .map((poi) => normalizePoi(poi, scene))
        .filter(Boolean)
    }),
  )

  if (currentSequence !== updateSequence) {
    return []
  }

  const seen = new Set()
  const filtered = []

  searchResults.flat().forEach((poi) => {
    if (!isPointInsideFeature(poi.longitude, poi.latitude, intersectionFeature, turf)) {
      return
    }

    const dedupeKey = poi.id || `${poi.name}-${poi.longitude}-${poi.latitude}`
    if (seen.has(dedupeKey)) {
      return
    }

    seen.add(dedupeKey)
    filtered.push(poi)
  })

  return filtered.slice(0, 5)
}

const updateMap = async () => {
  if (!map.value || !AMap) {
    return
  }

  clearMapState()
  emitPoiResults([])

  const requestedStart = props.anchorPoints.start?.trim() ?? ''
  const requestedEnd = props.anchorPoints.end?.trim() ?? ''
  const hasRequestedAnchor = Boolean(requestedStart || requestedEnd)

  if (!hasRequestedAnchor) {
    emitIsochroneResult({ status: 'idle' })
    return
  }

  const currentSequence = ++updateSequence

  // 使用 Promise.all 并行搜索
  const [startPoi, endPoi, resolvedLocations] = await Promise.all([
    searchKeyword(requestedStart),
    searchKeyword(requestedEnd),
    Promise.all(
      props.locations.map(async (location) => {
        const poi = await searchKeyword(location.name)
        if (!poi) {
          return location
        }

        return {
          ...location,
          longitude: poi.longitude,
          latitude: poi.latitude,
        }
      }),
    ),
  ])

  if (currentSequence !== updateSequence) {
    return
  }

  const unresolvedAnchors = []
  if (requestedStart && !startPoi) {
    unresolvedAnchors.push('A')
  }
  if (requestedEnd && !endPoi) {
    unresolvedAnchors.push('B')
  }

  if (startPoi) {
    addAnchorMarker(startPoi, '起点 A', 'start')
  }
  if (endPoi) {
    addAnchorMarker(endPoi, '起点 B', 'end')
  }
  if (resolvedLocations.length > 0) {
    addLocationMarkers(resolvedLocations)
  }

  calculateRouteReference(startPoi, endPoi, currentSequence)
  calculateMaxCommuteTime(startPoi, endPoi, currentSequence)

  const [startBounds, endBounds] = await Promise.all([
    getArrivalRangeBounds(startPoi, props.commuteTime),
    getArrivalRangeBounds(endPoi, props.commuteTime),
  ])

  if (currentSequence !== updateSequence) {
    return
  }

  console.log('Debug - startBounds:', startBounds.length, 'endBounds:', endBounds.length)

  if (startBounds.length > 0) {
    renderBounds(startBounds, RANGE_STYLES.start, rangeOverlays)
  }

  if (endBounds.length > 0) {
    renderBounds(endBounds, RANGE_STYLES.end, rangeOverlays)
  }

  const turf = getTurf()
  console.log('Debug - turf available:', !!turf)
  const startFeature = createArrivalFeature(startBounds, turf)
  const endFeature = createArrivalFeature(endBounds, turf)
  console.log('Debug - startFeature:', !!startFeature, 'endFeature:', !!endFeature)
  const renderedRangeCount = Number(Boolean(startFeature)) + Number(Boolean(endFeature))
  const visibleOverlays = [...rangeOverlays.value, ...markers.value]

  if (!turf) {
    fitMapToOverlays(visibleOverlays)
    emitIsochroneResult({
      status: 'error',
      renderedRangeCount,
      unresolvedAnchors,
    })
    return
  }

  if (startFeature && endFeature) {
    try {
      const intersectionFeature = getIntersectionFeature(startFeature, endFeature, turf)

      if (intersectionFeature) {
        renderFeature(intersectionFeature, RANGE_STYLES.intersection, intersectionOverlays)

        const overlapAreaKm2 = getFeatureAreaKm2(intersectionFeature, turf)
        const center = getFeatureCenter(intersectionFeature, turf)
        const recommendedPois = await searchRecommendationsInIntersection(intersectionFeature, turf, currentSequence)

        if (currentSequence !== updateSequence) {
          return
        }

        if (recommendedPois.length > 0) {
          renderRecommendedPoiMarkers(recommendedPois)
          emitPoiResults(recommendedPois)
        }

        const fitTargets = intersectionOverlays.value.length > 0
          ? intersectionOverlays.value
          : visibleOverlays

        fitMapToOverlays(fitTargets)
        emitIsochroneResult({
          status: 'intersection-ready',
          hasIntersection: true,
          overlapAreaKm2,
          center,
          renderedRangeCount,
          unresolvedAnchors,
        })
        return
      }

      fitMapToOverlays(visibleOverlays)
      emitIsochroneResult({
        status: 'no-intersection',
        renderedRangeCount,
        unresolvedAnchors,
      })
      return
    } catch (error) {
      console.error('交集计算或推荐搜索失败:', error)
      fitMapToOverlays(visibleOverlays)
      emitIsochroneResult({
        status: 'error',
        renderedRangeCount,
        unresolvedAnchors,
      })
      return
    }
  }

  fitMapToOverlays(visibleOverlays)

  if (unresolvedAnchors.length > 0) {
    emitIsochroneResult({
      status: 'anchor-not-found',
      renderedRangeCount,
      unresolvedAnchors,
    })
    return
  }

  if (renderedRangeCount === 1) {
    emitIsochroneResult({
      status: 'single-range',
      renderedRangeCount,
    })
    return
  }

  emitIsochroneResult({
    status: 'awaiting-input',
    renderedRangeCount,
  })
}

const focusOnPlace = (location, index) => {
  if (!map.value || !location || !location.longitude || !location.latitude) {
    return
  }

  map.value.setZoomAndCenter(16, [location.longitude, location.latitude], false, 1000)
  showPoiInfoWindow(
    {
      name: location.name,
      longitude: location.longitude,
      latitude: location.latitude,
      address: location.description ?? '',
      type: '',
    },
    index,
  )
}

const focusOnRecommendedPoi = (poi, index = 0) => {
  if (!map.value || !poi || !poi.longitude || !poi.latitude) {
    return
  }

  map.value.setZoomAndCenter(16, [poi.longitude, poi.latitude], false, 1000)
  showPoiInfoWindow(poi, index)
}

onMounted(() => {
  initMap()
})

watch(() => props.anchorPoints, () => {
  updateMap()
}, { deep: true })

watch(() => props.commuteTime, () => {
  updateMap()
})

watch(() => props.locations, () => {
  updateMap()
}, { deep: true })

defineExpose({
  focusOnPlace,
  focusOnRecommendedPoi,
})
</script>
