import { Router } from 'express';
import { applicationController } from '../controllers/ApplicationController';

const router = Router();

// 应用管理路由

// 获取工作空间的应用列表
router.get('/:workspace/applications', applicationController.getApplications);

// 获取单个应用详情
router.get('/:workspace/applications/:appName', applicationController.getApplication);

// 执行应用操作
router.post('/:workspace/applications/:appName/actions', applicationController.executeAction);

// 获取应用日志
router.get('/:workspace/applications/:appName/logs', applicationController.getApplicationLogs);

// 刷新应用状态
router.post('/:workspace/applications/:appName/refresh', applicationController.refreshStatus);

// 获取应用配置文件
router.get('/:workspace/applications/:appName/config', applicationController.getApplicationConfig);

// 保存应用配置文件
router.put('/:workspace/applications/:appName/config', applicationController.saveApplicationConfig);

// 获取支持的平台列表
router.get('/applications/platforms', applicationController.getSupportedPlatforms);

// 测试连接
router.get('/applications/test', applicationController.testConnection);

export default router;
