import { createRouter, createWebHistory, type RouteRecordRaw, type RouterHistory } from 'vue-router'
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
  },
  {
    path: '/quiz/:courseId',
    name: 'quiz',
    component: () => import('../views/QuizView.vue'),
  },
  {
    path: '/review',
    name: 'review',
    component: () => import('../views/ReviewView.vue'),
  },
  {
    path: '/mastery',
    name: 'mastery',
    component: () => import('../views/MasteryView.vue'),
  },
  {
    path: '/result/:courseId',
    name: 'result',
    component: () => import('../views/ResultView.vue'),
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
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export function createAppRouter(history: RouterHistory) {
  const router = createRouter({ history, routes })
  // 未開放關卡不可進入. A global guard also runs on typed URLs and on
  // param-only changes (/lesson/bio-01 -> /lesson/bio-02), which skip beforeEnter.
  router.beforeEach((to) =>
    ['lesson', 'quiz', 'result'].includes(String(to.name)) &&
    !isCourseOpen(String(to.params.courseId))
      ? { name: 'map' }
      : true,
  )
  return router
}

const router = createAppRouter(createWebHistory(import.meta.env.BASE_URL))

export default router
