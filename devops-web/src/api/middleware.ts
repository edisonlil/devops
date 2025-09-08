import axios from 'axios'
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
  timeout: 10000
})

// 使用相同的拦截器配置
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
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
