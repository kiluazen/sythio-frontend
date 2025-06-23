import { createRouter, createWebHistory } from 'vue-router'
import JarvisAssistView from '../views/JarvisAssistView.vue'
import ChatView from '../views/ChatView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: JarvisAssistView,
    },
    {
      path: '/jarvis',
      name: 'jarvis',
      component: JarvisAssistView,
    },
    {
      path: '/chat/:chatId',
      name: 'chat',
      component: ChatView,
    }
  ],
})

export default router
