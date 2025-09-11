import { Request, Response } from 'express';
import { MiddlewareService } from '../services/MiddlewareService';
import { TemplateFileService } from '../services/TemplateFileService';
import { AuthUtils } from '../utils/AuthUtils';

export class MiddlewareController {
  private middlewareService: MiddlewareService;
  private templateFileService: TemplateFileService;

  constructor() {
    this.middlewareService = new MiddlewareService();
    this.templateFileService = new TemplateFileService();
  }

  // 获取模板列表
  getTemplates = async (req: Request, res: Response) => {
    try {
      const { workspace } = req.params;
      const templates = await this.middlewareService.getTemplates(workspace);
      res.json(templates);
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
      const { workspace, templateName } = req.params;
      const template = await this.middlewareService.getTemplate(workspace, templateName);
      res.json(template);
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
      const { workspace, templateName } = req.params;
      const form = await this.middlewareService.getTemplateForm(workspace, templateName);
      res.json({ form });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || '模板表单不存在'
      });
    }
  };

  // 验证配置参数
  validateConfig = async (req: Request, res: Response) => {
    try {
      const { workspace } = req.params;
      const config = req.body;
      const validation = await this.middlewareService.validateConfig(workspace, config);
      res.json(validation);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '配置验证失败'
      });
    }
  };

  // 预览生成的配置
  previewConfig = async (req: Request, res: Response) => {
    try {
      const { workspace } = req.params;
      const config = req.body;
      const preview = await this.middlewareService.previewConfig(workspace, config);
      res.json(preview);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '配置预览失败'
      });
    }
  };

  // 预估部署成本
  estimateCost = async (req: Request, res: Response) => {
    try {
      const { workspace } = req.params;
      const config = req.body;
      const cost = await this.middlewareService.estimateCost(workspace, config);
      res.json(cost);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '成本预估失败'
      });
    }
  };

  // 执行部署
  deploy = async (req: Request, res: Response) => {
    try {
      const { workspace } = req.params;
      const config = req.body;
      const deployment = await this.middlewareService.deploy(workspace, config);
      res.json(deployment);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '部署失败'
      });
    }
  };

  // 获取部署状态
  getDeploymentStatus = async (req: Request, res: Response) => {
    try {
      const { workspace, deploymentId } = req.params;
      const status = await this.middlewareService.getDeploymentStatus(workspace, deploymentId);
      res.json(status);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || '部署不存在'
      });
    }
  };

  // 获取部署日志
  getDeploymentLogs = async (req: Request, res: Response) => {
    try {
      const { workspace, deploymentId } = req.params;
      const logs = await this.middlewareService.getDeploymentLogs(workspace, deploymentId);
      res.json(logs);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || '部署日志不存在'
      });
    }
  };

  // 获取实例列表
  getInstances = async (req: Request, res: Response) => {
    try {
      const { workspace } = req.params;
      const instances = await this.middlewareService.getInstances(workspace);
      res.json(instances);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取实例列表失败'
      });
    }
  };

  // 获取实例详情
  getInstance = async (req: Request, res: Response) => {
    try {
      const { workspace, instanceName } = req.params;
      const instance = await this.middlewareService.getInstance(workspace, instanceName);
      res.json(instance);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || '实例不存在'
      });
    }
  };

  // 删除实例
  deleteInstance = async (req: Request, res: Response) => {
    try {
      const { workspace, instanceName } = req.params;
      await this.middlewareService.deleteInstance(workspace, instanceName);
      res.json({
        success: true,
        message: '实例删除成功'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '删除实例失败'
      });
    }
  };

  // 扩缩容实例
  scaleInstance = async (req: Request, res: Response) => {
    try {
      const { workspace, instanceName } = req.params;
      const { replicas } = req.body;
      await this.middlewareService.scaleInstance(workspace, instanceName, replicas);
      res.json({
        success: true,
        message: '扩缩容成功'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '扩缩容失败'
      });
    }
  };

  // 重启实例
  restartInstance = async (req: Request, res: Response) => {
    try {
      const { workspace, instanceName } = req.params;
      await this.middlewareService.restartInstance(workspace, instanceName);
      res.json({
        success: true,
        message: '重启成功'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '重启失败'
      });
    }
  };

  // 获取实例日志
  getInstanceLogs = async (req: Request, res: Response) => {
    try {
      const { workspace, instanceName } = req.params;
      const { lines } = req.query;
      const logs = await this.middlewareService.getInstanceLogs(
        workspace,
        instanceName,
        lines ? parseInt(lines as string) : undefined
      );
      res.json(logs);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || '获取日志失败'
      });
    }
  };

  // 获取工作空间模板文件列表
  getTemplateFiles = async (req: Request, res: Response) => {
    try {
      const { workspace, templateName } = req.params;
      const sessionId = AuthUtils.getSessionId(req, 'MiddlewareController');

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录或会话已过期'
        });
        return;
      }

      const files = await this.templateFileService.getTemplateFiles(sessionId, workspace, templateName);
      res.json({
        success: true,
        data: files
      });
      return;
    } catch (error: any) {
      console.error('获取工作空间模板文件列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取模板文件列表失败'
      });
      return;
    }
  };

  // 获取工作空间模板文件内容
  getTemplateFileContent = async (req: Request, res: Response) => {
    try {
      const { workspace, templateName, fileName } = req.params;
      const sessionId = AuthUtils.getSessionId(req, 'MiddlewareController');

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录或会话已过期'
        });
        return;
      }

      const content = await this.templateFileService.getTemplateFileContent(sessionId, workspace, templateName, fileName);
      res.json({
        success: true,
        data: {
          fileName,
          content
        }
      });
      return;
    } catch (error: any) {
      console.error('获取工作空间模板文件内容失败:', error);
      res.status(404).json({
        success: false,
        message: error.message || '模板文件不存在'
      });
      return;
    }
  };

  // 更新工作空间模板文件内容
  updateTemplateFileContent = async (req: Request, res: Response) => {
    try {
      const { workspace, templateName, fileName } = req.params;
      const { content } = req.body;
      const sessionId = AuthUtils.getSessionId(req, 'MiddlewareController');

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

      await this.templateFileService.updateTemplateFileContent(sessionId, workspace, templateName, fileName, content);
      res.json({
        success: true,
        message: '文件更新成功'
      });
      return;
    } catch (error: any) {
      console.error('更新工作空间模板文件内容失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新文件失败'
      });
      return;
    }
  };
}
