import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './assets/css/base.css'
import loadingStore from "@/stores/loadingStore"

createApp(App)
  .use(router)
  .mount('#app')
