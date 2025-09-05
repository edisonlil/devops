import express from 'express';
import { RemoteWorkspaceController } from '../controllers/RemoteWorkspaceController';

const router = express.Router();
const remoteWorkspaceController = new RemoteWorkspaceController();

// 获取远程主机的工作空间列表
router.get('/workspaces', remoteWorkspaceController.getRemoteWorkspaces.bind(remoteWorkspaceController));

// 读取远程workspace/enable文件
router.get('/workspace/enable', remoteWorkspaceController.getWorkspaceEnable.bind(remoteWorkspaceController));

// 创建workspace/enable文件
router.post('/workspace/enable', remoteWorkspaceController.createEnableFile.bind(remoteWorkspaceController));

// 获取远程工作空间配置
router.get('/workspace/:name/config', remoteWorkspaceController.getRemoteWorkspaceConfig.bind(remoteWorkspaceController));

// 更新远程工作空间配置
router.put('/workspace/:name/config', remoteWorkspaceController.updateRemoteWorkspaceConfig.bind(remoteWorkspaceController));

// 检查远程连接状态
router.get('/connection/check', remoteWorkspaceController.checkRemoteConnection.bind(remoteWorkspaceController));

export default router;