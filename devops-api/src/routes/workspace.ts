import { Router } from 'express';
import { WorkspaceController } from '../controllers/WorkspaceController';
import { AppTemplateController } from '../controllers/AppTemplateController';

const router = Router();
const workspaceController = new WorkspaceController();
const appTemplateController = new AppTemplateController();

// 获取工作空间列表
router.get('/', workspaceController.getWorkspaces);

// 获取工作空间概览
router.get('/:workspace/summary', workspaceController.getWorkspaceSummary);

// 创建工作空间
router.post('/', workspaceController.createWorkspace);

// 获取工作空间默认配置
router.get('/:workspace/defaults', workspaceController.getDefaults);

// 更新工作空间
router.put('/:workspace', workspaceController.updateWorkspace);

// 删除工作空间
router.delete('/:workspace', workspaceController.deleteWorkspace);

// App模板相关路由
router.get('/:workspace/app/templates', appTemplateController.getWorkspaceAppTemplates);
router.get('/:workspace/app/templates/all', appTemplateController.getAllAppTemplates);
router.get('/:workspace/app/templates/search', appTemplateController.searchAppTemplates);
router.get('/:workspace/app/templates/category/:category', appTemplateController.getAppTemplatesByCategory);
router.get('/:workspace/app/templates/:templateName', appTemplateController.getAppTemplate);
router.get('/:workspace/app/templates/:templateName/variables', appTemplateController.getAppTemplateVariables);

// 复制全局模板到工作空间
router.post('/:workspace/app/templates/copy', appTemplateController.copyGlobalTemplateToWorkspace);

// 缓存管理
router.post('/:workspace/app/templates/refresh-cache', appTemplateController.refreshCache);

export default router;
