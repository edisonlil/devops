import CookieManager from './cookie'
import config from '@/config'

// 会话诊断工具
export const sessionDiagnostic = {
  // 解析 Cookie 字符串
  parseCookies() {
    const cookies: Record<string, string> = {}
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=')
      if (name && value) {
        cookies[name] = decodeURIComponent(value)
      }
    })
    return cookies
  },

  // 获取 DevOps 相关的 Cookie
  getDevOpsCookies() {
    const allCookies = this.parseCookies()
    const devopsCookies: Record<string, string> = {}

    // 获取 DevOps 专用 Cookie
    const sessionId = CookieManager.getSessionId()
    const authToken = CookieManager.getAuthToken()

    if (sessionId) {
      devopsCookies[config.cookie.sessionName] = sessionId
    }

    if (authToken) {
      devopsCookies[config.cookie.authName] = authToken
    }

    // 查找其他可能相关的 Cookie
    Object.keys(allCookies).forEach(name => {
      if (name.includes('DEVOPS') ||
          name.includes('SESSION') ||
          name.includes('AUTH') ||
          name.includes('LOGIN') ||
          name.includes('JSESSIONID')) {
        devopsCookies[name] = allCookies[name]
      }
    })

    return devopsCookies
  },

  // 清理 DevOps Cookie（不影响其他系统）
  clearDevOpsCookies() {
    CookieManager.clearDevOpsCookies()
  },

  // 检查是否存在可能的冲突 Cookie（仅检查，不删除）
  checkConflictingCookies() {
    const allCookies = this.parseCookies()
    const conflictingCookies = ['XXL_JOB_LOGIN_IDENTITY', 'JSESSIONID']
    const found: string[] = []

    conflictingCookies.forEach(cookieName => {
      if (allCookies[cookieName]) {
        found.push(cookieName)
      }
    })

    if (found.length > 0) {
      console.warn('⚠️ 检测到其他系统的 Cookie，可能存在冲突:', found)
      console.log('💡 建议：如果遇到会话问题，请联系管理员配置独立的域名或路径')
    }

    return found
  },
  // 检查当前环境信息
  checkEnvironment() {
    const info = {
      location: {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port,
        origin: window.location.origin
      },
      userAgent: navigator.userAgent,
      cookies: {
        enabled: navigator.cookieEnabled,
        all: document.cookie,
        parsed: this.parseCookies(),
        devopsRelated: this.getDevOpsCookies()
      },
      localStorage: {
        available: typeof Storage !== 'undefined',
        sessionData: localStorage.getItem('ssh_session')
      },
      timestamp: new Date().toISOString()
    }
    
    console.group('🔍 会话诊断信息')
    console.log('环境信息:', info)
    console.groupEnd()
    
    return info
  },

  // 检查 API 连通性
  async checkApiConnectivity() {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        credentials: 'include'
      })
      
      console.log('✅ API 连通性检查成功:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      return true
    } catch (error) {
      console.error('❌ API 连通性检查失败:', error)
      return false
    }
  },

  // 检查会话状态
  async checkSessionStatus() {
    try {
      const response = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include'
      })
      
      const data = await response.json()
      
      console.log('会话状态检查:', {
        status: response.status,
        valid: data.valid,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      return data.valid
    } catch (error) {
      console.error('会话状态检查失败:', error)
      return false
    }
  },

  // 完整诊断
  async fullDiagnostic() {
    console.group('🚀 开始完整会话诊断')

    // 1. 环境检查
    this.checkEnvironment()

    // 2. 检查冲突 Cookie（仅检查，不删除）
    const conflictingCookies = this.checkConflictingCookies()

    // 3. API 连通性检查
    const apiConnected = await this.checkApiConnectivity()

    // 4. 会话状态检查
    const sessionValid = await this.checkSessionStatus()

    const result = {
      apiConnected,
      sessionValid,
      conflictingCookies,
      recommendation: this.getRecommendation(apiConnected, sessionValid, conflictingCookies)
    }

    console.log('📊 诊断结果:', result)
    console.groupEnd()

    return result
  },

  // 获取建议
  getRecommendation(apiConnected: boolean, sessionValid: boolean, conflictingCookies: string[] = []) {
    if (!apiConnected) {
      return '❌ API 无法连接，请检查网络配置和后端服务状态'
    }

    if (!sessionValid) {
      if (conflictingCookies.length > 0) {
        return `⚠️ 会话无效，检测到其他系统 Cookie: ${conflictingCookies.join(', ')}。建议配置独立域名或联系管理员`
      }
      return '⚠️ 会话无效，可能是 Cookie 配置问题或会话过期'
    }

    if (conflictingCookies.length > 0) {
      return `⚠️ 检测到其他系统 Cookie: ${conflictingCookies.join(', ')}，建议配置独立域名避免潜在冲突`
    }

    return '✅ 一切正常'
  }
}

// 在开发环境下自动暴露到全局
if (import.meta.env.DEV) {
  (window as any).sessionDiagnostic = sessionDiagnostic
}
