import request from './request'
import TokenManager from '@/utils/tokenManager'
import config from '@/config'

export interface SSHLoginRequest {
  host: string
  username: string
  password: string
}

export interface SSHLoginResponse {
  success: boolean
  message: string
  data: {
    sessionId: string
    defaultWorkspace?: string
    availableWorkspaces: string[]
  }
}

export interface SessionInfo {
  host: string
  username: string
  connected: boolean
  defaultWorkspace?: string
  availableWorkspaces: string[]
}

// SSH登录
export const sshLogin = async (data: SSHLoginRequest): Promise<SSHLoginResponse> => {
  const response = await request.post('/auth/ssh-login', data)

  // 如果使用 Token 认证，保存 Token
  if (config.auth.mode === 'token' && response.data?.success) {
    TokenManager.setTokenFromLoginResponse(response.data, {
      host: data.host,
      username: data.username
    })
  }

  return response.data
}

// 获取当前会话信息
export const getSessionInfo = (): Promise<{ data: { success: boolean, data: SessionInfo } }> => {
  return request.get('/auth/session')
}

// 登出
export const logout = async (): Promise<{ success: boolean }> => {
  const response = await request.post('/auth/logout')

  // 清除认证信息
  if (config.auth.mode === 'token') {
    TokenManager.clearToken()
  }

  return response.data
}

// 检查会话是否有效
export const checkSession = (): Promise<{ valid: boolean }> => {
  return request.get('/auth/check')
}