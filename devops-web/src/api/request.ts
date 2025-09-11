import axios from 'axios'
import appConfig from '@/config'
import CookieManager from '@/utils/cookie'
import TokenManager from '@/utils/tokenManager'

const request = axios.create({
  baseURL: appConfig.apiBaseURL,
  timeout: 30000,
  // Token 模式下禁用 Cookie，Cookie 模式下启用
  withCredentials: appConfig.auth.mode === 'cookie',
  headers: {
    'Content-Type': 'application/json',
    // 在容器环境下确保正确的 Origin 头
    ...(appConfig.isProduction && {
      'X-Requested-With': 'XMLHttpRequest'
    })
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 根据配置选择认证方式
    if (appConfig.auth.mode === 'token') {
      // Token 认证方式 - 仅使用 HTTP Header，不使用 Cookie
      const authHeaders = TokenManager.getAuthHeaders()
      Object.assign(config.headers, authHeaders)

      // 确保 Token 模式下不发送 Cookie
      if (appConfig.auth.security?.disableCookies) {
        config.withCredentials = false
      }

      // 调试信息
      console.log('🔑 API Request (Token Header):', {
        url: config.url,
        method: config.method,
        hasToken: !!TokenManager.getToken(),
        hasSessionId: !!TokenManager.getSessionId(),
        withCredentials: config.withCredentials
      })
    } else {
      // Cookie 认证方式（兼容模式）
      const sessionId = CookieManager.getSessionId()
      const authToken = CookieManager.getAuthToken()

      if (sessionId) {
        config.headers['X-DevOps-Session-ID'] = sessionId
      }

      if (authToken) {
        config.headers['Authorization'] = `Bearer ${authToken}`
      }

      // 调试信息
      console.log('API Request (Cookie):', {
        url: config.url,
        method: config.method,
        sessionId: sessionId ? '***' : 'none',
        authToken: authToken ? '***' : 'none'
      })
    }

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
      console.warn('认证失效，跳转到登录页')

      // 根据认证方式清除相应的认证信息
      if (appConfig.auth.mode === 'token') {
        TokenManager.clearToken()
      } else {
        CookieManager.clearDevOpsCookies()
      }

      // 清除本地会话信息
      localStorage.removeItem('ssh_session')

      // 跳转到登录页
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default request