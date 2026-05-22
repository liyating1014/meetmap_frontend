const ensureClosedRing = (ring) => {
  if (ring.length === 0) {
    return ring
  }

  const first = ring[0]
  const last = ring[ring.length - 1]

  if (first[0] === last[0] && first[1] === last[1]) {
    return ring
  }

  return [...ring, first]
}

const toLngLatPair = (point) => {
  if (!point) {
    return null
  }

  if (Array.isArray(point) && point.length >= 2) {
    return [Number(point[0]), Number(point[1])]
  }

  if (typeof point.getLng === 'function' && typeof point.getLat === 'function') {
    return [Number(point.getLng()), Number(point.getLat())]
  }

  if (typeof point.lng !== 'undefined' && typeof point.lat !== 'undefined') {
    return [Number(point.lng), Number(point.lat)]
  }

  return null
}

import * as turf from '@turf/turf'

export const getTurf = () => {
  return turf
}

export const normalizeArrivalBounds = (bounds = []) => bounds
  .map((path) => path
    .map((point) => toLngLatPair(point))
    .filter(Boolean))
  .map((ring) => ensureClosedRing(ring))
  .filter((ring) => ring.length >= 4)

export const createArrivalFeature = (bounds, turfInstance = getTurf()) => {
  const normalizedBounds = normalizeArrivalBounds(bounds)

  if (!turfInstance || normalizedBounds.length === 0) {
    return null
  }

  return turfInstance.multiPolygon(normalizedBounds.map((ring) => [ring]))
}

export const getIntersectionFeature = (featureA, featureB, turfInstance = getTurf()) => {
  if (!turfInstance || !featureA || !featureB) {
    return null
  }

  return turfInstance.intersect(turfInstance.featureCollection([featureA, featureB]))
}

export const getFeatureAreaKm2 = (feature, turfInstance = getTurf()) => {
  if (!turfInstance || !feature) {
    return null
  }

  return turfInstance.area(feature) / 1000000
}

export const getFeatureCenter = (feature, turfInstance = getTurf()) => {
  if (!turfInstance || !feature) {
    return null
  }

  const centerFeature = turfInstance.centerOfMass(feature) ?? turfInstance.centroid(feature)

  if (!centerFeature?.geometry?.coordinates) {
    return null
  }

  const [longitude, latitude] = centerFeature.geometry.coordinates
  return { longitude, latitude }
}

export const getFeatureBBox = (feature, turfInstance = getTurf()) => {
  if (!turfInstance || !feature) {
    return null
  }

  return turfInstance.bbox(feature)
}

export const isPointInsideFeature = (longitude, latitude, feature, turfInstance = getTurf()) => {
  if (!turfInstance || !feature) {
    return false
  }

  const point = turfInstance.point([Number(longitude), Number(latitude)])
  return turfInstance.booleanPointInPolygon(point, feature)
}

export const featureToAmapPaths = (feature) => {
  if (!feature?.geometry) {
    return []
  }

  if (feature.geometry.type === 'Polygon') {
    return [
      feature.geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [lng, lat])),
    ]
  }

  if (feature.geometry.type === 'MultiPolygon') {
    return feature.geometry.coordinates.map((polygon) => polygon.map((ring) => ring.map(([lng, lat]) => [lng, lat])))
  }

  return []
}
