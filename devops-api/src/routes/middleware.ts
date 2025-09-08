import { Router } from 'express';
import { MiddlewareController } from '../controllers/MiddlewareController';

const router = Router({ mergeParams: true });
const middlewareController = new MiddlewareController();

// 获取模板列表
router.get('/templates', middlewareController.getTemplates);

// 获取模板详情
router.get('/templates/:templateName', middlewareController.getTemplate);

// 获取模板表单定义
router.get('/templates/:templateName/form', middlewareController.getTemplateForm);

// 获取模板文件列表
router.get('/templates/:templateName/files', middlewareController.getTemplateFiles);

// 获取模板文件内容
router.get('/templates/:templateName/files/:fileName', middlewareController.getTemplateFileContent);

// 更新模板文件内容（仅限工作空间模板）
router.put('/templates/:templateName/files/:fileName', middlewareController.updateTemplateFileContent);

// 验证配置参数
router.post('/validate', middlewareController.validateConfig);

// 预览生成的配置
router.post('/preview', middlewareController.previewConfig);

// 预估部署成本
router.post('/estimate-cost', middlewareController.estimateCost);

// 执行部署
router.post('/deploy', middlewareController.deploy);

// 获取部署状态
router.get('/deploy/:deploymentId/status', middlewareController.getDeploymentStatus);

// 获取部署日志
router.get('/deploy/:deploymentId/logs', middlewareController.getDeploymentLogs);

// 获取实例列表
router.get('/instances', middlewareController.getInstances);

// 获取实例详情
router.get('/instances/:instanceName', middlewareController.getInstance);

// 删除实例
router.delete('/instances/:instanceName', middlewareController.deleteInstance);

// 扩缩容实例
router.post('/instances/:instanceName/scale', middlewareController.scaleInstance);

// 重启实例
router.post('/instances/:instanceName/restart', middlewareController.restartInstance);

// 获取实例日志
router.get('/instances/:instanceName/logs', middlewareController.getInstanceLogs);

export default router;
