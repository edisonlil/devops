import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true // 支持携带cookies和session
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token或其他请求头
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // 会话过期，跳转到登录页
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default request