import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response
  },
  error => {
    const message = error.response?.data?.error || error.message || '请求失败'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default api

// WebSocket连接
export class WebSocketClient {
  constructor() {
    this.ws = null
    this.listeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectInterval = 3000
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}`
    
    this.ws = new WebSocket(wsUrl)
    
    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    }
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.emit(data.type, data)
      } catch (error) {
        console.error('WebSocket message parse error:', error)
      }
    }
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.reconnect()
    }
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      setTimeout(() => {
        this.connect()
      }, this.reconnectInterval)
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        callback(data)
      })
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

// 创建全局WebSocket实例
export const wsClient = new WebSocketClient()

// API方法
export const jobsApi = {
  // 获取工作空间的所有作业
  getWorkspaceJobs: (workspaceId) => api.get(`/jobs/workspace/${workspaceId}`),

  // 获取单个作业详情
  getJob: (jobId) => api.get(`/jobs/${jobId}`),

  // 创建新作业
  createJob: (jobData) => api.post('/jobs', jobData),

  // 更新作业
  updateJob: (jobId, jobData) => api.put(`/jobs/${jobId}`, jobData),

  // 删除作业
  deleteJob: (jobId) => api.delete(`/jobs/${jobId}`),

  // 重新部署作业
  redeployJob: (jobId) => api.post(`/jobs/${jobId}/redeploy`),

  // 获取作业日志
  getJobLogs: (jobId) => api.get(`/jobs/${jobId}/logs`),

  // 获取部署历史
  getJobHistory: (jobId) => api.get(`/jobs/${jobId}/history`)
}

export const templatesApi = {
  // 获取所有模板
  getTemplates: (params = {}) => api.get('/templates', { params }),

  // 获取单个模板详情
  getTemplate: (templateId) => api.get(`/templates/${templateId}`),

  // 创建新模板
  createTemplate: (templateData) => api.post('/templates', templateData),

  // 更新模板
  updateTemplate: (templateId, templateData) => api.put(`/templates/${templateId}`, templateData),

  // 删除模板
  deleteTemplate: (templateId) => api.delete(`/templates/${templateId}`),

  // 获取模板分类
  getCategories: () => api.get('/templates/categories'),

  // 生成 Dockerfile
  generateDockerfile: (templateId, data) => api.post(`/templates/${templateId}/dockerfile`, data)
}
