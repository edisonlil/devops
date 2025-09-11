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

    Object.keys(allCookies).forEach(name => {
      // 查找可能的 DevOps 会话 Cookie
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

  // 清理冲突的 Cookie
  clearConflictingCookies() {
    const allCookies = this.parseCookies()
    const conflictingCookies = ['XXL_JOB_LOGIN_IDENTITY']

    conflictingCookies.forEach(cookieName => {
      if (allCookies[cookieName]) {
        // 设置过期时间为过去的时间来删除 Cookie
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        console.log(`🗑️ 已清理冲突的 Cookie: ${cookieName}`)
      }
    })
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
    
    // 2. API 连通性检查
    const apiConnected = await this.checkApiConnectivity()
    
    // 3. 会话状态检查
    const sessionValid = await this.checkSessionStatus()
    
    const result = {
      apiConnected,
      sessionValid,
      recommendation: this.getRecommendation(apiConnected, sessionValid)
    }
    
    console.log('📊 诊断结果:', result)
    console.groupEnd()
    
    return result
  },

  // 获取建议
  getRecommendation(apiConnected: boolean, sessionValid: boolean) {
    if (!apiConnected) {
      return '❌ API 无法连接，请检查网络配置和后端服务状态'
    }
    
    if (!sessionValid) {
      return '⚠️ 会话无效，可能是 Cookie 配置问题或会话过期'
    }
    
    return '✅ 一切正常'
  }
}

// 在开发环境下自动暴露到全局
if (import.meta.env.DEV) {
  (window as any).sessionDiagnostic = sessionDiagnostic
}
