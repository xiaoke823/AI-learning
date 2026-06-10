import { createApp } from 'vue'
import App from './App.vue'
import "highlight.js/styles/github.css"
import router from './router/index.js'
createApp(App).use(router).mount('#app')
