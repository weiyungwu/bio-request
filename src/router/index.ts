import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { isCourseOpen } from '@/utils/stages'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/map',
    name: 'map',
    component: () => import('../views/MapView.vue'),
  },
  {
    path: '/lesson/:courseId',
    name: 'lesson',
    component: () => import('../views/LessonView.vue'),
    // 未開放關卡不可進入, also via a typed URL.
    beforeEnter: (to) => (isCourseOpen(String(to.params.courseId)) ? true : { name: 'map' }),
  },
  // Dev-only style guide; tree-shaken out of production builds.
  ...(import.meta.env.DEV
    ? [
        {
          path: '/design-system',
          name: 'design-system',
          component: () => import('../views/DesignSystemView.vue'),
        },
      ]
    : []),
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
