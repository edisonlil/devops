import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000  // 增加到30秒，因为SSH命令可能需要更长时间
})

// 使用相同的拦截器配置
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('模板API请求失败:', error)
    return Promise.reject(error)
  }
)

// 应用部署模板类型定义（基于实际metadata.yaml结构）
export interface AppTemplate {
  name: string              // 目录名，如 'spring-boot'
  displayName?: string      // metadata.yaml中的name或displayName
  description?: string      // metadata.yaml中的description
  platform?: string       // metadata.yaml中的platform，如 'kubernetes'
  author?: string          // metadata.yaml中的author
  version?: string         // metadata.yaml中的version
  hasMetadata: boolean     // 是否有metadata.yaml文件
  source: 'global' | 'workspace'
  tags?: string[]          // 可选的标签
  variables?: Array<{      // metadata.yaml中的variables
    name: string
    type: string
    required?: boolean
    default?: any
    description?: string
    example?: string
    validation?: string
    options?: string[]
  }>
}

// App模板列表响应
export interface AppTemplateListResponse {
  templates: {
    global: AppTemplate[]
    workspace: AppTemplate[]
  }
  categories: string[]      // ['java', 'vue', 'python', 'nginx', ...]
  platforms: string[]      // ['kubernetes', 'docker', ...]
  defaults: Record<string, any>
}

// App模板详情响应
export interface AppTemplateDetailResponse {
  success: boolean
  data: AppTemplate
}

export const appTemplateApi = {
  // 获取全局app模板列表
  getGlobalAppTemplates: () => {
    return api.get<AppTemplateListResponse>('/app/templates')
  },

  // 获取工作空间app模板列表
  getWorkspaceAppTemplates: (workspace: string) => {
    return api.get<AppTemplateListResponse>(`/workspaces/${workspace}/app/templates`)
  },

  // 获取所有app模板（全局 + 工作空间）
  getAllAppTemplates: (workspace: string) => {
    return api.get<AppTemplateListResponse>(`/workspaces/${workspace}/app/templates/all`)
  },

  // 获取app模板详情
  getAppTemplate: (templateName: string, workspace?: string) => {
    const url = workspace
      ? `/workspaces/${workspace}/app/templates/${templateName}`
      : `/app/templates/${templateName}`
    return api.get<AppTemplateDetailResponse>(url)
  },

  // 搜索app模板
  searchAppTemplates: (query: string, workspace?: string) => {
    const url = workspace
      ? `/workspaces/${workspace}/app/templates/search`
      : `/app/templates/search`
    return api.get<AppTemplateListResponse>(url, {
      params: { q: query }
    })
  },

  // 按分类获取app模板
  getAppTemplatesByCategory: (category: string, workspace?: string) => {
    const url = workspace
      ? `/workspaces/${workspace}/app/templates/category/${category}`
      : `/app/templates/category/${category}`
    return api.get<AppTemplateListResponse>(url)
  },

  // 复制全局模板到工作空间，并指定新模板名
  copyToWorkspace: (workspace: string, sourceName: string, newName: string) => {
    return api.post(`/workspaces/${workspace}/app/templates/copy`, { sourceName, newName })
  },

  // 获取app模板变量定义（从metadata.yaml）
  getAppTemplateVariables: (templateName: string, workspace?: string) => {
    const url = workspace
      ? `/workspaces/${workspace}/app/templates/${templateName}/variables`
      : `/app/templates/${templateName}/variables`
    return api.get<{
      success: boolean
      data: {
        variables: Array<{
          name: string
          type: string
          required?: boolean
          default?: any
          description?: string
          example?: string
          validation?: string
          options?: string[]
        }>
        defaults: Record<string, any>
      }
    }>(url)
  }
}
