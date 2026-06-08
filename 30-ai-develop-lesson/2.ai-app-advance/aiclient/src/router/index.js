import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

// 定义路由配置
const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home  // 根路径对应Home组件
    },

]

// 创建路由实例
const router = createRouter({
    history: createWebHistory(), // 使用HTML5历史模式
    routes // 路由配置
})

export default router