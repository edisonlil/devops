import axios from 'axios'
import appConfig from '@/config'
import TokenManager from '@/utils/tokenManager'
import CookieManager from '@/utils/cookie'
import type {
  MiddlewareTemplate,
  TemplateFormDefinition,
  MiddlewareInstance,
  DeploymentConfig,
  DeploymentJob,
  CostEstimation
} from '@/types/middleware'
import type { TemplateFile, TemplateFilesResponse, TemplateFileContentResponse } from './template'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  // Token 模式下禁用 Cookie，Cookie 模式下启用
  withCredentials: appConfig.auth.mode === 'cookie'
})

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
      console.log('🔑 Middleware API Request (Token Header):', {
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
      console.log('Middleware API Request (Cookie):', {
        url: config.url,
        method: config.method,
        sessionId: sessionId ? '***' : 'none',
        authToken: authToken ? '***' : 'none'
      })
    }

    return config
  },
  (error) => {
    console.error('Middleware API Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 调试信息：记录成功响应
    console.log('Middleware API Response:', {
      url: response.config.url,
      status: response.status,
      headers: response.headers,
      data: response.data
    })
    return response.data
  },
  (error) => {
    // 调试信息：记录错误响应
    console.error('Middleware API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })

    if (error.response?.status === 401) {
      console.warn('Middleware API 认证失效，跳转到登录页')

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

    console.error('中间件API请求失败:', error)
    return Promise.reject(error)
  }
)

export const middlewareApi = {
  // 获取模板列表
  getTemplates: (workspace: string) => {
    return api.get<{
      workspace: string
      templates: {
        global: MiddlewareTemplate[]
        workspace: MiddlewareTemplate[]
      }
      defaults: Record<string, any>
      categories: string[]
      platforms: string[]
    }>(`/workspaces/${workspace}/middleware/templates`)
  },

  // 获取模板详情
  getTemplate: (workspace: string, templateName: string) => {
    return api.get<MiddlewareTemplate>(`/workspaces/${workspace}/middleware/templates/${templateName}`)
  },

  // 获取模板表单定义
  getTemplateForm: (workspace: string, templateName: string) => {
    return api.get<{ form: TemplateFormDefinition }>(`/workspaces/${workspace}/middleware/templates/${templateName}/form`)
  },

  // 验证配置参数
  validateConfig: (workspace: string, config: Record<string, any>) => {
    return api.post<{
      valid: boolean
      errors: Record<string, string[]>
      warnings: Record<string, string[]>
    }>(`/workspaces/${workspace}/middleware/validate`, config)
  },

  // 预览生成的配置
  previewConfig: (workspace: string, config: DeploymentConfig) => {
    return api.post<{
      yaml: string
      cli_command: string
      connection_info: {
        internal: string
        external?: string
      }
    }>(`/workspaces/${workspace}/middleware/preview`, config)
  },

  // 预估部署成本
  estimateCost: (workspace: string, config: Record<string, any>) => {
    return api.post<CostEstimation>(`/workspaces/${workspace}/middleware/estimate-cost`, config)
  },

  // 执行部署
  deploy: (workspace: string, config: DeploymentConfig) => {
    return api.post<{ deploymentId: string }>(`/workspaces/${workspace}/middleware/deploy`, config)
  },

  // 获取部署状态
  getDeploymentStatus: (workspace: string, deploymentId: string) => {
    return api.get<DeploymentJob>(`/workspaces/${workspace}/middleware/deploy/${deploymentId}/status`)
  },

  // 获取部署日志
  getDeploymentLogs: (workspace: string, deploymentId: string) => {
    return api.get<{ logs: string[] }>(`/workspaces/${workspace}/middleware/deploy/${deploymentId}/logs`)
  },

  // 获取实例列表
  getInstances: (workspace: string) => {
    return api.get<{ instances: MiddlewareInstance[] }>(`/workspaces/${workspace}/middleware/instances`)
  },

  // 获取实例详情
  getInstance: (workspace: string, instanceName: string) => {
    return api.get<MiddlewareInstance>(`/workspaces/${workspace}/middleware/instances/${instanceName}`)
  },

  // 删除实例
  deleteInstance: (workspace: string, instanceName: string) => {
    return api.delete(`/workspaces/${workspace}/middleware/instances/${instanceName}`)
  },

  // 扩缩容实例
  scaleInstance: (workspace: string, instanceName: string, replicas: number) => {
    return api.post(`/workspaces/${workspace}/middleware/instances/${instanceName}/scale`, { replicas })
  },

  // 检查端口占用情况
  checkPortAvailability: (workspace: string, ports: number[]) => {
    return api.post<Array<{
      serverId: string;
      serverName: string;
      serverHost: string;
      connected: boolean;
      ports: Array<{
        port: number;
        isAvailable: boolean;
        message: string;
        processInfo?: {
          pid?: string;
          name?: string;
          user?: string;
        };
        timestamp: string;
      }>;
      error?: string;
    }>>(`/workspaces/${workspace}/middleware/check-ports`, { ports })
  },

  // 重启实例
  restartInstance: (workspace: string, instanceName: string) => {
    return api.post(`/workspaces/${workspace}/middleware/instances/${instanceName}/restart`)
  },

  // 获取实例日志
  getInstanceLogs: (workspace: string, instanceName: string, lines?: number) => {
    return api.get<{ logs: string[] }>(`/workspaces/${workspace}/middleware/instances/${instanceName}/logs`, {
      params: { lines }
    })
  },

  // 获取工作空间模板文件列表
  getTemplateFiles: (workspace: string, templateName: string) => {
    return api.get<TemplateFilesResponse>(`/workspaces/${workspace}/middleware/templates/${templateName}/files`)
  },

  // 获取工作空间模板文件内容
  getTemplateFileContent: (workspace: string, templateName: string, fileName: string) => {
    return api.get<TemplateFileContentResponse>(`/workspaces/${workspace}/middleware/templates/${templateName}/files/${fileName}`)
  },

  // 更新工作空间模板文件内容
  updateTemplateFileContent: (workspace: string, templateName: string, fileName: string, content: string) => {
    return api.put(`/workspaces/${workspace}/middleware/templates/${templateName}/files/${fileName}`, {
      content
    })
  }
}
