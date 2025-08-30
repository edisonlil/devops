import { Request, Response } from 'express';
import { MiddlewareService } from '../services/MiddlewareService';

export class TemplateController {
  private middlewareService: MiddlewareService;

  constructor() {
    this.middlewareService = new MiddlewareService();
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
}
