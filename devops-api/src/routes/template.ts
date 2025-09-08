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

// 获取模板文件列表
router.get('/:templateName/files', templateController.getTemplateFiles);

// 获取模板文件内容
router.get('/:templateName/files/:fileName', templateController.getTemplateFileContent);

// 获取应用模板文件列表
router.get('/app/:templateName/files', templateController.getAppTemplateFiles);

// 获取应用模板文件内容
router.get('/app/:templateName/files/:fileName', templateController.getAppTemplateFileContent);

// 更新应用模板文件内容（仅限工作空间模板）
router.put('/app/:templateName/files/:fileName', templateController.updateAppTemplateFileContent);

// 调试：检查远程模板目录结构
router.get('/debug/remote-paths', templateController.debugRemoteTemplates);

export default router;
