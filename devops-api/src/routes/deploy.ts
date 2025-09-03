import { Router } from 'express';
import { DeployController } from '../controllers/DeployController';

const router = Router({ mergeParams: true });
const deployController = new DeployController();

// 远程 devops 命令执行接口
router.post('/execute', deployController.executeDevopsCommand);

// 获取远程服务器列表
router.get('/servers', deployController.getRemoteServers);

// 添加/更新远程服务器配置
router.post('/servers', deployController.addRemoteServer);
router.put('/servers/:serverId', deployController.updateRemoteServer);
router.delete('/servers/:serverId', deployController.deleteRemoteServer);

// 测试远程服务器连接
router.post('/servers/:serverId/test', deployController.testConnection);

// 获取远程服务器上的 devops 命令状态
router.get('/servers/:serverId/devops-status', deployController.getDevopsStatus);

// 获取远程执行历史
router.get('/executions', deployController.getExecutionHistory);

// 获取特定执行的详细信息和日志
router.get('/executions/:executionId', deployController.getExecutionDetails);
router.get('/executions/:executionId/logs', deployController.getExecutionLogs);

// 取消正在执行的命令
router.post('/executions/:executionId/cancel', deployController.cancelExecution);

// 应用部署相关接口
router.post('/applications', deployController.deployApplication);
router.get('/applications', deployController.getApplications);
router.get('/applications/:appName', deployController.getApplicationDetails);
router.post('/applications/:appName/start', deployController.startApplication);
router.post('/applications/:appName/stop', deployController.stopApplication);
router.post('/applications/:appName/restart', deployController.restartApplication);
router.delete('/applications/:appName', deployController.deleteApplication);

// 获取远程资源信息
router.get('/resources/workspaces', deployController.getRemoteWorkspaces);
router.get('/resources/templates', deployController.getRemoteTemplates);
router.get('/resources/deployments', deployController.getRemoteDeployments);
router.get('/resources/system-info', deployController.getSystemInfo);

export default router;