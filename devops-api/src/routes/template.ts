import { Router } from 'express';
import { TemplateController } from '../controllers/TemplateController';

const router = Router();
const templateController = new TemplateController();

// 获取全局模板列表
router.get('/', templateController.getGlobalTemplates);

// 获取模板详情
router.get('/:templateName', templateController.getTemplate);

// 获取模板表单定义
router.get('/:templateName/form', templateController.getTemplateForm);

export default router;
