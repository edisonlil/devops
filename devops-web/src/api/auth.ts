import request from './request'

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
export const sshLogin = (data: SSHLoginRequest): Promise<SSHLoginResponse> => {
  return request.post('/auth/ssh-login', data)
}

// 获取当前会话信息
export const getSessionInfo = (): Promise<{ data: { success: boolean, data: SessionInfo } }> => {
  return request.get('/auth/session')
}

// 登出
export const logout = (): Promise<{ success: boolean }> => {
  return request.post('/auth/logout')
}

// 检查会话是否有效
export const checkSession = (): Promise<{ valid: boolean }> => {
  return request.get('/auth/check')
}