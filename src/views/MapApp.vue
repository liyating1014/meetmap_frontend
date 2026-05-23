<template>
  <div id="app" class="relative h-screen w-screen overflow-hidden bg-slate-950">
    <MapViewer
      ref="mapViewerRef"
      :locations="mapLocations"
      :anchor-points="anchorPoints"
      :commute-time="commuteTime"
      @route-calculated="handleRouteCalculated"
      @isochrone-calculated="handleIsochroneCalculated"
      @poi-results-updated="handlePoiResultsUpdated"
      @max-commute-time-updated="handleMaxCommuteTimeUpdated"
    />

    <div class="pointer-events-none absolute inset-0 z-20">
      <div class="flex h-full flex-row justify-between p-4 md:p-6">
        <!-- 见面计算器 Toggle Button (Top Left) -->
        <button
          @click="showCalculator = !showCalculator"
          class="pointer-events-auto fixed top-4 left-4 z-30 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-slate-800 transition-colors"
        >
          {{ showCalculator ? '隐藏计算器' : '显示计算器' }}
        </button>

        <!-- 建议见面区域 Toggle Button (Top Right) -->
        <button
          @click="showResult = !showResult"
          class="pointer-events-auto fixed top-4 right-4 z-30 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-slate-800 transition-colors"
        >
          {{ showResult ? '隐藏结果' : '显示结果' }}
        </button>

        <!-- 见面计算器 Panel (Left) -->
        <div v-if="showCalculator" class="pointer-events-auto w-full md:max-w-sm">
          <PlaceList
            :commute-time="commuteTime"
            :max-commute-time="maxCommuteTime"
            :route-info="routeInfo"
            @anchor-points-updated="handleAnchorPointsUpdated"
            @commute-time-updated="handleCommuteTimeUpdated"
            @ai-suggestions-updated="handleAiSuggestionsUpdated"
          />
        </div>

        <!-- 建议见面区域 Panel (Right) -->
        <section v-if="showResult" class="pointer-events-auto w-full md:max-w-xl relative z-10">
          <div class="glass-panel pointer-events-auto rounded-[28px] p-5 text-slate-800 md:p-6">
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Meeting Result
                  </p>
                  <h1 class="mt-2 text-2xl font-semibold text-slate-900">
                    建议见面区域：{{ meetingAreaLabel }}
                  </h1>
                  <p class="mt-2 text-sm leading-6 text-slate-600">
                    {{ meetingSummary }}
                  </p>
                  <p class="mt-2 text-xs text-slate-500">
                    路线参考：{{ routeReferenceLabel }}
                  </p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in scenarioTags"
                    :key="tag"
                    class="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-3">
                <div class="rounded-2xl bg-white/72 p-3 ring-1 ring-white/70">
                  <p class="text-xs uppercase tracking-[0.22em] text-slate-400">通勤阈值</p>
                  <p class="mt-2 text-lg font-semibold text-slate-900">{{ commuteTime }} 分钟</p>
                </div>
                <div class="rounded-2xl bg-white/72 p-3 ring-1 ring-white/70">
                  <p class="text-xs uppercase tracking-[0.22em] text-slate-400">交集面积</p>
                  <p class="mt-2 text-lg font-semibold text-slate-900">{{ overlapAreaLabel }}</p>
                </div>
                <div class="rounded-2xl bg-white/72 p-3 ring-1 ring-white/70">
                  <p class="text-xs uppercase tracking-[0.22em] text-slate-400">交集中心</p>
                  <p class="mt-2 text-lg font-semibold text-slate-900">{{ centerLabel }}</p>
                </div>
              </div>

              <div class="rounded-3xl bg-slate-900 px-4 py-3 text-sm text-slate-100 shadow-lg shadow-slate-900/20">
                主题：面向校园学习、生活聚餐与生产协作的双起点等时圈见面决策。
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <h2 class="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Recommended POIs
                  </h2>
                  <span class="text-xs text-slate-400">{{ poiPanelHint }}</span>
                </div>

                <div v-if="recommendedPois.length > 0" class="space-y-3">
                  <button
                    v-for="(poi, index) in recommendedPois"
                    :key="poi.id"
                    type="button"
                    class="block w-full rounded-2xl bg-white/78 p-4 text-left ring-1 ring-white/70 transition-transform duration-200 hover:-translate-y-0.5"
                    @click="handlePoiSelected(poi, index)"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-semibold text-white">
                            {{ index + 1 }}
                          </span>
                          <h3 class="text-base font-semibold text-slate-900">{{ poi.name }}</h3>
                          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            {{ poi.scene }}
                          </span>
                        </div>
                        <p class="mt-2 text-sm leading-6 text-slate-600">
                          {{ poi.address || '交集区域内候选地点' }}
                        </p>
                        <p v-if="poi.type" class="mt-1 text-xs text-slate-400">
                          {{ poi.type }}
                        </p>
                      </div>
                      <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        点击定位
                      </span>
                    </div>
                  </button>
                </div>

                <div v-else class="space-y-3">
                  <article
                    v-for="poi in fallbackPoiTypes"
                    :key="poi.name"
                    class="rounded-2xl bg-white/78 p-4 ring-1 ring-white/70 cursor-pointer hover:bg-white/90 transition-colors"
                    @click="handleFallbackPoiClick(poi)"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="flex items-center gap-2">
                          <h3 class="text-base font-semibold text-slate-900">{{ poi.name }}</h3>
                          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            {{ poi.scene }}
                          </span>
                        </div>
                        <p class="mt-2 text-sm leading-6 text-slate-600">{{ poi.description }}</p>
                      </div>
                      <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {{ poi.eta }}
                      </span>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import MapViewer from '../components/MapViewer.vue'
