import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// 导入 Naive UI
import naive from 'naive-ui'

// 导入全局样式
import './styles/main.css'

// 导入会话诊断工具（开发环境）
import './utils/sessionDiagnostic'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(naive)

app.mount('#app')
