import { createApp } from 'vue'
import App from './App.vue'
import "highlight.js/styles/github.css"
import router from './router'
createApp(App).use(router).mount('#app')