import PlaceList from '../components/PlaceList.vue'

const mapViewerRef = ref(null)
const mapLocations = ref([])
const commuteTime = ref(30)
const maxCommuteTime = ref(60)
const routeInfo = ref({ distance: null, duration: null })
const anchorPoints = ref({ start: '', end: '' })
const recommendedPois = ref([])
const isochroneResult = ref({
  status: 'idle',
  hasIntersection: false,
  overlapAreaKm2: null,
  center: null,
  renderedRangeCount: 0,
  unresolvedAnchors: [],
})
const showCalculator = ref(true)
const showResult = ref(true)

const scenarioTags = ['校园', '生活', '生产']

const meetingAreaLabel = computed(() => {
  switch (isochroneResult.value.status) {
    case 'intersection-ready':
      return '交集中心附近'
    case 'no-intersection':
      return '当前无重叠区域'
    case 'single-range':
      return '已生成单侧到达圈'
    case 'anchor-not-found':
      return '起点解析失败'
    case 'error':
      return '计算异常'
    default:
      return '等待输入'
  }
})

const meetingSummary = computed(() => {
  switch (isochroneResult.value.status) {
    case 'idle':
      return '输入两个起点后，将调用高德 ArrivalRange 生成双方的到达圈，并自动高亮交集区域。'
    case 'single-range':
      return '当前只生成了一侧等时圈。补全另一个起点后，地图会继续执行交集计算并自动缩放。'
    case 'anchor-not-found':
      return `未能解析起点 ${isochroneResult.value.unresolvedAnchors.join('、')}。请使用更具体的校区、地铁站、商圈或园区名称。`
    case 'no-intersection':
      return `在 ${commuteTime.value} 分钟阈值下，两侧到达圈没有重叠。可以尝试放宽时间或调整起点位置。`
    case 'intersection-ready':
      return recommendedPois.value.length > 0
        ? `已完成交集计算，并在重叠区域内找到 ${recommendedPois.value.length} 个推荐地点。点击列表项可直接跳转到地图。`
        : '已完成 A、B 两个起点的等时圈计算，并使用 Turf 求出交集。当前交集区内暂未检索到匹配的咖啡馆或美食地点。'
    case 'error':
      return '等时圈或交集计算失败，请检查地图脚本、网络环境和输入地点。'
    default:
      return '继续输入两个起点后即可开始计算。'
  }
})

