import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
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

export interface RemoteServer {
  id: string
  name: string
  host: string
  port: number
  username: string
  authType: 'password' | 'key'
  description?: string
  tags: string[]
  status: 'connected' | 'disconnected' | 'error'
  lastConnected?: string
  createdAt: string
  updatedAt: string
}

export interface CommandExecution {
  id: string
  serverId: string
  workspace: string
  command: string
  args: string[]
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: string
  endTime?: string
  exitCode?: number
}

export interface ApplicationDeployment {
  id: string
  name: string
  type: 'java' | 'vue' | 'go' | 'nginx' | 'tomcat' | 'python'
  workspace: string
  serverId: string
  gitUrl?: string
  svnUrl?: string
  status: 'deploying' | 'running' | 'stopped' | 'failed'
  createdAt: string
  updatedAt: string
}

export const deployApi = {
  // 远程服务器管理
  getRemoteServers: () => {
    return api.get<{ servers: RemoteServer[] }>('/deploy/servers')
  },

  addRemoteServer: (serverData: Partial<RemoteServer>) => {
    return api.post<RemoteServer>('/deploy/servers', serverData)
  },

  updateRemoteServer: (serverId: string, serverData: Partial<RemoteServer>) => {
    return api.put<RemoteServer>(`/deploy/servers/${serverId}`, serverData)
  },

  deleteRemoteServer: (serverId: string) => {
    return api.delete(`/deploy/servers/${serverId}`)
  },

  testConnection: (serverId: string) => {
    return api.post(`/deploy/servers/${serverId}/test`)
  },

  // 远程命令执行
  executeDevopsCommand: (workspace: string, commandData: {
    serverId?: string
    command: string
    args?: string[]
    workingDir?: string
    timeout?: number
  }) => {
    return api.post<{ executionId: string; status: string; message: string }>(`/workspaces/${workspace}/deploy/execute`, commandData)
  },

  // 执行历史
  getExecutionHistory: (workspace: string, params?: {
    page?: number
    size?: number
    status?: string
    serverId?: string
  }) => {
    return api.get(`/workspaces/${workspace}/deploy/executions`, { params })
  },

  getExecutionDetails: (workspace: string, executionId: string) => {
    return api.get<CommandExecution & { duration?: number }>(`/workspaces/${workspace}/deploy/executions/${executionId}`)
  },

  // 获取Git仓库分支列表
  getGitBranches: (workspace: string, gitUrl: string) => {
    return api.post<{ branches: string[] }>(`/workspaces/${workspace}/deploy/git-branches`, { gitUrl })
  },

  getExecutionLogs: (workspace: string, executionId: string) => {
    return api.get<{ logs?: string[]; stdout?: string; stderr?: string }>(`/workspaces/${workspace}/deploy/executions/${executionId}/logs`)
  },

  cancelExecution: (workspace: string, executionId: string) => {
    return api.post(`/workspaces/${workspace}/deploy/executions/${executionId}/cancel`)
  },

  // DevOps 状态
  getDevopsStatus: (serverId: string) => {
    return api.get(`/deploy/servers/${serverId}/devops-status`)
  },

  // 应用部署
  deployApplication: (workspace: string, deployConfig: any) => {
    return api.post<ApplicationDeployment>(`/workspaces/${workspace}/deploy/applications`, deployConfig)
  },

  getApplications: (workspace: string, serverId?: string) => {
    return api.get<{ applications: ApplicationDeployment[] }>(`/workspaces/${workspace}/deploy/applications`, {
      params: { serverId }
    })
  },

  getApplicationDetails: (workspace: string, appName: string, serverId?: string) => {
    return api.get(`/workspaces/${workspace}/deploy/applications/${appName}`, {
      params: { serverId }
    })
  },

  startApplication: (workspace: string, appName: string, serverId: string) => {
    return api.post(`/workspaces/${workspace}/deploy/applications/${appName}/start`, { serverId })
  },

  stopApplication: (workspace: string, appName: string, serverId: string) => {
    return api.post(`/workspaces/${workspace}/deploy/applications/${appName}/stop`, { serverId })
  },

  restartApplication: (workspace: string, appName: string, serverId: string) => {
    return api.post(`/workspaces/${workspace}/deploy/applications/${appName}/restart`, { serverId })
  },

  deleteApplication: (workspace: string, appName: string, serverId: string) => {
    return api.delete(`/workspaces/${workspace}/deploy/applications/${appName}`, {
      data: { serverId }
    })
  },

  // 远程资源查询
  getRemoteWorkspaces: (serverId: string) => {
    return api.get<{ workspaces: string[] }>('/workspaces/deploy/resources/workspaces', {
      params: { serverId }
    })
  },

  getRemoteTemplates: (serverId: string, type?: string) => {
    return api.get('/workspaces/deploy/resources/templates', {
      params: { serverId, type }
    })
  },

  getRemoteDeployments: (serverId: string, workspace?: string) => {
    return api.get('/workspaces/deploy/resources/deployments', {
      params: { serverId, workspace }
    })
  },

  getSystemInfo: (serverId: string) => {
    return api.get('/workspaces/deploy/resources/system-info', {
      params: { serverId }
    })
  },

  // 模板预览
  previewTemplate: (workspace: string, templateName: string, config: any) => {
    return api.post<{ files: Record<string, string> }>(`/workspaces/${workspace}/deploy/template-preview`, {
      templateName,
      config
    })
  }
}