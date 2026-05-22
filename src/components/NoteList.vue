<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4 text-gray-800">AI Travel Note</h1>
    
    <!-- 输入区域 -->
    <div class="mb-6">
      <textarea
        v-model="inputText"
        placeholder="粘贴你的旅游攻略文本..."
        class="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
      ></textarea>
      <button
        @click="handleParse"
        :disabled="loading"
        class="mt-2 w-full bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {{ loading ? '解析中...' : 'AI 解析生成路线' }}
      </button>
    </div>

    <!-- 标题显示 -->
    <div v-if="parsedTitle" class="mb-4">
      <h2 class="text-xl font-semibold text-gray-700">{{ parsedTitle }}</h2>
    </div>

    <!-- 信息卡片瀑布流 -->
    <div class="space-y-4">
      <div
        v-for="(location, index) in parsedLocations"
        :key="index"
        class="bg-white rounded-lg shadow-md p-4 border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer"
        @click="handleLocationClick(location)"
      >
        <div class="flex items-center mb-2">
          <span class="bg-pink-500 text-white text-xs px-2 py-1 rounded-full mr-2">
            {{ index + 1 }}
          </span>
          <span class="bg-pink-100 text-pink-600 text-xs px-2 py-1 rounded-full mr-2">
            第 {{ location.day }} 天
          </span>
          <h3 class="font-semibold text-gray-800">{{ location.name }}</h3>
        </div>
        <p class="text-gray-600 text-sm">{{ location.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const emit = defineEmits(['locations-updated'])

const inputText = ref('')
const parsedLocations = ref([])
const parsedTitle = ref('')
const loading = ref(false)

const handleParse = async () => {
  if (!inputText.value.trim()) {
    alert('请输入旅游攻略文本')
    return
  }

  loading.value = true
  try {
    const apiBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    const response = await axios.post(`${apiBaseURL}/api/parse_note`, {
      original_text: inputText.value
    })
    parsedLocations.value = response.data.locations
    parsedTitle.value = response.data.title
    // 通知父组件更新地图
    emit('locations-updated', response.data.locations)
  } catch (error) {
    console.error('解析失败:', error)
    alert('解析失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleLocationClick = (location) => {
  // 可以在这里添加点击卡片后地图定位到该地点的逻辑
  console.log('点击地点:', location.name)
}
</script>
