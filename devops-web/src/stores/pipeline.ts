import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 流水线类型定义
export interface Pipeline {
  id: string
  name: string
  template: string
  config: any
  command: string
  createdAt: string
  lastDeployAt?: string
  deployCount: number
  status: 'never' | 'success' | 'failed' | 'running'
  executing?: boolean
}

// 部署历史记录
export interface DeployHistory {
  id: string
  pipelineId: string
  status: 'success' | 'failed' | 'running'
  startTime: string
  endTime?: string
  logs: string[]
  command: string
}

// API响应类型
export interface PipelineResponse {
  success: boolean
  data?: Pipeline[]
  message?: string
}

export const usePipelineStore = defineStore('pipeline', () => {
  // 状态
  const pipelines = ref<Pipeline[]>([])
  const deployHistory = ref<DeployHistory[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentWorkspace = ref<string>('')

  // 计算属性
  const totalPipelines = computed(() => pipelines.value.length)
  
  const activePipelines = computed(() => 
    pipelines.value.filter(p => p.status !== 'never').length
  )
  
  const totalDeployments = computed(() => 
    pipelines.value.reduce((sum, p) => sum + p.deployCount, 0)
  )
  
  const successRate = computed(() => {
    const total = deployHistory.value.length
    if (total === 0) return 0
    const successful = deployHistory.value.filter(h => h.status === 'success').length
    return Math.round((successful / total) * 100)
  })

  const runningPipelines = computed(() =>
    pipelines.value.filter(p => p.status === 'running')
  )

  // 本地存储键名（基于工作空间）
  const getStorageKey = (workspace: string) => `devops_pipelines_${workspace}`
  const getHistoryKey = (workspace: string) => `devops_deploy_history_${workspace}`

  // 私有方法：本地存储操作
  const saveToStorage = () => {
    if (!currentWorkspace.value) {
      console.warn('未设置当前工作空间，无法保存数据')
      return
    }

    try {
      localStorage.setItem(getStorageKey(currentWorkspace.value), JSON.stringify(pipelines.value))
      localStorage.setItem(getHistoryKey(currentWorkspace.value), JSON.stringify(deployHistory.value))
    } catch (error) {
      console.error('保存到本地存储失败:', error)
    }
  }

  const loadFromStorage = () => {
    if (!currentWorkspace.value) {
      console.warn('未设置当前工作空间，无法加载数据')
      return
    }

    try {
      const pipelinesData = localStorage.getItem(getStorageKey(currentWorkspace.value))
      const historyData = localStorage.getItem(getHistoryKey(currentWorkspace.value))

      if (pipelinesData) {
        pipelines.value = JSON.parse(pipelinesData)
      } else {
        // 如果没有数据，初始化为空数组
        pipelines.value = []
      }

      if (historyData) {
        deployHistory.value = JSON.parse(historyData)
      }
    } catch (error) {
      console.error('从本地存储加载失败:', error)
      error.value = '加载数据失败'
    }
  }

  // 设置当前工作空间
  const setCurrentWorkspace = (workspace: string) => {
    currentWorkspace.value = workspace
  }

  // 公共方法：流水线管理
  const loadPipelines = async (workspace?: string) => {
    if (workspace) {
      setCurrentWorkspace(workspace)
    }
    loading.value = true
    error.value = null
    
    try {
      // TODO: 后续替换为API调用
      // const response = await api.getPipelines()
      // pipelines.value = response.data
      
      // 当前使用本地存储
      loadFromStorage()
    } catch (err) {
      error.value = '加载流水线失败'
      console.error('加载流水线失败:', err)
    } finally {
      loading.value = false
    }
  }

  const createPipeline = async (pipelineData: Omit<Pipeline, 'id' | 'createdAt' | 'deployCount' | 'status'>, workspace?: string) => {
    if (workspace) {
      setCurrentWorkspace(workspace)
    }
    loading.value = true
    error.value = null
    
    try {
      const newPipeline: Pipeline = {
        ...pipelineData,
        id: Date.now().toString(), // 临时ID生成方式
        createdAt: new Date().toISOString(),
        deployCount: 0,
        status: 'never'
      }

      // TODO: 后续替换为API调用
      // const response = await api.createPipeline(newPipeline)
      // pipelines.value.push(response.data)
      
      // 当前使用本地存储
      pipelines.value.push(newPipeline)
      saveToStorage()
      
      return newPipeline
    } catch (err) {
      error.value = '创建流水线失败'
      console.error('创建流水线失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePipeline = async (id: string, updates: Partial<Pipeline>, workspace?: string) => {
    if (workspace) {
      setCurrentWorkspace(workspace)
    }
    loading.value = true
    error.value = null
    
    try {
      const index = pipelines.value.findIndex(p => p.id === id)
      if (index === -1) {
        throw new Error('流水线不存在')
      }

      // TODO: 后续替换为API调用
      // const response = await api.updatePipeline(id, updates)
      // pipelines.value[index] = response.data
      
      // 当前使用本地存储
      pipelines.value[index] = { ...pipelines.value[index], ...updates }
      saveToStorage()
      
      return pipelines.value[index]
    } catch (err) {
      error.value = '更新流水线失败'
      console.error('更新流水线失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deletePipeline = async (id: string) => {
    loading.value = true
    error.value = null
    
    try {
      const index = pipelines.value.findIndex(p => p.id === id)
      if (index === -1) {
        throw new Error('流水线不存在')
      }

      // TODO: 后续替换为API调用
      // await api.deletePipeline(id)
      
      // 当前使用本地存储
      pipelines.value.splice(index, 1)
      
      // 同时删除相关的部署历史
      deployHistory.value = deployHistory.value.filter(h => h.pipelineId !== id)
      
      saveToStorage()
    } catch (err) {
      error.value = '删除流水线失败'
      console.error('删除流水线失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getPipelineById = (id: string): Pipeline | undefined => {
    return pipelines.value.find(p => p.id === id)
  }

  const searchPipelines = (query: string): Pipeline[] => {
    if (!query.trim()) return pipelines.value

    const lowerQuery = query.toLowerCase()
    return pipelines.value.filter(pipeline =>
      pipeline.name.toLowerCase().includes(lowerQuery) ||
      pipeline.template.toLowerCase().includes(lowerQuery)
    )
  }

  // 部署历史管理
  const addDeployHistory = async (history: Omit<DeployHistory, 'id'>) => {
    const newHistory: DeployHistory = {
      ...history,
      id: Date.now().toString()
    }
    
    deployHistory.value.unshift(newHistory) // 最新的在前面
    saveToStorage()
    
    return newHistory
  }

  const getDeployHistory = (pipelineId?: string): DeployHistory[] => {
    if (pipelineId) {
      return deployHistory.value.filter(h => h.pipelineId === pipelineId)
    }
    return deployHistory.value
  }

  const updateDeployHistory = async (id: string, updates: Partial<DeployHistory>) => {
    const index = deployHistory.value.findIndex(h => h.id === id)
    if (index !== -1) {
      deployHistory.value[index] = { ...deployHistory.value[index], ...updates }
      saveToStorage()
    }
  }

  // 流水线执行相关
  const startPipelineExecution = async (pipelineId: string) => {
    const pipeline = getPipelineById(pipelineId)
    if (!pipeline) {
      throw new Error('流水线不存在')
    }

    // 更新流水线状态
    await updatePipeline(pipelineId, { 
      status: 'running',
      executing: true 
    })

    // 创建部署历史记录
    const history = await addDeployHistory({
      pipelineId,
      status: 'running',
      startTime: new Date().toISOString(),
      logs: [],
      command: pipeline.command
    })

    return history
  }

  const finishPipelineExecution = async (
    pipelineId: string, 
    historyId: string, 
    status: 'success' | 'failed',
    logs: string[] = []
  ) => {
    // 更新流水线状态
    const updates: Partial<Pipeline> = {
      status,
      executing: false,
      lastDeployAt: new Date().toISOString()
    }

    if (status === 'success') {
      const pipeline = getPipelineById(pipelineId)
      if (pipeline) {
        updates.deployCount = pipeline.deployCount + 1
      }
    }

    await updatePipeline(pipelineId, updates)

    // 更新部署历史
    await updateDeployHistory(historyId, {
      status,
      endTime: new Date().toISOString(),
      logs
    })
  }

  // 清理方法
  const clearError = () => {
    error.value = null
  }

  const reset = () => {
    pipelines.value = []
    deployHistory.value = []
    error.value = null
    loading.value = false
  }

  // 清除特定工作空间的数据
  const clearWorkspaceData = (workspace: string) => {
    try {
      localStorage.removeItem(getStorageKey(workspace))
      localStorage.removeItem(getHistoryKey(workspace))
      if (currentWorkspace.value === workspace) {
        pipelines.value = []
        deployHistory.value = []
      }
    } catch (error) {
      console.error('清除工作空间数据失败:', error)
    }
  }

  return {
    // 状态
    pipelines,
    deployHistory,
    loading,
    error,
    
    // 计算属性
    totalPipelines,
    activePipelines,
    totalDeployments,
    successRate,
    runningPipelines,
    
    // 方法
    setCurrentWorkspace,
    loadPipelines,
    createPipeline,
    updatePipeline,
    deletePipeline,
    getPipelineById,
    searchPipelines,
    
    // 部署历史
    addDeployHistory,
    getDeployHistory,
    updateDeployHistory,
    
    // 执行管理
    startPipelineExecution,
    finishPipelineExecution,
    
    // 工具方法
    clearError,
    reset,
    clearWorkspaceData
  }
})
