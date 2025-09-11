import config from '@/config'

export interface CookieOptions {
  expires?: Date
  maxAge?: number
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

export class CookieManager {
  /**
   * 设置 Cookie
   */
  static set(name: string, value: string, options: CookieOptions = {}) {
    const {
      expires,
      maxAge = config.cookie.maxAge,
      path = config.cookie.path,
      domain = config.cookie.domain,
      secure = config.cookie.secure,
      sameSite = config.cookie.sameSite
    } = options

    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

    if (expires) {
      cookieString += `; expires=${expires.toUTCString()}`
    }

    if (maxAge) {
      cookieString += `; max-age=${maxAge}`
    }

    if (path) {
      cookieString += `; path=${path}`
    }

    if (domain) {
      cookieString += `; domain=${domain}`
    }

    if (secure) {
      cookieString += `; secure`
    }

    if (sameSite) {
      cookieString += `; samesite=${sameSite}`
    }

    document.cookie = cookieString
    console.log(`🍪 设置 Cookie: ${name}`, { value, options })
  }

  /**
   * 获取 Cookie
   */
  static get(name: string): string | null {
    const cookies = this.getAll()
    return cookies[name] || null
  }

  /**
   * 获取所有 Cookie
   */
  static getAll(): Record<string, string> {
    const cookies: Record<string, string> = {}
    
    if (document.cookie) {
      document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=')
        if (name && value) {
          cookies[decodeURIComponent(name)] = decodeURIComponent(value)
        }
      })
    }
    
    return cookies
  }

  /**
   * 删除 Cookie
   */
  static remove(name: string, options: Pick<CookieOptions, 'path' | 'domain'> = {}) {
    const {
      path = config.cookie.path,
      domain = config.cookie.domain
    } = options

    this.set(name, '', {
      expires: new Date(0),
      path,
      domain
    })
    
    console.log(`🗑️ 删除 Cookie: ${name}`)
  }

  /**
   * 检查 Cookie 是否存在
   */
  static has(name: string): boolean {
    return this.get(name) !== null
  }

  /**
   * 获取 DevOps 会话 Cookie
   */
  static getSessionId(): string | null {
    return this.get(config.cookie.sessionName)
  }

  /**
   * 设置 DevOps 会话 Cookie
   */
  static setSessionId(sessionId: string, options: CookieOptions = {}) {
    this.set(config.cookie.sessionName, sessionId, options)
  }

  /**
   * 删除 DevOps 会话 Cookie
   */
  static removeSessionId() {
    this.remove(config.cookie.sessionName)
  }

  /**
   * 获取认证 Token Cookie
   */
  static getAuthToken(): string | null {
    return this.get(config.cookie.authName)
  }

  /**
   * 设置认证 Token Cookie
   */
  static setAuthToken(token: string, options: CookieOptions = {}) {
    this.set(config.cookie.authName, token, options)
  }

  /**
   * 删除认证 Token Cookie
   */
  static removeAuthToken() {
    this.remove(config.cookie.authName)
  }

  /**
   * 清除所有 DevOps 相关的 Cookie
   * 注意：只清除 DevOps 自己的 Cookie，不影响其他系统
   */
  static clearDevOpsCookies() {
    this.removeSessionId()
    this.removeAuthToken()

    console.log('🧹 已清除 DevOps 相关的 Cookie')
  }
}

export default CookieManager
