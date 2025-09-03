import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sshLogin, logout, getSessionInfo, type SessionInfo } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const sessionInfo = ref<SessionInfo | null>(null)
  const loading = ref(false)

  // 检查本地存储的会话
  const checkLocalSession = () => {
    const session = localStorage.getItem('ssh_session')
    if (session) {
      try {
        const sessionData = JSON.parse(session)
        if (sessionData.connected && sessionData.timestamp) {
          isAuthenticated.value = true
          sessionInfo.value = sessionData
          return true
        }
      } catch (error) {
        console.error('解析本地会话失败:', error)
        localStorage.removeItem('ssh_session')
      }
    }
    return false
  }

  // SSH登录
  const login = async (credentials: { host: string; username: string; password: string }) => {
    loading.value = true
    try {
      const response = await sshLogin(credentials)
      
      // 存储会话信息
      const sessionData = {
        host: credentials.host,
        username: credentials.username,
        connected: true,
        timestamp: Date.now(),
        defaultWorkspace: response.data.defaultWorkspace,
        availableWorkspaces: response.data.availableWorkspaces
      }
      
      localStorage.setItem('ssh_session', JSON.stringify(sessionData))
      
      isAuthenticated.value = true
      sessionInfo.value = sessionData
      
      return response
    } finally {
      loading.value = false
    }
  }

  // 登出
  const doLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('服务器登出失败:', error)
    } finally {
      // 无论服务器登出是否成功，都清除本地会话
      localStorage.removeItem('ssh_session')
      isAuthenticated.value = false
      sessionInfo.value = null
    }
  }

  // 获取会话信息
  const refreshSession = async () => {
    try {
      const response = await getSessionInfo()
      sessionInfo.value = response.data
      isAuthenticated.value = true
    } catch (error) {
      console.error('获取会话信息失败:', error)
      isAuthenticated.value = false
      sessionInfo.value = null
      localStorage.removeItem('ssh_session')
    }
  }

  // 初始化认证状态
  const init = () => {
    checkLocalSession()
  }

  return {
    isAuthenticated,
    sessionInfo,
    loading,
    login,
    doLogout,
    refreshSession,
    init
  }
})