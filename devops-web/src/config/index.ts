// 环境配置
export const config = {
  // API 基础路径
  apiBaseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  
  // 是否为生产环境
  isProduction: import.meta.env.PROD,
  
  // 会话配置
  session: {
    // 会话超时时间（毫秒）
    timeout: 30 * 60 * 1000, // 30分钟
    
    // 会话检查间隔（毫秒）
    checkInterval: 5 * 60 * 1000, // 5分钟
    
    // 是否启用自动刷新
    autoRefresh: true
  },
  
  // Token 认证配置（默认模式，完全基于 HTTP Header）
  auth: {
    // 认证方式：'token' | 'cookie'
    // token: 使用 HTTP Header 传递，避免 Cookie 冲突
    // cookie: 兼容模式，使用 Cookie 传递（不推荐）
    mode: 'token' as 'token' | 'cookie',

    // Token 存储配置
    storage: {
      // localStorage 键名（仅用于客户端存储）
      tokenKey: 'DEVOPS_AUTH_TOKEN',
      sessionKey: 'DEVOPS_SESSION_ID'
    },

    // Token 过期时间（毫秒）
    tokenExpiry: 30 * 60 * 1000, // 30分钟

    // HTTP 请求头名称（推荐方式）
    headers: {
      // 标准 Authorization 头
      authorization: 'Authorization',
      // 自定义会话 ID 头
      sessionId: 'X-DevOps-Session-ID'
    },

    // 安全配置
    security: {
      // 是否禁用 Cookie 传递（Token 模式下推荐为 true）
      disableCookies: true,
      // Token 签名算法
      algorithm: 'HS256'
    }
  },

  // Cookie 配置（保留用于兼容）
  cookie: {
    // DevOps 应用专用的 Cookie 名称
    sessionName: 'DEVOPS_SESSION_ID',
    authName: 'DEVOPS_AUTH_TOKEN',

    // Cookie 路径，避免与其他应用冲突
    path: '/',

    // 在容器环境下，确保 SameSite 设置正确
    sameSite: 'lax' as const,

    // 如果使用 HTTPS，设置为 true
    secure: import.meta.env.VITE_USE_HTTPS === 'true',

    // Cookie 域名（如果需要跨子域）
    domain: import.meta.env.VITE_COOKIE_DOMAIN || undefined,

    // Cookie 最大存活时间（秒）
    maxAge: 30 * 60 // 30分钟
  }
}

export default config
