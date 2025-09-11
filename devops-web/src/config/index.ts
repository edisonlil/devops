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
  
  // Cookie 配置
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
