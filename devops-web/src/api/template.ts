import axios from 'axios'
import appConfig from '@/config'
import TokenManager from '@/utils/tokenManager'
import CookieManager from '@/utils/cookie'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,  // 增加到30秒，因为SSH命令可能需要更长时间
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
      console.log('🔑 Template API Request (Token Header):', {
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
      console.log('Template API Request (Cookie):', {
        url: config.url,
        method: config.method,
        sessionId: sessionId ? '***' : 'none',
        authToken: authToken ? '***' : 'none'
      })
    }

    return config
  },
  (error) => {
    console.error('Template API Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 调试信息：记录成功响应
    console.log('Template API Response:', {
      url: response.config.url,
      status: response.status,
      headers: response.headers,
      data: response.data
    })
    return response.data
  },
  (error) => {
    // 调试信息：记录错误响应
    console.error('Template API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })

    if (error.response?.status === 401) {
      console.warn('Template API 认证失效，跳转到登录页')

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

// 模板文件信息
export interface TemplateFile {
  name: string
  type: 'file' | 'directory'
  size?: number
  extension?: string
  lastModified?: Date
}

// 模板文件列表响应
export interface TemplateFilesResponse {
  success: boolean
  data: TemplateFile[]
}

// 模板文件内容响应
export interface TemplateFileContentResponse {
  success: boolean
  data: {
    fileName: string
    content: string
  }
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
  },

  // 获取全局模板文件列表
  getGlobalTemplateFiles: (templateName: string) => {
    return api.get<TemplateFilesResponse>(`/templates/${templateName}/files`)
  },

  // 获取全局模板文件内容
  getGlobalTemplateFileContent: (templateName: string, fileName: string) => {
    return api.get<TemplateFileContentResponse>(`/templates/${templateName}/files/${fileName}`)
  },

  // 获取全局应用模板文件列表
  getGlobalAppTemplateFiles: (templateName: string) => {
    return api.get<TemplateFilesResponse>(`/templates/app/${templateName}/files`)
  },

  // 获取全局应用模板文件内容
  getGlobalAppTemplateFileContent: (templateName: string, fileName: string) => {
    return api.get<TemplateFileContentResponse>(`/templates/app/${templateName}/files/${fileName}`)
  },

  // 更新应用模板文件内容（仅限工作空间模板）
  updateAppTemplateFileContent: (templateName: string, fileName: string, content: string) => {
    return api.put(`/templates/app/${templateName}/files/${fileName}`, {
      content
    })
  },

  // 获取工作空间应用模板文件列表
  getWorkspaceAppTemplateFiles: (workspace: string, templateName: string) => {
    return api.get<TemplateFilesResponse>(`/workspaces/${workspace}/app/templates/${templateName}/files`)
  },

  // 获取工作空间应用模板文件内容
  getWorkspaceAppTemplateFileContent: (workspace: string, templateName: string, fileName: string) => {
    return api.get<TemplateFileContentResponse>(`/workspaces/${workspace}/app/templates/${templateName}/files/${fileName}`)
  },

  // 更新工作空间应用模板文件内容
  updateWorkspaceAppTemplateFileContent: (workspace: string, templateName: string, fileName: string, content: string) => {
    return api.put(`/workspaces/${workspace}/app/templates/${templateName}/files/${fileName}`, {
      content
    })
  }
}