const overlapAreaLabel = computed(() => {
  if (!isochroneResult.value.overlapAreaKm2) {
    return '待计算'
  }

  return `${isochroneResult.value.overlapAreaKm2.toFixed(2)} km²`
})

const centerLabel = computed(() => {
  if (!isochroneResult.value.center) {
    return '待生成'
  }

  const { longitude, latitude } = isochroneResult.value.center
  return `${longitude.toFixed(4)}, ${latitude.toFixed(4)}`
})

const routeReferenceLabel = computed(() => {
  if (!routeInfo.value.distance || !routeInfo.value.duration) {
    return '待计算'
  }

  return `${routeInfo.value.distance} km / ${routeInfo.value.duration} 分钟`
})

const poiPanelHint = computed(() => {
  if (recommendedPois.value.length > 0) {
    return '前 5 个交集区候选地点'
  }

  if (isochroneResult.value.hasIntersection) {
    return '交集区内暂无匹配结果'
  }

  return '等待交集区检索结果'
})

const fallbackPoiTypes = computed(() => {
  const eta = isochroneResult.value.hasIntersection ? '等待检索' : `${commuteTime.value} 分钟阈值`

  return [
    {
      name: '校园共享学习点',
      scene: '校园',
      description: '优先关注图书馆、自习室和校园咖啡吧，适合课程讨论与组会。',
      eta,
    },
    {
      name: '生活餐饮会面点',
      scene: '生活',
      description: '优先关注餐厅、咖啡馆和轻食店，适合下课后或下班后的碰面场景。',
      eta,
    },
    {
      name: '生产协作接待点',
      scene: '生产',
      description: '优先关注联合办公、园区前厅和商务会客空间，适合项目洽谈。',
      eta,
    },
  ]
})

const handleAnchorPointsUpdated = (data) => {
  anchorPoints.value = data
  routeInfo.value = { distance: null, duration: null }
  recommendedPois.value = []
}

const handleCommuteTimeUpdated = (value) => {
  commuteTime.value = value
}

const handleRouteCalculated = (data) => {
  routeInfo.value = data
}

const handleIsochroneCalculated = (data) => {
  isochroneResult.value = data
}

const handlePoiResultsUpdated = (pois) => {
  recommendedPois.value = pois
}

const handlePoiSelected = (poi, index) => {
  mapViewerRef.value?.focusOnRecommendedPoi(poi, index)
}

const handleFallbackPoiClick = (poi) => {
  // For fallback POIs, show a message or search for them
  alert(`点击了 ${poi.name} (${poi.scene})。当前为示例地点，请在地图上设置两个起点后查看实际推荐结果。`)
}

const handleAiSuggestionsUpdated = (data) => {
  // Process AI suggestions and convert to POI format
  if (data.suggestions && Array.isArray(data.suggestions)) {
    const aiPois = data.suggestions.map((suggestion, index) => ({
      id: `ai-${index}`,
      name: suggestion.name,
      scene: suggestion.scene,
      type: suggestion.type,
      address: suggestion.reason,
      longitude: null, // AI doesn't provide coordinates, will need geocoding
      latitude: null,
    }))
    // Merge with existing recommended POIs or replace them
    recommendedPois.value = aiPois
  }
}

const handleMaxCommuteTimeUpdated = (maxValue) => {
  maxCommuteTime.value = maxValue
  // 如果当前通勤时间超过新的最大值，调整当前值
  if (commuteTime.value > maxValue) {
    commuteTime.value = maxValue
  }
}
</script>
