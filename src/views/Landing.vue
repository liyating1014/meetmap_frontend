<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
    <div class="container mx-auto px-4 py-16">
      <!-- Header -->
      <header class="text-center mb-16">
        <h1 class="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          MeetMap
        </h1>
        <p class="text-xl md:text-2xl text-slate-300 mb-2">等时圈最优见面点计算器</p>
        <p class="text-slate-400">面向校园学习、生活聚餐与生产协作的双起点等时圈见面决策</p>
      </header>

      <!-- Features -->
      <div class="grid md:grid-cols-3 gap-8 mb-16">
        <div class="glass-panel rounded-2xl p-6 text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">智能定位</h3>
          <p class="text-slate-400">输入两个起点，自动计算双方等时圈和交集区域</p>
        </div>

        <div class="glass-panel rounded-2xl p-6 text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">场景适配</h3>
          <p class="text-slate-400">支持校园、生活、生产三类见面场景推荐</p>
        </div>

        <div class="glass-panel rounded-2xl p-6 text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
            <svg class="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">AI 助手</h3>
          <p class="text-slate-400">基于 AI 的智能路线规划和地点推荐</p>
        </div>
      </div>

      <!-- How it works -->
      <div class="glass-panel rounded-2xl p-8 mb-16">
        <h2 class="text-2xl font-bold mb-6 text-center">如何使用</h2>
        <div class="grid md:grid-cols-4 gap-6">
          <div class="text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold">1</div>
            <h4 class="font-semibold mb-1">输入起点</h4>
            <p class="text-sm text-slate-400">填写两个起点位置</p>
          </div>
          <div class="text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold">2</div>
            <h4 class="font-semibold mb-1">设置时间</h4>
            <p class="text-sm text-slate-400">调整通勤时间阈值</p>
          </div>
          <div class="text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold">3</div>
            <h4 class="font-semibold mb-1">查看结果</h4>
            <p class="text-sm text-slate-400">查看等时圈和交集</p>
          </div>
          <div class="text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold">4</div>
            <h4 class="font-semibold mb-1">选择地点</h4>
            <p class="text-sm text-slate-400">点击推荐地点定位</p>
          </div>
        </div>
      </div>

      <!-- CTA Button -->
      <div class="text-center">
        <button
          @click="goToApp"
          class="px-8 py-4 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full text-lg font-semibold hover:from-blue-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg"
        >
          开始使用
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToApp = () => {
  router.push('/app')
}
</script>

<style scoped>
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}
</style>
