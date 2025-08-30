import { Router } from 'express';
import { WorkspaceController } from '../controllers/WorkspaceController';

const router = Router();
const workspaceController = new WorkspaceController();

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

export default router;
