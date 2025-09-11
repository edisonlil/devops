import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sshLogin, logout, getSessionInfo, checkSession, type SessionInfo } from '@/api/auth'
import config from '@/config'
import { sessionDiagnostic } from '@/utils/sessionDiagnostic'
import CookieManager from '@/utils/cookie'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const sessionInfo = ref<SessionInfo | null>(null)
  const loading = ref(false)
  const sessionCheckTimer = ref<NodeJS.Timeout | null>(null)

  // 检查本地存储的会话
  const checkLocalSession = () => {
    const session = localStorage.getItem('ssh_session')
    if (session) {
      try {
        const sessionData = JSON.parse(session)
        // 检查会话是否过期
        const now = Date.now()
        const sessionAge = now - (sessionData.timestamp || 0)

        if (sessionData.connected && sessionData.timestamp && sessionAge < config.session.timeout) {
          isAuthenticated.value = true
          sessionInfo.value = sessionData
          return true
        } else {
          // 会话过期，清除本地存储
          localStorage.removeItem('ssh_session')
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
      // 清理 DevOps 自己的旧 Cookie（不影响其他系统）
      CookieManager.clearDevOpsCookies()

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

      // 存储到 localStorage
      localStorage.setItem('ssh_session', JSON.stringify(sessionData))

      // 如果后端返回了会话ID，存储到 Cookie
      if (response.data.sessionId) {
        CookieManager.setSessionId(response.data.sessionId)
        console.log('✅ 已设置 DevOps 会话 Cookie:', config.cookie.sessionName)
      }

      isAuthenticated.value = true
      sessionInfo.value = sessionData

      // 启动会话检查
      startSessionCheck()

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
      // 清除 DevOps Cookie
      CookieManager.clearDevOpsCookies()
      isAuthenticated.value = false
      sessionInfo.value = null
      stopSessionCheck()
    }
  }

  // 验证服务器端会话
  const validateServerSession = async (): Promise<boolean> => {
    try {
      const response = await checkSession()
      return response.valid
    } catch (error) {
      console.error('验证服务器会话失败:', error)
      return false
    }
  }

  // 获取会话信息
  const refreshSession = async () => {
    try {
      // 先验证服务器端会话
      const isValid = await validateServerSession()
      if (!isValid) {
        throw new Error('服务器会话无效')
      }

      const response = await getSessionInfo()

      // 更新本地存储的时间戳
      const sessionData = {
        ...sessionInfo.value,
        ...response.data.data,
        timestamp: Date.now()
      }

      localStorage.setItem('ssh_session', JSON.stringify(sessionData))
      sessionInfo.value = sessionData
      isAuthenticated.value = true
    } catch (error) {
      console.error('获取会话信息失败:', error)
      isAuthenticated.value = false
      sessionInfo.value = null
      localStorage.removeItem('ssh_session')
      // 清除定时器
      if (sessionCheckTimer.value) {
        clearInterval(sessionCheckTimer.value)
        sessionCheckTimer.value = null
      }
    }
  }

  // 启动会话检查定时器
  const startSessionCheck = () => {
    if (sessionCheckTimer.value) {
      clearInterval(sessionCheckTimer.value)
    }

    if (config.session.autoRefresh) {
      sessionCheckTimer.value = setInterval(async () => {
        if (isAuthenticated.value) {
          await refreshSession()
        }
      }, config.session.checkInterval)
    }
  }

  // 停止会话检查定时器
  const stopSessionCheck = () => {
    if (sessionCheckTimer.value) {
      clearInterval(sessionCheckTimer.value)
      sessionCheckTimer.value = null
    }
  }

  // 初始化认证状态
  const init = () => {
    const hasLocalSession = checkLocalSession()
    if (hasLocalSession) {
      // 如果有本地会话，验证服务器端会话
      refreshSession()
      startSessionCheck()
    }
  }

  return {
    isAuthenticated,
    sessionInfo,
    loading,
    login,
    doLogout,
    refreshSession,
    validateServerSession,
    startSessionCheck,
    stopSessionCheck,
    init
  }
})