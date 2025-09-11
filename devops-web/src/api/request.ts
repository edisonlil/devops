import axios from 'axios'
import config from '@/config'
import CookieManager from '@/utils/cookie'

const request = axios.create({
  baseURL: config.apiBaseURL,
  timeout: 30000,
  withCredentials: true, // 支持携带cookies和session
  headers: {
    'Content-Type': 'application/json',
    // 在容器环境下确保正确的 Origin 头
    ...(config.isProduction && {
      'X-Requested-With': 'XMLHttpRequest'
    })
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 确保携带 DevOps 专用的认证信息
    const sessionId = CookieManager.getSessionId()
    const authToken = CookieManager.getAuthToken()

    if (sessionId) {
      config.headers['X-DevOps-Session-ID'] = sessionId
    }

    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`
    }

    // 调试信息：记录请求详情
    console.log('API Request:', {
      url: config.url,
      baseURL: config.baseURL,
      method: config.method,
      withCredentials: config.withCredentials,
      headers: config.headers,
      sessionId: sessionId ? '***' : 'none',
      authToken: authToken ? '***' : 'none'
    })

    return config
  },
  (error) => {
    console.error('Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 调试信息：记录成功响应
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      headers: response.headers,
      data: response.data
    })
    return response
  },
  (error) => {
    // 调试信息：记录错误响应
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data
    })

    if (error.response?.status === 401) {
      console.warn('会话失效，跳转到登录页')
      // 清除本地会话信息
      localStorage.removeItem('ssh_session')
      // 清除 DevOps Cookie（不影响其他系统）
      CookieManager.clearDevOpsCookies()
      // 会话过期，跳转到登录页
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default request