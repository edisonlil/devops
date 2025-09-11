import { Request, Response } from 'express';
import { applicationService } from '../services/ApplicationService';
import { ApplicationOperation, OperationParams } from '../types/application';
import { AuthUtils } from '../utils/AuthUtils';

/**
 * 应用管理控制器
 * 提供应用管理的REST API接口
 */
class ApplicationController {

  /**
   * 获取工作空间的应用列表
   * GET /api/workspaces/:workspace/applications
   */
  getApplications = async (req: Request, res: Response) => {
    try {
      const sessionId = AuthUtils.getSessionId(req, 'ApplicationController');
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '会话无效'
        });
        return;
      }

      const { workspace } = req.params;

      if (!workspace) {
        res.status(400).json({
          success: false,
          message: '工作空间参数不能为空'
        });
        return;
      }

      console.log(`获取工作空间应用列表: ${workspace}`);

      const applications = await applicationService.getApplications(workspace, sessionId);

      res.json({
        success: true,
        data: {
          workspace,
          platform: applications[0]?.platform || 'UNKNOWN',
          applications,
          total: applications.length
        }
      });
      return;
    } catch (error: any) {
      console.error('获取应用列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取应用列表失败'
      });
      return;
    }
  };

  /**
   * 获取单个应用详情
   * GET /api/workspaces/:workspace/applications/:appName
   */
  getApplication = async (req: Request, res: Response) => {
    try {
      const sessionId = AuthUtils.getSessionId(req, 'ApplicationController');
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '会话无效'
        });
        return;
      }

      const { workspace, appName } = req.params;

      if (!workspace || !appName) {
        res.status(400).json({
          success: false,
          message: '工作空间和应用名称不能为空'
        });
        return;
      }

      console.log(`获取应用详情: ${workspace}/${appName}`);

      const application = await applicationService.getApplication(workspace, appName, sessionId);

      if (!application) {
        res.status(404).json({
          success: false,
          message: '应用不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: application
      });
      return;
    } catch (error: any) {
      console.error('获取应用详情失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取应用详情失败'
      });
      return;
    }
  };

  /**
   * 执行应用操作
   * POST /api/workspaces/:workspace/applications/:appName/actions
   */
  executeAction = async (req: Request, res: Response) => {
    try {
      const sessionId = AuthUtils.getSessionId(req, 'ApplicationController');
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '会话无效'
        });
        return;
      }

      const { workspace, appName } = req.params;
      const { action, params = {} } = req.body;

      if (!workspace || !appName || !action) {
        res.status(400).json({
          success: false,
          message: '工作空间、应用名称和操作类型不能为空'
        });
        return;
      }

      // 验证操作类型
      const validActions: ApplicationOperation[] = ['start', 'stop', 'restart', 'scale', 'logs', 'redeploy'];
      if (!validActions.includes(action)) {
        res.status(400).json({
          success: false,
          message: `不支持的操作类型: ${action}`
        });
        return;
      }

      console.log(`执行应用操作: ${workspace}/${appName} - ${action}`, params);

      const result = await applicationService.executeOperation(
        workspace,
        appName,
        action,
        params as OperationParams,
        sessionId
      );

      res.json({
        success: result,
        message: result ? '操作执行成功' : '操作执行失败',
        data: {
          workspace,
          appName,
          action,
          params
        }
      });
      return;
    } catch (error: any) {
      console.error('执行应用操作失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '执行应用操作失败'
      });
      return;
    }
  };

  /**
   * 获取应用日志
   * GET /api/workspaces/:workspace/applications/:appName/logs
   */
  getApplicationLogs = async (req: Request, res: Response) => {
    try {
      const sessionId = AuthUtils.getSessionId(req, 'ApplicationController');
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '会话无效'
        });
        return;
      }

      const { workspace, appName } = req.params;
      const { lines = 100, follow = false } = req.query;

      if (!workspace || !appName) {
        res.status(400).json({
          success: false,
          message: '工作空间和应用名称不能为空'
        });
        return;
      }

      console.log(`获取应用日志: ${workspace}/${appName}`);

      const { container } = req.query;

      const logs = await applicationService.getApplicationLogs(
        workspace,
        appName,
        sessionId,
        parseInt(lines as string) || 100,
        follow === 'true',
        container as string
      );

      res.json({
        success: true,
        data: {
          workspace,
          appName,
          logs,
          lines: parseInt(lines as string) || 100
        }
      });
      return;
    } catch (error: any) {
      console.error('获取应用日志失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取应用日志失败'
      });
      return;
    }
  };

  /**
   * 刷新应用状态
   * POST /api/workspaces/:workspace/applications/:appName/refresh
   */
  refreshStatus = async (req: Request, res: Response) => {
    try {
      const sessionId = AuthUtils.getSessionId(req, 'ApplicationController');
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '会话无效'
        });
        return;
      }

      const { workspace, appName } = req.params;

      if (!workspace || !appName) {
        res.status(400).json({
          success: false,
          message: '工作空间和应用名称不能为空'
        });
        return;
      }

      console.log(`刷新应用状态: ${workspace}/${appName}`);

      const status = await applicationService.refreshApplicationStatus(workspace, appName, sessionId);

      res.json({
        success: true,
        data: {
          workspace,
          appName,
          ...status
        }
      });
      return;
    } catch (error: any) {
      console.error('刷新应用状态失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '刷新应用状态失败'
      });
      return;
    }
  };

  /**
   * 获取支持的平台列表
   * GET /api/applications/platforms
   */
  getSupportedPlatforms = async (req: Request, res: Response) => {
    try {
      const platforms = applicationService.getSupportedPlatforms();

      res.json({
        success: true,
        data: {
          platforms,
          total: platforms.length
        }
      });
      return;
    } catch (error: any) {
      console.error('获取支持的平台列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取支持的平台列表失败'
      });
      return;
    }
  };
  /**
   * 获取应用配置文件
   * GET /api/workspaces/:workspace/applications/:appName/config
   */
  getApplicationConfig = async (req: Request, res: Response) => {
    try {
      const sessionId = AuthUtils.getSessionId(req, 'ApplicationController');
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '会话无效'
        });
        return;
      }

      const { workspace, appName } = req.params;

      if (!workspace || !appName) {
        res.status(400).json({
          success: false,
          message: '工作空间和应用名称不能为空'
        });
        return;
      }

      const config = await applicationService.getApplicationConfig(workspace, appName, sessionId);

      console.log('返回的配置数据:', JSON.stringify(config, null, 2));

      res.json({
        success: true,
        data: config
      });
    } catch (error: any) {
      console.error('获取应用配置失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取应用配置失败'
      });
    }
  };

  /**
   * 保存应用配置文件
   * PUT /api/workspaces/:workspace/applications/:appName/config
   */
  saveApplicationConfig = async (req: Request, res: Response) => {
    try {
      const sessionId = AuthUtils.getSessionId(req, 'ApplicationController');
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '会话无效'
        });
        return;
      }

      const { workspace, appName } = req.params;
      const { content, autoRedeploy = false } = req.body;

      if (!workspace || !appName || !content) {
        res.status(400).json({
          success: false,
          message: '工作空间、应用名称和配置内容不能为空'
        });
        return;
      }

      const result = await applicationService.saveApplicationConfig(
        workspace,
        appName,
        content,
        autoRedeploy,
        sessionId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('保存应用配置失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '保存应用配置失败'
      });
    }
  };

  /**
   * 测试连接
   * GET /api/applications/test
   */
  testConnection = async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: '应用管理服务连接正常',
      timestamp: new Date().toISOString()
    });
  };
}

export const applicationController = new ApplicationController();
