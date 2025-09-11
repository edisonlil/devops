import { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import Joi from 'joi';
import crypto from 'crypto';

// 验证SSH登录请求的schema
const sshLoginSchema = Joi.object({
  host: Joi.string().required().messages({
    'any.required': '主机地址不能为空',
    'string.empty': '主机地址不能为空'
  }),
  username: Joi.string().required().messages({
    'any.required': '用户名不能为空',
    'string.empty': '用户名不能为空'
  }),
  password: Joi.string().required().messages({
    'any.required': '密码不能为空',
    'string.empty': '密码不能为空'
  })
});

export class AuthController {
  /**
   * 生成认证 Token
   */
  private generateAuthToken(sessionId: string): string {
    // 使用 sessionId + 时间戳 + 随机数生成 Token
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(16).toString('hex');
    const payload = `${sessionId}:${timestamp}:${random}`;

    // 使用 HMAC 签名
    const secret = process.env.SESSION_SECRET || 'devops-platform-secret-key';
    const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    return `${Buffer.from(payload).toString('base64')}.${token}`;
  }

  /**
   * 验证认证 Token
   */
  private verifyAuthToken(token: string): { sessionId: string; timestamp: number } | null {
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
   * 获取会话ID（优先使用 Token Header，兼容其他方式）
   */
  private getSessionId(req: Request): string | null {
    // 1. 优先从 Authorization 头中获取 Token（推荐方式）
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const tokenData = this.verifyAuthToken(token);
      if (tokenData) {
        console.log('✅ 使用 Token Header 认证:', { sessionId: tokenData.sessionId });
        return tokenData.sessionId;
      }
    }

    // 2. 从自定义头中获取（备用方式）
    const headerSessionId = req.headers['x-devops-session-id'] as string;
    if (headerSessionId) {
      console.log('⚠️ 使用自定义 Header 认证:', { sessionId: headerSessionId });
      return headerSessionId;
    }

    // 3. 从 session 中获取（兼容模式，不推荐）
    const sessionId = (req.session as any).sessionId;
    if (sessionId) {
      console.log('⚠️ 使用 Cookie Session 认证:', { sessionId: sessionId });
      return sessionId;
    }

    console.log('❌ 未找到有效的认证信息');
    return null;
  }

  /**
   * SSH登录
   */
  async sshLogin(req: Request, res: Response) {
    try {
      // 验证请求参数
      const { error, value } = sshLoginSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: error.details[0].message
        });
        return;
      }

      const { host, username, password } = value;
      
      // 执行SSH登录
      const result = await authService.loginWithSSH({ host, username, password });
      
      // 将sessionId存储到session中
      (req.session as any).sessionId = result.sessionId;
      (req.session as any).host = host;
      (req.session as any).username = username;

      // 生成认证 Token
      const authToken = this.generateAuthToken(result.sessionId);

      // 设置响应头，告知前端会话ID（用于调试）
      res.setHeader('X-DevOps-Session-ID', result.sessionId);
      res.setHeader('X-DevOps-Auth-Token', authToken);

      console.log('✅ SSH登录成功 (Token Header 模式):', {
        sessionId: result.sessionId,
        host,
        username,
        hasToken: !!authToken,
        tokenLength: authToken.length
      });

      res.json({
        success: true,
        message: 'SSH连接成功 - Token 已生成',
        data: {
          sessionId: result.sessionId,
          token: authToken,
          defaultWorkspace: result.defaultWorkspace,
          availableWorkspaces: result.availableWorkspaces,
          // 明确告知前端使用 Header 方式
          authMethod: 'token-header'
        }
      });
      return;
    } catch (error: any) {
      console.error('SSH登录失败:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'SSH连接失败'
      });
      return;
    }
  }

  /**
   * 登出
   */
  async logout(req: Request, res: Response) {
    try {
      const sessionId = this.getSessionId(req);
      
      if (sessionId) {
        authService.logout(sessionId);
      }
      
      // 清除session
      req.session.destroy((err) => {
        if (err) {
          console.error('清除session失败:', err);
        }
      });
      
      res.json({
        success: true,
        message: '已成功登出'
      });
      return;
    } catch (error: any) {
      console.error('登出失败:', error);
      res.status(500).json({
        success: false,
        message: '登出失败'
      });
      return;
    }
  }

  /**
   * 获取当前会话信息
   */
  async getSessionInfo(req: Request, res: Response) {
    try {
      const sessionId = this.getSessionId(req);
      
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录'
        });
        return;
      }
      
      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({
          success: false,
          message: '会话已过期'
        });
        return;
      }
      
      // 使用批量优化方法获取工作空间信息
      try {
        const workspaceInfo = await authService.getWorkspaceInfo(session);
        
        res.json({
          success: true,
          data: {
            host: session.host,
            username: session.username,
            connected: session.connected,
            connectedAt: session.connectedAt,
            defaultWorkspace: workspaceInfo.defaultWorkspace,
            availableWorkspaces: workspaceInfo.availableWorkspaces
          }
        });
        return;
      } catch (error) {
        // 如果获取工作空间信息失败，返回基本信息
        console.error('获取工作空间信息失败:', error);
        res.json({
          success: true,
          data: {
            host: session.host,
            username: session.username,
            connected: session.connected,
            connectedAt: session.connectedAt,
            availableWorkspaces: []
          }
        });
        return;
      }
    } catch (error: any) {
      console.error('获取会话信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取会话信息失败'
      });
      return;
    }
  }

  /**
   * 检查会话是否有效
   */
  async checkSession(req: Request, res: Response) {
    try {
      const sessionId = this.getSessionId(req);
      
      if (!sessionId) {
        res.json({ valid: false });
        return;
      }
      
      const valid = authService.isSessionValid(sessionId);
      res.json({ valid });
      return;
    } catch (error: any) {
      console.error('检查会话失败:', error);
      res.json({ valid: false });
      return;
    }
  }

  /**
   * 获取会话状态（管理员接口）
   */
  async getSessionsStatus(req: Request, res: Response) {
    try {
      const sessions = authService.getSessionsStatus();
      res.json({
        success: true,
        data: {
          sessions,
          count: sessions.length
        }
      });
      return;
    } catch (error: any) {
      console.error('获取会话状态失败:', error);
      res.status(500).json({
        success: false,
        message: '获取会话状态失败'
      });
      return;
    }
  }
}