import { Request, Response } from 'express';
import { MiddlewareService } from '../services/MiddlewareService';
import { TemplateFileService } from '../services/TemplateFileService';
import { authService } from '../services/AuthService';
import { AuthUtils } from '../utils/AuthUtils';

export class TemplateController {
  private middlewareService: MiddlewareService;
  private templateFileService: TemplateFileService;

  constructor() {
    this.middlewareService = new MiddlewareService();
    this.templateFileService = new TemplateFileService();
  }

  // 获取全局模板列表
  getGlobalTemplates = async (req: Request, res: Response) => {
    try {
      const templates = await this.middlewareService.getTemplates('global');
      res.json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取模板列表失败'
      });
    }
  };

  // 获取模板详情
  getTemplate = async (req: Request, res: Response) => {
    try {
      const { templateName } = req.params;
      const template = await this.middlewareService.getTemplate('global', templateName);
      res.json({
        success: true,
        data: template
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || '模板不存在'
      });
    }
  };

  // 获取模板表单定义
  getTemplateForm = async (req: Request, res: Response) => {
    try {
      const { templateName } = req.params;
      const form = await this.middlewareService.getTemplateForm('global', templateName);
      res.json({
        success: true,
        data: form
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || '模板表单不存在'
      });
    }
  };

  // 获取模板文件列表
  getTemplateFiles = async (req: Request, res: Response) => {
    try {
      const { templateName } = req.params;
      const sessionId = AuthUtils.getSessionId(req, 'TemplateController');

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录或会话已过期'
        });
        return;
      }

      const files = await this.templateFileService.getTemplateFiles(sessionId, 'global', templateName);
      res.json({
        success: true,
        data: files
      });
      return;
    } catch (error: any) {
      console.error('获取模板文件列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取模板文件列表失败'
      });
      return;
    }
  };

  // 获取模板文件内容
  getTemplateFileContent = async (req: Request, res: Response) => {
    try {
      const { templateName, fileName } = req.params;
      const sessionId = AuthUtils.getSessionId(req, 'TemplateController');

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录或会话已过期'
        });
        return;
      }

      const content = await this.templateFileService.getTemplateFileContent(sessionId, 'global', templateName, fileName);
      res.json({
        success: true,
        data: {
          fileName,
          content
        }
      });
      return;
    } catch (error: any) {
      console.error('获取模板文件内容失败:', error);
      res.status(404).json({
        success: false,
        message: error.message || '模板文件不存在'
      });
      return;
    }
  };

  // 获取应用模板文件列表（先查找全局模板，再查找工作空间模板）
  getAppTemplateFiles = async (req: Request, res: Response) => {
    try {
      const { templateName } = req.params;
      const sessionId = AuthUtils.getSessionId(req, 'TemplateController');

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录或会话已过期'
        });
        return;
      }

      let files;
      let foundSource = '';

      try {
        // 先尝试查找工作空间模板（优先级更高）
        files = await this.templateFileService.getTemplateFiles(sessionId, 'default', templateName, 'app');
        foundSource = 'workspace';
        console.log(`找到工作空间应用模板: ${templateName}`);
      } catch (workspaceError) {
        console.log(`工作空间应用模板不存在: ${templateName}，尝试查找全局模板`);

        // 如果工作空间模板不存在，尝试查找全局模板
        try {
          files = await this.templateFileService.getTemplateFiles(sessionId, 'global', templateName, 'app');
          foundSource = 'global';
          console.log(`找到全局应用模板: ${templateName}`);
        } catch (globalError) {
          console.error(`全局应用模板也不存在: ${templateName}`);
          throw new Error(`模板不存在: ${templateName}，已在工作空间和全局中查找`);
        }
      }

      res.json({
        success: true,
        data: files,
        meta: {
          source: foundSource,
          templateName
        }
      });
      return;
    } catch (error: any) {
      console.error('获取应用模板文件列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取模板文件列表失败'
      });
      return;
    }
  };

  // 获取应用模板文件内容（先查找全局模板，再查找工作空间模板）
  getAppTemplateFileContent = async (req: Request, res: Response) => {
    try {
      const { templateName, fileName } = req.params;
      const sessionId = AuthUtils.getSessionId(req, 'TemplateController');

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录或会话已过期'
        });
        return;
      }

      let content;
      let foundSource = '';

      try {
        // 先尝试查找工作空间模板（优先级更高）
        content = await this.templateFileService.getTemplateFileContent(sessionId, 'default', templateName, fileName, 'app');
        foundSource = 'workspace';
        console.log(`找到工作空间应用模板文件: ${templateName}/${fileName}`);
      } catch (workspaceError) {
        console.log(`工作空间应用模板文件不存在: ${templateName}/${fileName}，尝试查找全局模板`);

        // 如果工作空间模板不存在，尝试查找全局模板
        try {
          content = await this.templateFileService.getTemplateFileContent(sessionId, 'global', templateName, fileName, 'app');
          foundSource = 'global';
          console.log(`找到全局应用模板文件: ${templateName}/${fileName}`);
        } catch (globalError) {
          console.error(`全局应用模板文件也不存在: ${templateName}/${fileName}`);
          throw new Error(`模板文件不存在: ${templateName}/${fileName}，已在工作空间和全局中查找`);
        }
      }

      res.json({
        success: true,
        data: {
          fileName,
          content
        },
        meta: {
          source: foundSource,
          templateName
        }
      });
      return;
    } catch (error: any) {
      console.error('获取应用模板文件内容失败:', error);
      res.status(404).json({
        success: false,
        message: error.message || '模板文件不存在'
      });
      return;
    }
  };

  // 调试：检查远程模板目录结构
  debugRemoteTemplates = async (req: Request, res: Response) => {
    try {
      const sessionId = AuthUtils.getSessionId(req, 'TemplateController');

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录或会话已过期'
        });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({
          success: false,
          message: '会话不存在'
        });
        return;
      }

      // 检查各种可能的模板路径
      const pathsToCheck = [
        '/root/devops',
        '/root/devops/templates',
        '/root/devops/templates/k8s',
        '/root/devops/templates/k8s/app',
        '/root/devops/templates/k8s/app/spring-boot',
        '/root/devops/templates/k8s/app/nginx',
        '/root/devops/templates/k8s/middleware',
        '/root/devops/templates/k8s/middleware/redis-standalone',
        '/root/devops/workspace',
        '~/devops',
        '~/devops/templates',
        '~/devops/templates/k8s',
        '~/devops/templates/k8s/app'
      ];

      const results: any = {};

      for (const path of pathsToCheck) {
        try {
          const result = await authService.executeCommand(sessionId, `ls -la "${path}" 2>/dev/null || echo "NOT_EXISTS"`);
          results[path] = {
            exists: !result.stdout.includes('NOT_EXISTS'),
            content: result.stdout.trim()
          };
        } catch (error: any) {
          results[path] = { error: error.message };
        }
      }

      res.json({
        success: true,
        data: {
          session: {
            host: session.host,
            username: session.username
          },
          paths: results
        }
      });
      return;
    } catch (error: any) {
      console.error('调试远程模板目录失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
      return;
    }
  };

  // 更新应用模板文件内容（仅限工作空间模板）
  updateAppTemplateFileContent = async (req: Request, res: Response) => {
    try {
      const { templateName, fileName } = req.params;
      const { content } = req.body;
      const sessionId = AuthUtils.getSessionId(req, 'TemplateController');

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录或会话已过期'
        });
        return;
      }

      if (!content && content !== '') {
        res.status(400).json({
          success: false,
          message: '文件内容不能为空'
        });
        return;
      }

      await this.templateFileService.updateTemplateFileContent(sessionId, 'global', templateName, fileName, content, 'app');
      res.json({
        success: true,
        message: '文件更新成功'
      });
      return;
    } catch (error: any) {
      console.error('更新应用模板文件内容失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新文件失败'
      });
      return;
    }
  };

  // 获取工作空间应用模板文件列表（先查找工作空间模板，再查找全局模板）
  getWorkspaceAppTemplateFiles = async (req: Request, res: Response) => {
    try {
      const { workspace, templateName } = req.params;
      const sessionId = AuthUtils.getSessionId(req, 'TemplateController');

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录或会话已过期'
        });
        return;
      }

      let files;
      let foundSource = '';

      try {
        // 先尝试查找工作空间模板（优先级更高）
        files = await this.templateFileService.getTemplateFiles(sessionId, workspace, templateName, 'app');
        foundSource = 'workspace';
        console.log(`找到工作空间应用模板: ${workspace}/${templateName}`);
      } catch (workspaceError) {
        console.log(`工作空间应用模板不存在: ${workspace}/${templateName}，尝试查找全局模板`);

        // 如果工作空间模板不存在，尝试查找全局模板
        try {
          files = await this.templateFileService.getTemplateFiles(sessionId, 'global', templateName, 'app');
          foundSource = 'global';
          console.log(`找到全局应用模板: ${templateName}`);
        } catch (globalError) {
          console.error(`全局应用模板也不存在: ${templateName}`);
          throw new Error(`模板不存在: ${templateName}，已在工作空间(${workspace})和全局中查找`);
        }
      }

      res.json({
        success: true,
        data: files,
        meta: {
          source: foundSource,
          workspace,
          templateName
        }
      });
      return;
    } catch (error: any) {
      console.error('获取工作空间应用模板文件列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取文件列表失败'
      });
      return;
    }
  };

  // 获取工作空间应用模板文件内容（先查找工作空间模板，再查找全局模板）
  getWorkspaceAppTemplateFileContent = async (req: Request, res: Response) => {
    try {
      const { workspace, templateName, fileName } = req.params;
      const sessionId = AuthUtils.getSessionId(req, 'TemplateController');

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录或会话已过期'
        });
        return;
      }

      let content;
      let foundSource = '';

      try {
        // 先尝试查找工作空间模板（优先级更高）
        content = await this.templateFileService.getTemplateFileContent(sessionId, workspace, templateName, fileName, 'app');
        foundSource = 'workspace';
        console.log(`找到工作空间应用模板文件: ${workspace}/${templateName}/${fileName}`);
      } catch (workspaceError) {
        console.log(`工作空间应用模板文件不存在: ${workspace}/${templateName}/${fileName}，尝试查找全局模板`);

        // 如果工作空间模板不存在，尝试查找全局模板
        try {
          content = await this.templateFileService.getTemplateFileContent(sessionId, 'global', templateName, fileName, 'app');
          foundSource = 'global';
          console.log(`找到全局应用模板文件: ${templateName}/${fileName}`);
        } catch (globalError) {
          console.error(`全局应用模板文件也不存在: ${templateName}/${fileName}`);
          throw new Error(`模板文件不存在: ${templateName}/${fileName}，已在工作空间(${workspace})和全局中查找`);
        }
      }

      res.json({
        success: true,
        data: {
          fileName,
          content
        },
        meta: {
          source: foundSource,
          workspace,
          templateName
        }
      });
      return;
    } catch (error: any) {
      console.error('获取工作空间应用模板文件内容失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取文件内容失败'
      });
      return;
    }
  };

  // 更新工作空间应用模板文件内容
  updateWorkspaceAppTemplateFileContent = async (req: Request, res: Response) => {
    try {
      const { workspace, templateName, fileName } = req.params;
      const { content } = req.body;
      const sessionId = AuthUtils.getSessionId(req, 'TemplateController');

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录或会话已过期'
        });
        return;
      }

      if (!content && content !== '') {
        res.status(400).json({
          success: false,
          message: '文件内容不能为空'
        });
        return;
      }

      await this.templateFileService.updateTemplateFileContent(sessionId, workspace, templateName, fileName, content, 'app');
      res.json({
        success: true,
        message: '文件更新成功'
      });
      return;
    } catch (error: any) {
      console.error('更新工作空间应用模板文件内容失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新文件失败'
      });
      return;
    }
  };
}
