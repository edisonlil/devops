import { Request } from 'express';
import crypto from 'crypto';

/**
 * 认证工具类
 * 提供统一的 Token Header 和 Cookie 认证支持
 */
export class AuthUtils {
  /**
   * 验证认证 Token
   */
  static verifyAuthToken(token: string): { sessionId: string; timestamp: number } | null {
    try {
      const [payloadBase64, signature] = token.split('.');
      if (!payloadBase64 || !signature) return null;

      const payload = Buffer.from(payloadBase64, 'base64').toString();
      const [sessionId, timestamp, random] = payload.split(':');
      
      if (!sessionId || !timestamp || !random) return null;

      // 验证签名
      const secret = process.env.SESSION_SECRET || 'devops-platform-secret-key';
      const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      
      if (signature !== expectedSignature) return null;

      // 检查 Token 是否过期（30分钟）
      const tokenAge = Date.now() - parseInt(timestamp);
      const maxAge = 30 * 60 * 1000; // 30分钟
      
      if (tokenAge > maxAge) return null;

      return { sessionId, timestamp: parseInt(timestamp) };
    } catch (error) {
      console.error('Token 验证失败:', error);
      return null;
    }
  }

  /**
   * 获取会话ID（支持 Token Header 和 Cookie 认证）
   * @param req Express Request 对象
   * @param controllerName 控制器名称（用于日志）
   * @returns 会话ID 或 null
   */
  static getSessionId(req: Request, controllerName: string = 'Unknown'): string | null {
    // 1. 优先从 Authorization 头中获取 Token（推荐方式）
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const tokenData = this.verifyAuthToken(token);
      if (tokenData) {
        console.log(`✅ 使用 Token Header 认证 (${controllerName}):`, { sessionId: tokenData.sessionId });
        return tokenData.sessionId;
      }
    }

    // 2. 从自定义头中获取（备用方式）
    const headerSessionId = req.headers['x-devops-session-id'] as string;
    if (headerSessionId) {
      console.log(`⚠️ 使用自定义 Header 认证 (${controllerName}):`, { sessionId: headerSessionId });
      return headerSessionId;
    }

    // 3. 从 session 中获取（兼容模式，不推荐）
    const sessionId = (req.session as any).sessionId;
    if (sessionId) {
      console.log(`⚠️ 使用 Cookie Session 认证 (${controllerName}):`, { sessionId: sessionId });
      return sessionId;
    }

    console.log(`❌ ${controllerName}: 未找到有效的认证信息`);
    return null;
  }

  /**
   * 检查认证并返回会话ID
   * @param req Express Request 对象
   * @param controllerName 控制器名称（用于日志）
   * @returns 会话ID 或抛出错误
   */
  static requireAuth(req: Request, controllerName: string = 'Unknown'): string {
    const sessionId = this.getSessionId(req, controllerName);
    if (!sessionId) {
      throw new Error('会话无效');
    }
    return sessionId;
  }

  /**
   * 生成认证 Token
   */
  static generateAuthToken(sessionId: string): string {
    // 使用 sessionId + 时间戳 + 随机数生成 Token
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(16).toString('hex');
    const payload = `${sessionId}:${timestamp}:${random}`;

    // 使用 HMAC 签名
    const secret = process.env.SESSION_SECRET || 'devops-platform-secret-key';
    const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    return `${Buffer.from(payload).toString('base64')}.${token}`;
  }
}
