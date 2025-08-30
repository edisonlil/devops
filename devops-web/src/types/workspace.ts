export interface Workspace {
  name: string
  displayName: string
  description: string
  middlewareCount: number
  runningCount: number
  errorCount: number
  totalCost: number
  lastActivity: string
  permissions: string[]
  status: 'active' | 'inactive' | 'error'
  createdAt: string
  updatedAt: string
}

export interface WorkspaceSummary {
  workspace: string
  overview: {
    totalInstances: number
    runningInstances: number
    errorInstances: number
    totalCost: number
    lastDeployment: string
  }
  resources: {
    cpu: {
      used: number
      total: number
      unit: string
    }
    memory: {
      used: number
      total: number
      unit: string
    }
    storage: {
      used: number
      total: number
      unit: string
    }
  }
  recentActivities: WorkspaceActivity[]
}

export interface WorkspaceActivity {
  id: string
  type: 'deploy' | 'scale' | 'delete' | 'backup'
  resource: string
  status: 'success' | 'failed' | 'running'
  message: string
  timestamp: string
  user: string
}

export interface WorkspaceDefaults {
  memory_limit: string
  storage_size: string
  backup_enabled: boolean
  monitoring_enabled: boolean
  storage_class: string
  namespace: string
  required_fields: string[]
  validation_rules: Record<string, any[]>
}
