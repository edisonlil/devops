// 应用相关类型定义

// 应用类型枚举
export type ApplicationType = 'java' | 'vue' | 'nodejs' | 'go' | 'nginx' | 'tomcat' | 'python'

// 应用类型选项
export interface ApplicationTypeOption {
  label: string
  value: ApplicationType
  description?: string
  icon?: string
}

// 应用类型配置
export const APPLICATION_TYPES: ApplicationTypeOption[] = [
  { 
    label: 'Java 应用', 
    value: 'java',
    description: 'Spring Boot、Spring Cloud 等 Java 应用',
    icon: '☕'
  },
  { 
    label: 'Vue 应用', 
    value: 'vue',
    description: 'Vue.js 前端单页应用',
    icon: '🟢'
  },
  { 
    label: 'Node.js 应用', 
    value: 'nodejs',
    description: 'Express、Koa、NestJS 等 Node.js 应用',
    icon: '🟩'
  },
  { 
    label: 'Go 应用', 
    value: 'go',
    description: 'Gin、Echo 等 Go 语言应用',
    icon: '🔵'
  },
  { 
    label: 'Nginx 应用', 
    value: 'nginx',
    description: '静态网站、反向代理等 Nginx 应用',
    icon: '🌐'
  },
  { 
    label: 'Tomcat 应用', 
    value: 'tomcat',
    description: 'JSP、Servlet 等传统 Java Web 应用',
    icon: '🐱'
  },
  { 
    label: 'Python 应用', 
    value: 'python',
    description: 'Django、Flask、FastAPI 等 Python 应用',
    icon: '🐍'
  }
]

// 根据应用类型获取配置
export const getApplicationTypeConfig = (type: ApplicationType): ApplicationTypeOption | undefined => {
  return APPLICATION_TYPES.find(t => t.value === type)
}

// 获取应用类型标签
export const getApplicationTypeLabel = (type: ApplicationType): string => {
  const config = getApplicationTypeConfig(type)
  return config?.label || type
}

// 应用部署状态
export type DeploymentStatus = 'deploying' | 'running' | 'stopped' | 'failed' | 'pending'

// 应用部署配置
export interface ApplicationDeployConfig {
  name: string
  type: ApplicationType
  workspace: string
  serverId: string
  gitUrl?: string
  svnUrl?: string
  branch?: string
  buildTool?: string
  template?: string
  namespace?: string
  ports?: {
    app?: number
    expose?: number
    service?: string
    export?: string
  }
  resources?: {
    cpu?: string
    memory?: string
    storage?: string
  }
  environment?: Record<string, string>
}

// 应用实例信息
export interface ApplicationInstance {
  id: string
  name: string
  type: ApplicationType
  workspace: string
  status: DeploymentStatus
  image?: string
  version?: string
  ports?: Array<{
    name?: string
    port: number
    targetPort?: number
    nodePort?: number
    protocol?: 'TCP' | 'UDP'
  }>
  resources?: {
    cpu?: string
    memory?: string
    limits?: {
      cpu?: string
      memory?: string
    }
  }
  replicas?: {
    desired: number
    ready: number
    available: number
  }
  createdAt: string
  updatedAt: string
  deploymentFile?: string
}

export default {
  APPLICATION_TYPES,
  getApplicationTypeConfig,
  getApplicationTypeLabel
}
