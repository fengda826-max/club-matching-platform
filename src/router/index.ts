import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/Index.vue'),
      meta: {
        title: '社团招新智能匹配平台',
      },
    },
    {
      path: '/clubs',
      name: 'clubs',
      component: () => import('@/pages/Clubs.vue'),
      meta: {
        title: '社团列表',
      },
    },
    {
      path: '/matching',
      name: 'matching',
      component: () => import('@/pages/Matching.vue'),
      meta: {
        title: '智能匹配',
      },
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/pages/Chat.vue'),
      meta: {
        title: 'AI问答',
      },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/pages/Admin.vue'),
      meta: {
        title: '管理后台',
      },
    },
  ],
})

router.beforeEach((to) => {
  document.title = `${to.meta.title || '社团招新智能匹配平台'} - 社团招新智能匹配平台`
})

export default router
