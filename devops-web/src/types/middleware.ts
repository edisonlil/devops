export interface MiddlewareTemplate {
  name: string
  type: string
  description: string
  category: 'cache' | 'database' | 'message-queue' | 'search' | 'other'
  difficulty: 'simple' | 'recommended' | 'intermediate' | 'advanced'
  icon: string
  platforms: string[]
  tags: string[]
  version: string
  author: string
  source: 'global' | 'workspace'
}

export interface TemplateFormDefinition {
  groups: FormGroup[]
}

export interface FormGroup {
  name: string
  title: string
  fields: FormField[]
}

export interface FormField {
  name: string
  type: 'input' | 'select' | 'switch' | 'resource-slider' | 'textarea'
  label: string
  required: boolean
  placeholder?: string
  help?: string
  default?: any
  options?: SelectOption[]
  validation?: string
  min?: string
  max?: string
  step?: string
}

export interface SelectOption {
  label: string
  value: string | number
}

export interface MiddlewareInstance {
  name: string
  template: string
  workspace: string
  namespace: string
  status: 'running' | 'error' | 'pending' | 'stopped' | 'scaling' | 'updating'
  resources: {
    cpu: {
      request: string
      limit: string
      usage: number
    }
    memory: {
      request: string
      limit: string
      usage: number
    }
    storage: {
      size: string
      used: number
    }
  }
  createdAt: string
  updatedAt?: string
  lastActivity: string
  connectionInfo: {
    internal: string
    external?: string
    port?: number
    username?: string
    database?: string
  }
  ports: InstancePort[]

  // 基于实际 DevOps 功能的扩展
  replicas?: number // 副本数（集群模式）
  monthlyCost?: number // 月成本
  config?: Record<string, any> // 配置参数

  // 健康状态
  health?: {
    status: 'healthy' | 'unhealthy' | 'unknown'
    message?: string
    lastCheck: string
  }

  // 备份信息
  backups?: {
    enabled: boolean
    lastBackup?: string
    schedule?: string
  }

  // 支持的操作
  supportedOperations?: {
    scale: boolean // 是否支持扩缩容
    backup: boolean // 是否支持备份
    restart: boolean // 是否支持重启
    update: boolean // 是否支持更新
  }
}

export interface InstancePort {
  name: string
  port: number
  targetPort: number
  protocol: string
  nodePort?: number
}

export interface DeploymentConfig {
  instance_name: string
  template_name: string
  workspace: string
  namespace: string
  parameters: Record<string, any>
}

export interface DeploymentJob {
  id: string
  config: DeploymentConfig
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  logs: DeploymentLog[]
  startTime: string
  endTime?: string
  error?: string
}

export interface DeploymentLog {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
}

export interface CostEstimation {
  cpu: number
  memory: number
  storage: number
  backup: number
  total: number
}

// 基于实际 DevOps 中间件管理功能的扩展类型

// 扩缩容配置
export interface ScaleConfig {
  replicas: number // 目标副本数
  resources?: {
    cpu?: string
    memory?: string
  }
}

// 备份配置
export interface BackupConfig {
  name?: string // 备份名称
  description?: string // 备份描述
  retention?: number // 保留天数
  schedule?: string // 定时备份计划
}

// 备份记录
export interface BackupRecord {
  id: string
  name: string
  instanceName: string
  createdAt: string
  size: string
  status: 'completed' | 'failed' | 'in_progress'
  description?: string
  type: 'manual' | 'scheduled'
}

// 中间件统计
export interface MiddlewareStats {
  total: number
  running: number
  error: number
  pending: number
  totalCost: number
  byType: Record<string, number>
  byStatus: Record<string, number>
}

// 监控指标
export interface MiddlewareMetrics {
  timestamp: string
  cpu: number
  memory: number
  storage: number
  connections?: number
  qps?: number // 每秒查询数
  latency?: number // 延迟
}

// 事件类型
export interface MiddlewareEvent {
  id: string
  timestamp: string
  type: 'info' | 'warning' | 'error'
  source: string
  message: string
  details?: Record<string, any>
}

// 日志响应
export interface MiddlewareLogsResponse {
  logs: string[]
  lines: number
  hasMore: boolean
  container?: string
}

// 实例详情响应
export interface MiddlewareDetailsResponse {
  instance: MiddlewareInstance
  metrics?: MiddlewareMetrics[]
  events?: MiddlewareEvent[]
  backups?: BackupRecord[]
}

// API 响应类型
export interface MiddlewareListResponse {
  instances: MiddlewareInstance[]
  total: number
  stats: MiddlewareStats
}

// 操作结果
export interface OperationResult {
  success: boolean
  message: string
  data?: any
  jobId?: string // 异步操作的任务ID
}
