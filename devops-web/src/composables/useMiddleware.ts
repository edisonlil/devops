import { ref, computed } from 'vue'
import { middlewareApi } from '@/api/middleware'
import type { MiddlewareInstance } from '@/types/middleware'

export function useMiddleware() {
  const instances = ref<MiddlewareInstance[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 获取中间件实例列表
  const fetchInstances = async (workspace: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await middlewareApi.getInstances(workspace)
      instances.value = response.data.instances || []
    } catch (err: any) {
      error.value = err.message || '获取实例列表失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 部署新实例
  const deployInstance = async (workspace: string, config: any) => {
    loading.value = true
    try {
      const response = await middlewareApi.deployInstance(workspace, config)
      await fetchInstances(workspace) // 刷新列表
      return response.data
    } catch (err: any) {
      error.value = err.message || '部署失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 删除实例
  const removeInstance = async (workspace: string, instanceName: string) => {
    loading.value = true
    try {
      await middlewareApi.deleteInstance(workspace, instanceName)
      // 从本地列表中移除
      instances.value = instances.value.filter(i => i.name !== instanceName)
    } catch (err: any) {
      error.value = err.message || '删除失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 重启实例
  const restartInstance = async (workspace: string, instanceName: string) => {
    loading.value = true
    try {
      await middlewareApi.restartInstance(workspace, instanceName)
      // 更新本地状态
      const instance = instances.value.find(i => i.name === instanceName)
      if (instance) {
        instance.status = 'pending'
      }
    } catch (err: any) {
      error.value = err.message || '重启失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 扩缩容实例
  const scaleInstance = async (workspace: string, instanceName: string, replicas: number) => {
    loading.value = true
    try {
      await middlewareApi.scaleInstance(workspace, instanceName, { replicas })
      await fetchInstances(workspace) // 刷新列表
    } catch (err: any) {
      error.value = err.message || '扩缩容失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 备份实例
  const backupInstance = async (workspace: string, instanceName: string) => {
    loading.value = true
    try {
      const response = await middlewareApi.createBackup(workspace, instanceName)
      return response.data
    } catch (err: any) {
      error.value = err.message || '备份失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 获取实例详情
  const getInstanceDetails = async (workspace: string, instanceName: string) => {
    loading.value = true
    try {
      const response = await middlewareApi.getInstanceDetails(workspace, instanceName)
      return response.data
    } catch (err: any) {
      error.value = err.message || '获取详情失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 获取实例日志
  const getInstanceLogs = async (workspace: string, instanceName: string, lines = 100) => {
    try {
      const response = await middlewareApi.getInstanceLogs(workspace, instanceName, lines)
      return response.data
    } catch (err: any) {
      error.value = err.message || '获取日志失败'
      throw err
    }
  }

  // 计算属性
  const runningInstances = computed(() => 
    instances.value.filter(i => i.status === 'running')
  )

  const errorInstances = computed(() => 
    instances.value.filter(i => i.status === 'error')
  )

  const totalCost = computed(() => 
    instances.value.reduce((sum, instance) => sum + (instance.monthlyCost || 0), 0)
  )

  const instancesByType = computed(() => {
    const grouped: Record<string, MiddlewareInstance[]> = {}
    instances.value.forEach(instance => {
      const type = instance.template
      if (!grouped[type]) {
        grouped[type] = []
      }
      grouped[type].push(instance)
    })
    return grouped
  })

  return {
    // 状态
    instances,
    loading,
    error,
    
    // 计算属性
    runningInstances,
    errorInstances,
    totalCost,
    instancesByType,
    
    // 方法
    fetchInstances,
    deployInstance,
    removeInstance,
    restartInstance,
    scaleInstance,
    backupInstance,
    getInstanceDetails,
    getInstanceLogs
  }
}

// 中间件模板相关
export function useMiddlewareTemplates() {
  const templates = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchTemplates = async (workspace: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await middlewareApi.getTemplates(workspace)
      templates.value = response.data.templates || []
    } catch (err: any) {
      error.value = err.message || '获取模板失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  const templatesByCategory = computed(() => {
    const grouped: Record<string, any[]> = {}
    templates.value.forEach(template => {
      const category = template.category || 'other'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(template)
    })
    return grouped
  })

  return {
    templates,
    loading,
    error,
    templatesByCategory,
    fetchTemplates
  }
}

// 工作空间相关
export function useWorkspace() {
  const currentWorkspace = ref('default')
  const workspaces = ref<string[]>(['default'])

  const setCurrentWorkspace = (workspace: string) => {
    currentWorkspace.value = workspace
  }

  return {
    currentWorkspace,
    workspaces,
    setCurrentWorkspace
  }
}
