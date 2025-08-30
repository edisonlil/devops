import { Request, Response } from 'express';
import { WorkspaceService } from '../services/WorkspaceService';

export class WorkspaceController {
  private workspaceService: WorkspaceService;

  constructor() {
    this.workspaceService = new WorkspaceService();
  }

  // 获取工作空间列表
  getWorkspaces = async (req: Request, res: Response) => {
    try {
      const workspaces = await this.workspaceService.getWorkspaces();
      res.json({
        success: true,
        data: {
          workspaces
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取工作空间列表失败'
      });
    }
  };

  // 获取工作空间概览
  getWorkspaceSummary = async (req: Request, res: Response) => {
    try {
      const { workspace } = req.params;
      const summary = await this.workspaceService.getWorkspaceSummary(workspace);
      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取工作空间概览失败'
      });
    }
  };

  // 创建工作空间
  createWorkspace = async (req: Request, res: Response) => {
    try {
      const workspaceData = req.body;
      const workspace = await this.workspaceService.createWorkspace(workspaceData);
      res.status(201).json({
        success: true,
        data: workspace
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '创建工作空间失败'
      });
    }
  };

  // 获取工作空间默认配置
  getDefaults = async (req: Request, res: Response) => {
    try {
      const { workspace } = req.params;
      const defaults = await this.workspaceService.getDefaults(workspace);
      res.json({
        success: true,
        data: defaults
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取默认配置失败'
      });
    }
  };

  // 更新工作空间
  updateWorkspace = async (req: Request, res: Response) => {
    try {
      const { workspace } = req.params;
      const updateData = req.body;
      const updatedWorkspace = await this.workspaceService.updateWorkspace(workspace, updateData);
      res.json({
        success: true,
        data: updatedWorkspace
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '更新工作空间失败'
      });
    }
  };

  // 删除工作空间
  deleteWorkspace = async (req: Request, res: Response) => {
    try {
      const { workspace } = req.params;
      await this.workspaceService.deleteWorkspace(workspace);
      res.json({
        success: true,
        message: '工作空间删除成功'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || '删除工作空间失败'
      });
    }
  };
}
