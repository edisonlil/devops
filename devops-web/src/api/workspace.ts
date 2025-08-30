import axios from 'axios'
import type { Workspace, WorkspaceSummary, WorkspaceDefaults } from '@/types/workspace'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API请求失败:', error)
    return Promise.reject(error)
  }
)

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
