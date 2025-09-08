import { Request, Response } from 'express';
import { AppTemplateService } from '../services/AppTemplateService';
import { authService } from '../services/AuthService';

export class AppTemplateController {
  private appTemplateService: AppTemplateService;

  constructor() {
    this.appTemplateService = new AppTemplateService();
  }

  // 获取全局app模板列表
  getGlobalAppTemplates = async (req: Request, res: Response) => {
    try {
      const sessionId = (req.session as any).sessionId;
      if (!sessionId) {
        res.status(401).json({ success: false, message: '请先进行SSH登录' });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({ success: false, message: '会话已过期，请重新登录' });
        return;
      }

      const templates = await this.appTemplateService.getGlobalAppTemplates(sessionId);
      res.json({
        success: true,
        data: {
          templates: {
            global: templates,
            workspace: []
          },
          categories: [...new Set(templates.map(t => t.category))],
          platforms: [...new Set(templates.map(t => t.platform).filter(Boolean))],
          defaults: {
            platform: 'kubernetes',
            replicas: 1,
            memory_limit: '512Mi',
            cpu_limit: '500m'
          }
        }
      });
      return;
    } catch (error: any) {
      console.error('Error getting global app templates:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取全局App模板列表失败'
      });
      return;
    }
  };

  // 获取工作空间app模板列表
  getWorkspaceAppTemplates = async (req: Request, res: Response) => {
    try {
      const sessionId = (req.session as any).sessionId;
      if (!sessionId) {
        res.status(401).json({ success: false, message: '请先进行SSH登录' });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({ success: false, message: '会话已过期，请重新登录' });
        return;
      }

      const { workspace } = req.params;
      if (!workspace) {
        res.status(400).json({ success: false, message: '工作空间参数不能为空' });
        return;
      }

      const templates = await this.appTemplateService.getWorkspaceAppTemplates(sessionId, workspace);
      res.json({
        success: true,
        data: {
          templates: {
            global: [],
            workspace: templates
          },
          categories: [...new Set(templates.map(t => t.category))],
          platforms: [...new Set(templates.map(t => t.platform).filter(Boolean))],
          defaults: {
            platform: 'kubernetes',
            replicas: 1,
            memory_limit: '512Mi',
            cpu_limit: '500m'
          }
        }
      });
      return;
    } catch (error: any) {
      console.error('Error getting workspace app templates:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取工作空间App模板列表失败'
      });
      return;
    }
  };

  // 获取所有app模板（全局 + 工作空间）
  getAllAppTemplates = async (req: Request, res: Response) => {
    try {
      const sessionId = (req.session as any).sessionId;
      if (!sessionId) {
        res.status(401).json({ success: false, message: '请先进行SSH登录' });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({ success: false, message: '会话已过期，请重新登录' });
        return;
      }

      const { workspace } = req.params;
      if (!workspace) {
        res.status(400).json({ success: false, message: '工作空间参数不能为空' });
        return;
      }

      const result = await this.appTemplateService.getAllAppTemplates(sessionId, workspace);
      res.json({
        success: true,
        data: result
      });
      return;
    } catch (error: any) {
      console.error('Error getting all app templates:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取App模板列表失败'
      });
      return;
    }
  };

  // 复制全局模板到工作空间（可重命名）
  copyGlobalTemplateToWorkspace = async (req: Request, res: Response) => {
    try {
      const sessionId = (req.session as any).sessionId;
      if (!sessionId) {
        res.status(401).json({ success: false, message: '请先进行SSH登录' });
        return;
      }

      const { workspace } = req.params as { workspace: string };
      const { sourceName, newName } = req.body as { sourceName: string; newName: string };

      if (!workspace || !sourceName || !newName) {
        res.status(400).json({ success: false, message: '参数不完整' });
        return;
      }

      const result = await this.appTemplateService.copyGlobalTemplateToWorkspace(sessionId, workspace, sourceName, newName);
      res.json({ success: true, data: result });
      return;
    } catch (error: any) {
      console.error('复制模板失败:', error);
      res.status(500).json({ success: false, message: error.message || '复制模板失败' });
      return;
    }
  };

  // 获取app模板详情
  getAppTemplate = async (req: Request, res: Response) => {
    try {
      const sessionId = (req.session as any).sessionId;
      if (!sessionId) {
        res.status(401).json({ success: false, message: '请先进行SSH登录' });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({ success: false, message: '会话已过期，请重新登录' });
        return;
      }

      const { templateName, workspace } = req.params;
      if (!templateName) {
        res.status(400).json({ success: false, message: '模板名称不能为空' });
        return;
      }

      const template = await this.appTemplateService.getAppTemplate(sessionId, templateName, workspace);
      res.json({
        success: true,
        data: template
      });
      return;
    } catch (error: any) {
      console.error('Error getting app template:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'App模板不存在'
      });
      return;
    }
  };

  // 获取app模板变量定义
  getAppTemplateVariables = async (req: Request, res: Response) => {
    try {
      const sessionId = (req.session as any).sessionId;
      if (!sessionId) {
        res.status(401).json({ success: false, message: '请先进行SSH登录' });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({ success: false, message: '会话已过期，请重新登录' });
        return;
      }

      const { templateName, workspace } = req.params;
      if (!templateName) {
        res.status(400).json({ success: false, message: '模板名称不能为空' });
        return;
      }

      const variables = await this.appTemplateService.getAppTemplateVariables(sessionId, templateName, workspace);
      res.json({
        success: true,
        data: variables
      });
      return;
    } catch (error: any) {
      console.error('Error getting app template variables:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'App模板变量定义不存在'
      });
      return;
    }
  };

  // 搜索app模板
  searchAppTemplates = async (req: Request, res: Response) => {
    try {
      const sessionId = (req.session as any).sessionId;
      if (!sessionId) {
        res.status(401).json({ success: false, message: '请先进行SSH登录' });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({ success: false, message: '会话已过期，请重新登录' });
        return;
      }

      const { workspace } = req.params;
      const { q: query } = req.query;

      if (!workspace) {
        res.status(400).json({ success: false, message: '工作空间参数不能为空' });
        return;
      }

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          message: '搜索关键词不能为空'
        });
        return;
      }

      const result = await this.appTemplateService.getAllAppTemplates(sessionId, workspace);
      const allTemplates = [...result.templates.global, ...result.templates.workspace];

      // 搜索过滤
      const filteredTemplates = allTemplates.filter(template => {
        const searchText = query.toLowerCase();
        return (
          template.name.toLowerCase().includes(searchText) ||
          (template.displayName || '').toLowerCase().includes(searchText) ||
          (template.description || '').toLowerCase().includes(searchText) ||
          (template.tags || []).some(tag => tag.toLowerCase().includes(searchText))
        );
      });

      res.json({
        success: true,
        data: {
          templates: {
            global: filteredTemplates.filter(t => t.source === 'global'),
            workspace: filteredTemplates.filter(t => t.source === 'workspace')
          },
          categories: result.categories,
          platforms: result.platforms,
          defaults: result.defaults
        }
      });
      return;
    } catch (error: any) {
      console.error('Error searching app templates:', error);
      res.status(500).json({
        success: false,
        message: error.message || '搜索App模板失败'
      });
      return;
    }
  };

  // 按分类获取app模板
  getAppTemplatesByCategory = async (req: Request, res: Response) => {
    try {
      const sessionId = (req.session as any).sessionId;
      if (!sessionId) {
        res.status(401).json({ success: false, message: '请先进行SSH登录' });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({ success: false, message: '会话已过期，请重新登录' });
        return;
      }

      const { workspace, category } = req.params;
      if (!workspace) {
        res.status(400).json({ success: false, message: '工作空间参数不能为空' });
        return;
      }
      if (!category) {
        res.status(400).json({ success: false, message: '分类参数不能为空' });
        return;
      }

      const result = await this.appTemplateService.getAllAppTemplates(sessionId, workspace);
      const allTemplates = [...result.templates.global, ...result.templates.workspace];

      // 按分类过滤
      const filteredTemplates = allTemplates.filter(template => template.category === category);

      res.json({
        success: true,
        data: {
          templates: {
            global: filteredTemplates.filter(t => t.source === 'global'),
            workspace: filteredTemplates.filter(t => t.source === 'workspace')
          },
          categories: result.categories,
          platforms: result.platforms,
          defaults: result.defaults
        }
      });
      return;
    } catch (error: any) {
      console.error('Error getting app templates by category:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取分类App模板失败'
      });
      return;
    }
  };

  // 刷新模板缓存
  refreshCache = async (req: Request, res: Response) => {
    try {
      const sessionId = (req.session as any).sessionId;
      if (!sessionId) {
        res.status(401).json({ success: false, message: '请先进行SSH登录' });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({ success: false, message: '会话已过期，请重新登录' });
        return;
      }

      // 清除缓存
      this.appTemplateService.clearAllCache();

      res.json({
        success: true,
        message: '模板缓存已刷新'
      });
      return;
    } catch (error: any) {
      console.error('Error refreshing template cache:', error);
      res.status(500).json({
        success: false,
        message: error.message || '刷新模板缓存失败'
      });
      return;
    }
  };

  // 清除所有缓存
  clearAllCache = async (req: Request, res: Response) => {
    try {
      const sessionId = (req.session as any).sessionId;

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录'
        });
        return;
      }

      this.appTemplateService.clearAllCache();

      res.json({
        success: true,
        message: '所有模板缓存已清除'
      });
    } catch (error: any) {
      console.error('清除缓存失败:', error);
      res.status(500).json({
        success: false,
        message: '清除缓存失败: ' + error.message
      });
    }
  };

  // 清除工作空间缓存
  clearWorkspaceCache = async (req: Request, res: Response) => {
    try {
      const sessionId = (req.session as any).sessionId;
      const { workspace } = req.params;

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录'
        });
        return;
      }

      if (!workspace) {
        res.status(400).json({
          success: false,
          message: '工作空间名称不能为空'
        });
        return;
      }

      this.appTemplateService.clearWorkspaceCache(workspace);

      res.json({
        success: true,
        message: `工作空间 ${workspace} 的缓存已清除`
      });
    } catch (error: any) {
      console.error('清除工作空间缓存失败:', error);
      res.status(500).json({
        success: false,
        message: '清除工作空间缓存失败: ' + error.message
      });
    }
  };

  // 获取缓存状态
  getCacheStatus = async (req: Request, res: Response) => {
    try {
      const sessionId = (req.session as any).sessionId;

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录'
        });
        return;
      }

      const status = this.appTemplateService.getCacheStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      console.error('获取缓存状态失败:', error);
      res.status(500).json({
        success: false,
        message: '获取缓存状态失败: ' + error.message
      });
    }
  };
}
