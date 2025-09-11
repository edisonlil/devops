import axios from 'axios'
import appConfig from '@/config'
import TokenManager from '@/utils/tokenManager'
import CookieManager from '@/utils/cookie'
import type { Workspace, WorkspaceSummary, WorkspaceDefaults } from '@/types/workspace'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  // Token 模式下禁用 Cookie，Cookie 模式下启用
  withCredentials: appConfig.auth.mode === 'cookie'
})

// 远程工作空间相关类型定义
export interface RemoteWorkspacesResponse {
  workspaces: string[]
}

export interface WorkspaceEnableResponse {
  exists: boolean
  workspace?: string
  content?: string
}

export interface CreateEnableRequest {
  workspace: string
}

// 请求拦截器 - 添加认证头
api.interceptors.request.use(
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
      console.log('🔑 Workspace API Request (Token Header):', {
        url: config.url,
        method: config.method,
        hasToken: !!TokenManager.getToken(),
        hasSessionId: !!TokenManager.getSessionId()
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
      console.log('Workspace API Request (Cookie):', {
        url: config.url,
        method: config.method,
        sessionId: sessionId ? '***' : 'none',
        authToken: authToken ? '***' : 'none'
      })
    }

    return config
  },
  (error) => {
    console.error('Workspace API Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 调试信息：记录成功响应
    console.log('Workspace API Response:', {
      url: response.config.url,
      status: response.status,
      headers: response.headers,
      data: response.data
    })
    return response.data
  },
  (error) => {
    // 调试信息：记录错误响应
    console.error('Workspace API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })

    if (error.response?.status === 401) {
      console.warn('Workspace API 认证失效，跳转到登录页')

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

    console.error('API请求失败:', error)
    return Promise.reject(error)
  }
)

// 远程工作空间API
export const getRemoteWorkspaces = (): Promise<{ data: RemoteWorkspacesResponse }> => {
  return api.get('/remote/workspaces')
}

export const getWorkspaceEnable = (): Promise<{ data: WorkspaceEnableResponse }> => {
  return api.get('/remote/workspace/enable')
}

export const createEnableFile = (data: CreateEnableRequest): Promise<{ success: boolean }> => {
  return api.post('/remote/workspace/enable', data)
}

export const getRemoteWorkspaceConfig = (name: string): Promise<any> => {
  return api.get(`/remote/workspace/${name}/config`)
}

export const updateRemoteWorkspaceConfig = (name: string, config: any): Promise<{ success: boolean; message: string }> => {
  return api.put(`/remote/workspace/${name}/config`, config)
}

export const workspaceApi = {
  // 获取工作空间列表
  getWorkspaces: () => {
    return api.get<{ workspaces: Workspace[] }>('/workspaces')
  },

  // 获取工作空间概览信息
  getWorkspaceSummary: (workspace: string) => {
    return api.get<WorkspaceSummary>(`/workspaces/${workspace}/summary`)
  },

  // 创建工作空间
  createWorkspace: (data: Partial<Workspace>) => {
    return api.post<Workspace>('/workspaces', data)
  },

  // 获取工作空间默认配置
  getDefaults: (workspace: string) => {
    return api.get<WorkspaceDefaults>(`/workspaces/${workspace}/defaults`)
  },

  // 更新工作空间配置
  updateWorkspace: (workspace: string, data: Partial<Workspace>) => {
    return api.put<Workspace>(`/workspaces/${workspace}`, data)
  },

  // 删除工作空间
  deleteWorkspace: (workspace: string) => {
    return api.delete(`/workspaces/${workspace}`)
  }
}
