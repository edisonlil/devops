import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Workspace } from '@/types/workspace'
import { workspaceApi } from '@/api/workspace'

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([])
  const currentWorkspace = ref<string>('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const currentWorkspaceInfo = computed(() => {
    return workspaces.value.find(ws => ws.name === currentWorkspace.value)
  })

  const workspaceOptions = computed(() => {
    return workspaces.value.map(ws => ({
      label: ws.displayName,
      value: ws.name
    }))
  })

  // 获取工作空间列表
  const fetchWorkspaces = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await workspaceApi.getWorkspaces()
      workspaces.value = response.data.workspaces
      
      // 如果没有当前工作空间，设置第一个为当前工作空间
      if (!currentWorkspace.value && workspaces.value.length > 0) {
        currentWorkspace.value = workspaces.value[0].name
      }
    } catch (err: any) {
      error.value = err.message || '获取工作空间列表失败'
      console.error('获取工作空间列表失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 切换工作空间
  const switchWorkspace = async (workspaceName: string) => {
    if (workspaceName === currentWorkspace.value) return
    
    currentWorkspace.value = workspaceName
    localStorage.setItem('currentWorkspace', workspaceName)
    
    // 可以在这里触发其他相关数据的刷新
    // await refreshWorkspaceData()
  }

  // 创建工作空间
  const createWorkspace = async (workspaceData: Partial<Workspace>) => {
    loading.value = true
    error.value = null
    try {
      const response = await workspaceApi.createWorkspace(workspaceData)
      await fetchWorkspaces() // 重新获取列表
      return response.data
    } catch (err: any) {
      error.value = err.message || '创建工作空间失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 获取工作空间概览信息
  const getWorkspaceSummary = async (workspaceName: string) => {
    try {
      const response = await workspaceApi.getWorkspaceSummary(workspaceName)
      return response.data
    } catch (err: any) {
      console.error('获取工作空间概览失败:', err)
      throw err
    }
  }

  // 更新工作空间列表（用于SSH登录后更新）
  const updateWorkspaces = (newWorkspaces: Workspace[]) => {
    workspaces.value = newWorkspaces
  }

  // 初始化
  const init = () => {
    const savedWorkspace = localStorage.getItem('currentWorkspace')
    if (savedWorkspace) {
      currentWorkspace.value = savedWorkspace
    }
    // SSH登录后会通过updateWorkspaces更新工作空间列表，这里不自动fetchWorkspaces
    // fetchWorkspaces()
  }

  return {
    workspaces,
    currentWorkspace,
    loading,
    error,
    currentWorkspaceInfo,
    workspaceOptions,
    fetchWorkspaces,
    switchWorkspace,
    createWorkspace,
    getWorkspaceSummary,
    updateWorkspaces,
    init
  }
})
