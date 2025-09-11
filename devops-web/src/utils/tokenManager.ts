import config from '@/config'

export interface TokenData {
  token: string
  sessionId: string
  expiresAt: number
  host: string
  username: string
}

export class TokenManager {
  /**
   * 设置认证 Token
   */
  static setToken(tokenData: TokenData): void {
    const data = {
      ...tokenData,
      timestamp: Date.now()
    }

    localStorage.setItem(config.auth.storage.tokenKey, JSON.stringify(data))
    console.log('🔑 Token 已设置:', {
      sessionId: tokenData.sessionId,
      host: tokenData.host,
      username: tokenData.username,
      expiresAt: new Date(tokenData.expiresAt).toISOString()
    })
  }

  /**
   * 获取认证 Token
   */
  static getToken(): string | null {
    const tokenData = this.getTokenData()
    return tokenData?.token || null
  }

  /**
   * 获取会话 ID
   */
  static getSessionId(): string | null {
    const tokenData = this.getTokenData()
    return tokenData?.sessionId || null
  }

  /**
   * 获取完整的 Token 数据
   */
  static getTokenData(): TokenData | null {
    try {
      const data = localStorage.getItem(config.auth.storage.tokenKey)
      if (!data) return null

      const tokenData: TokenData & { timestamp: number } = JSON.parse(data)
      
      // 检查是否过期
      if (Date.now() > tokenData.expiresAt) {
        console.warn('🔑 Token 已过期，自动清除')
        this.clearToken()
        return null
      }

      return tokenData
    } catch (error) {
      console.error('🔑 解析 Token 数据失败:', error)
      this.clearToken()
      return null
    }
  }

  /**
   * 检查 Token 是否有效
   */
  static isTokenValid(): boolean {
    const tokenData = this.getTokenData()
    return tokenData !== null
  }

  /**
   * 检查 Token 是否即将过期（5分钟内）
   */
  static isTokenExpiringSoon(): boolean {
    const tokenData = this.getTokenData()
    if (!tokenData) return false

    const fiveMinutes = 5 * 60 * 1000
    return (tokenData.expiresAt - Date.now()) < fiveMinutes
  }

  /**
   * 刷新 Token 过期时间
   */
  static refreshToken(): void {
    const tokenData = this.getTokenData()
    if (!tokenData) return

    const newTokenData = {
      ...tokenData,
      expiresAt: Date.now() + config.auth.tokenExpiry
    }

    this.setToken(newTokenData)
    console.log('🔄 Token 过期时间已刷新')
  }

  /**
   * 清除 Token
   */
  static clearToken(): void {
    localStorage.removeItem(config.auth.storage.tokenKey)
    console.log('🗑️ Token 已清除')
  }

  /**
   * 获取认证头
   */
  static getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    
    const token = this.getToken()
    const sessionId = this.getSessionId()

    if (token) {
      headers[config.auth.headers.authorization] = `Bearer ${token}`
    }

    if (sessionId) {
      headers[config.auth.headers.sessionId] = sessionId
    }

    return headers
  }

  /**
   * 从登录响应中提取并设置 Token
   */
  static setTokenFromLoginResponse(responseData: any, credentials: { host: string; username: string }): void {
    const { sessionId, token } = responseData.data
    
    // 如果后端没有返回 token，使用 sessionId 作为 token
    const authToken = token || sessionId
    
    const tokenData: TokenData = {
      token: authToken,
      sessionId: sessionId,
      expiresAt: Date.now() + config.auth.tokenExpiry,
      host: credentials.host,
      username: credentials.username
    }

    this.setToken(tokenData)
  }

  /**
   * 获取用户信息
   */
  static getUserInfo(): { host: string; username: string } | null {
    const tokenData = this.getTokenData()
    if (!tokenData) return null

    return {
      host: tokenData.host,
      username: tokenData.username
    }
  }
}

export default TokenManager
