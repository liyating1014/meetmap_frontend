import { createRouter, createWebHistory } from 'vue-router'
import Landing from '../views/Landing.vue'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: Landing
  },
  {
    path: '/app',
    name: 'MapApp',
    component: () => import('../views/MapApp.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
