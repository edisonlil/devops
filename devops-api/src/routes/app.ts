import { Router } from 'express';
import { AppTemplateController } from '../controllers/AppTemplateController';

const router = Router();
const appTemplateController = new AppTemplateController();

// 全局app模板路由
router.get('/templates', appTemplateController.getGlobalAppTemplates);
router.get('/templates/search', appTemplateController.searchAppTemplates);
router.get('/templates/category/:category', appTemplateController.getAppTemplatesByCategory);
router.get('/templates/:templateName', appTemplateController.getAppTemplate);
router.get('/templates/:templateName/variables', appTemplateController.getAppTemplateVariables);

// 缓存管理
router.post('/templates/refresh-cache', appTemplateController.refreshCache);

export default router;
