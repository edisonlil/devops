import request from './request'

// 应用实例接口
export interface ApplicationInstance {
  name: string
  workspace: string
  platform: 'KUBERNETES' | 'DOCKER_COMPOSE' | 'DOCKER_SWARM'
  status: 'running' | 'stopped' | 'error' | 'pending' | 'unknown'
  replicas?: {
    desired: number
    ready: number
    available: number
  }
  image?: string
  version?: string
  ports?: Array<{
    name?: string
    port: number
    targetPort?: number
    nodePort?: number
    protocol?: 'TCP' | 'UDP'
  }>
  environment?: Record<string, string>
  resources?: {
    cpu?: string
    memory?: string
    limits?: {
      cpu?: string
      memory?: string
    }
  }
  platformSpecific?: {
    namespace?: string
    stackName?: string
    composeProject?: string
  }
  createdAt?: string
  updatedAt?: string
  deploymentFile: string
}

// 应用列表响应
export interface ApplicationListResponse {
  workspace: string
  platform: string
  applications: ApplicationInstance[]
  total: number
}

// 操作参数
export interface OperationParams {
  replicas?: number
  lines?: number
  follow?: boolean
}

// 应用管理API
export const applicationApi = {
  // 获取工作空间的应用列表
  getApplications: (workspace: string) => {
    return request.get<ApplicationListResponse>(`/workspaces/${workspace}/applications`)
  },

  // 获取单个应用详情
  getApplication: (workspace: string, appName: string) => {
    return request.get<ApplicationInstance>(`/workspaces/${workspace}/applications/${appName}`)
  },

  // 执行应用操作
  executeAction: (workspace: string, appName: string, action: string, params?: OperationParams) => {
    return request.post<{ success: boolean; message: string }>(`/workspaces/${workspace}/applications/${appName}/actions`, {
      action,
      params
    })
  },

  // 获取应用日志
  getApplicationLogs: (workspace: string, appName: string, lines?: number, follow?: boolean, container?: string) => {
    const params = new URLSearchParams()
    if (lines) params.append('lines', lines.toString())
    if (follow) params.append('follow', follow.toString())
    if (container) params.append('container', container)

    return request.get<{
      success: boolean;
      data?: {
        workspace: string;
        appName: string;
        logs: string;
        lines: number
      };
      logs?: string;
      lines?: number;
      error?: string;
    }>(`/workspaces/${workspace}/applications/${appName}/logs?${params}`)
  },

  // 获取应用配置文件
  getApplicationConfig: (workspace: string, appName: string) => {
    return request.get<{ success: boolean; data: { content: string; filePath: string } }>(`/workspaces/${workspace}/applications/${appName}/config`)
  },

  // 保存应用配置文件
  saveApplicationConfig: (workspace: string, appName: string, content: string, autoRedeploy?: boolean) => {
    return request.put<{ success: boolean; data: { saved: boolean; redeployed?: boolean } }>(`/workspaces/${workspace}/applications/${appName}/config`, {
      content,
      autoRedeploy
    })
  },

  // 刷新应用状态
  refreshStatus: (workspace: string, appName: string) => {
    return request.post<Partial<ApplicationInstance>>(`/workspaces/${workspace}/applications/${appName}/refresh`)
  },

  // 获取支持的平台列表
  getSupportedPlatforms: () => {
    return request.get<{ platforms: string[]; total: number }>('/workspaces/applications/platforms')
  },

  // 测试连接
  testConnection: () => {
    return request.get<{ success: boolean; message: string; timestamp: string }>('/workspaces/applications/test')
  }
}
