<template>
  <section class="glass-panel rounded-[28px] p-5 text-slate-800 md:p-6">
    <div class="flex flex-col gap-5">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          MeetMap
        </p>
        <h2 class="mt-2 text-2xl font-semibold text-slate-900">
          等时圈最优见面点计算器
        </h2>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          输入两个起点，设定通勤时间阈值，地图将计算双方到达圈、交集区域，并为校园、生活、生产场景预留 POI 推荐空间。
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <span
          v-for="scene in scenes"
          :key="scene"
          class="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80"
        >
          {{ scene }}
        </span>
      </div>

      <div class="space-y-4">
        <label class="block">
          <span class="mb-2 block text-sm font-medium text-slate-700">起点 A</span>
          <input
            v-model.trim="startPoint"
            type="text"
            placeholder="例如：教学楼 A 座 / 宿舍区东门"
            class="w-full rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5"
          />
        </label>

        <label class="block">
          <span class="mb-2 block text-sm font-medium text-slate-700">起点 B</span>
          <input
            v-model.trim="endPoint"
            type="text"
            placeholder="例如：实验中心 / 地铁站 / 园区入口"
            class="w-full rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5"
          />
        </label>
      </div>

      <div class="rounded-3xl bg-white/72 p-4 ring-1 ring-white/70">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-700">通勤时间</p>
            <p class="mt-1 text-xs text-slate-500">根据两地实际通勤时间动态调整范围</p>
          </div>
          <div class="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
            {{ localCommuteTime }} min
          </div>
        </div>

        <input
          v-model="localCommuteTime"
          class="range-slider mt-4 w-full"
          type="range"
          min="10"
          :max="maxCommuteTime"
          step="5"
        />

        <div class="mt-2 flex justify-between text-xs text-slate-400">
          <span v-for="mark in sliderMarks" :key="mark">{{ mark }}</span>
        </div>
      </div>

      <div class="rounded-3xl bg-slate-900 px-4 py-3 text-sm text-slate-100 shadow-lg shadow-slate-900/15">
        <p class="font-medium">当前主题</p>
        <p class="mt-1 text-slate-300">
          同一张地图同时服务校园学习、生活聚餐和生产协作三类会面场景。
        </p>
      </div>

      <div class="rounded-3xl bg-white/72 p-4 ring-1 ring-white/70">
        <p class="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
          Map Reference
        </p>
        <div class="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
          <div>
            <p class="text-xs text-slate-400">路线距离</p>
            <p class="mt-1 font-semibold text-slate-900">{{ distanceLabel }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-400">路线时长</p>
            <p class="mt-1 font-semibold text-slate-900">{{ durationLabel }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import axios from 'axios'

const emit = defineEmits(['anchor-points-updated', 'commute-time-updated', 'ai-suggestions-updated'])

const props = defineProps({
  commuteTime: {
    type: Number,
    default: 30,
  },
  maxCommuteTime: {
    type: Number,
    default: 60,
  },
  routeInfo: {
    type: Object,
    default: () => ({ distance: null, duration: null }),
  },
})

const scenes = ['校园', '生活', '生产']
const startPoint = ref('')
const endPoint = ref('')
const localCommuteTime = ref(props.commuteTime)
const loadingAi = ref(false)

const distanceLabel = computed(() => {
  if (!props.routeInfo.distance) {
    return '待计算'
  }

  return `${props.routeInfo.distance} km`
})

const durationLabel = computed(() => {
  if (!props.routeInfo.duration) {
    return '待计算'
  }

  return `${props.routeInfo.duration} 分钟`
})

// 动态生成滑块刻度
const sliderMarks = computed(() => {
  const max = props.maxCommuteTime
  const steps = 5 // 5等分
  const marks = []
  for (let i = 0; i <= steps; i++) {
    const value = Math.round((max / steps) * i)
    marks.push(value)
  }
  return marks
})

watch([startPoint, endPoint], () => {
  emit('anchor-points-updated', {
    start: startPoint.value,
    end: endPoint.value,
  })
}, { immediate: true })

watch(localCommuteTime, (value) => {
  emit('commute-time-updated', Number(value))
}, { immediate: true })

watch(() => props.commuteTime, (value) => {
  localCommuteTime.value = value
})

const fetchAiSuggestions = async () => {
  // 彻底拔掉前置拦截：只要用户填了字就必须发请求，不管高德是否崩溃
  if (!startPoint.value && !endPoint.value) {
    return
  }

  loadingAi.value = true
  try {
    const apiBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    
    // 包装纯地名文本，即使坐标为 null 也传过去，触发后端二级高德 Web 编码
    const payload = {
      start_point: {
        name: startPoint.value || "起点A",
        lng: null,
        lat: null
      },
      end_point: {
        name: endPoint.value || "起点B",
        lng: null,
        lat: null
      },
      commute_time: localCommuteTime.value || 60
    }
    
    const response = await axios.post(`${apiBaseURL}/api/route-planning`, payload)
    
    // 安全提取响应数据，处理嵌套结构
    const responseData = response.data?.data || response.data
    
    // 提取后端返回的坐标数据
    const backendStartPoint = responseData.start_point
    const backendEndPoint = responseData.end_point
    
    console.log("structured start_point =", backendStartPoint)
    console.log("structured end_point =", backendEndPoint)
    
    // 如果后端返回了有效的坐标，转换成高德坐标格式并触发等时圈计算
    if (
      backendStartPoint?.lng &&
      backendStartPoint?.lat &&
      backendEndPoint?.lng &&
      backendEndPoint?.lat
    ) {
      const startAnchor = [Number(backendStartPoint.lng), Number(backendStartPoint.lat)]
      const endAnchor = [Number(backendEndPoint.lng), Number(backendEndPoint.lat)]
      
      console.log("startAnchor =", startAnchor)
      console.log("endAnchor =", endAnchor)
      
      // 触发等时圈计算事件，传递坐标给父组件（使用对象结构）
      emit('anchor-points-updated', {
        startAnchor,
        endAnchor,
        startPoint: backendStartPoint,
        endPoint: backendEndPoint
      })
    }
    
    emit('ai-suggestions-updated', responseData)
  } catch (error) {
    console.error('AI 路线规划失败:', error)
    
    // 尝试从错误响应中提取数据（后端可能返回 200 但 status: fail）
    let responseData = null
    if (error.response && error.response.data) {
      responseData = error.response.data?.data || error.response.data
    }
    
    // 如果响应中包含 meeting_region 或 recommended_pois，仍然尝试更新 UI
    if (responseData && (responseData.meeting_region || responseData.recommended_pois)) {
      emit('ai-suggestions-updated', responseData)
      return
    }
    
    // 详细的错误处理
    if (error.response) {
      // 服务器返回了错误状态码
      if (error.response.status === 500) {
        alert('后端 AI 接口响应失败，请检查服务器状态')
      } else if (error.response.status === 404) {
        alert('AI 接口不存在，请检查后端配置')
      } else {
        alert(`AI 接口请求失败: ${error.response.status}`)
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      alert('无法连接到后端服务器，请检查网络连接')
    } else {
      // 其他错误
      alert('AI 路线规划失败，请稍后重试')
    }
  } finally {
    loadingAi.value = false
  }
}

// 防抖函数
let debounceTimer = null
const debouncedFetchAiSuggestions = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    fetchAiSuggestions()
  }, 800)
}

// 监听锚点变化，触发 AI 建议（使用防抖）
watch([startPoint, endPoint], ([newStart, newEnd]) => {
  if (newStart && newEnd) {
    debouncedFetchAiSuggestions()
  }
})
</script>
