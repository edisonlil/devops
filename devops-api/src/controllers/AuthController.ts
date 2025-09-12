import { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import { AuthUtils } from '../utils/AuthUtils';
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
      const sessionId = AuthUtils.getSessionId(req, 'AuthController');
      
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
      const sessionId = AuthUtils.getSessionId(req, 'AuthController');
      
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
      console.log('🔍 检查会话请求 - 请求头信息:', {
        authorization: req.headers.authorization ? '***Bearer Token***' : 'none',
        sessionId: req.headers['x-devops-session-id'] || 'none',
        cookie: req.headers.cookie ? '***Cookie***' : 'none'
      });

      const sessionId = AuthUtils.getSessionId(req, 'AuthController');

      console.log('🔍 AuthUtils.getSessionId 结果:', sessionId);

      if (!sessionId) {
        console.log('❌ checkSession: 未找到有效的 sessionId');
        res.json({ valid: false });
        return;
      }

      const valid = authService.isSessionValid(sessionId);
      console.log('🔍 authService.isSessionValid 结果:', valid);

      res.json({ valid });
      return;
    } catch (error: any) {
      console.error('❌ 检查会话失败:', error);
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