import { v4 as uuidv4 } from 'uuid';

export interface Workspace {
  name: string;
  displayName: string;
  description: string;
  middlewareCount: number;
  runningCount: number;
  errorCount: number;
  totalCost: number;
  lastActivity: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSummary {
  workspace: string;
  overview: {
    totalInstances: number;
    runningInstances: number;
    errorInstances: number;
    totalCost: number;
    lastDeployment: string;
  };
  resources: {
    cpu: {
      used: number;
      total: number;
      unit: string;
    };
    memory: {
      used: number;
      total: number;
      unit: string;
    };
    storage: {
      used: number;
      total: number;
      unit: string;
    };
  };
  recentActivities: WorkspaceActivity[];
}

export interface WorkspaceActivity {
  id: string;
  type: 'deploy' | 'scale' | 'delete' | 'backup';
  resource: string;
  status: 'success' | 'failed' | 'running';
  message: string;
  timestamp: string;
  user: string;
}

export class WorkspaceService {
  private workspaces: Workspace[] = [
    {
      name: 'production',
      displayName: '生产环境',
      description: '生产环境工作空间',
      middlewareCount: 5,
      runningCount: 4,
      errorCount: 1,
      totalCost: 128.50,
      lastActivity: new Date().toISOString(),
      permissions: ['read', 'write', 'deploy'],
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString()
    },
    {
      name: 'development',
      displayName: '开发环境',
      description: '开发测试环境',
      middlewareCount: 3,
      runningCount: 3,
      errorCount: 0,
      totalCost: 45.20,
      lastActivity: new Date().toISOString(),
      permissions: ['read', 'write', 'deploy'],
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString()
    },
    {
      name: 'staging',
      displayName: '预发布环境',
      description: '预发布测试环境',
      middlewareCount: 2,
      runningCount: 2,
      errorCount: 0,
      totalCost: 32.80,
      lastActivity: new Date().toISOString(),
      permissions: ['read', 'write'],
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString()
    }
  ];

  async getWorkspaces(): Promise<Workspace[]> {
    return this.workspaces;
  }

  async getWorkspaceSummary(workspaceName: string): Promise<WorkspaceSummary> {
    const workspace = this.workspaces.find(w => w.name === workspaceName);
    if (!workspace) {
      throw new Error(`工作空间 ${workspaceName} 不存在`);
    }

    return {
      workspace: workspaceName,
      overview: {
        totalInstances: workspace.middlewareCount,
        runningInstances: workspace.runningCount,
        errorInstances: workspace.errorCount,
        totalCost: workspace.totalCost,
        lastDeployment: workspace.lastActivity
      },
      resources: {
        cpu: {
          used: Math.floor(Math.random() * 8) + 2,
          total: 16,
          unit: 'Cores'
        },
        memory: {
          used: Math.floor(Math.random() * 16) + 8,
          total: 32,
          unit: 'Gi'
        },
        storage: {
          used: Math.floor(Math.random() * 200) + 100,
          total: 500,
          unit: 'Gi'
        }
      },
      recentActivities: [
        {
          id: uuidv4(),
          type: 'deploy',
          resource: 'redis-cluster',
          status: 'success',
          message: '成功部署 Redis 集群',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          user: 'admin'
        },
        {
          id: uuidv4(),
          type: 'scale',
          resource: 'mysql-ha',
          status: 'success',
          message: '扩容 MySQL 实例到 3 副本',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          user: 'developer'
        },
        {
          id: uuidv4(),
          type: 'backup',
          resource: 'mongodb-replica',
          status: 'running',
          message: '正在备份 MongoDB 数据',
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          user: 'system'
        }
      ]
    };
  }

  async createWorkspace(workspaceData: Partial<Workspace>): Promise<Workspace> {
    if (!workspaceData.name || !workspaceData.displayName) {
      throw new Error('工作空间名称和显示名称不能为空');
    }

    const existingWorkspace = this.workspaces.find(w => w.name === workspaceData.name);
    if (existingWorkspace) {
      throw new Error(`工作空间 ${workspaceData.name} 已存在`);
    }

    const newWorkspace: Workspace = {
      name: workspaceData.name,
      displayName: workspaceData.displayName,
      description: workspaceData.description || '',
      middlewareCount: 0,
      runningCount: 0,
      errorCount: 0,
      totalCost: 0,
      lastActivity: new Date().toISOString(),
      permissions: ['read', 'write', 'deploy'],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.workspaces.push(newWorkspace);
    return newWorkspace;
  }

  async getDefaults(workspaceName: string) {
    return {
      memory_limit: '2Gi',
      storage_size: '10Gi',
      backup_enabled: true,
      monitoring_enabled: true,
      storage_class: 'standard',
      namespace: 'middleware',
      required_fields: ['instance_name', 'template_name'],
      validation_rules: {
        instance_name: [
          { pattern: '^[a-z0-9-]+$', message: '只能包含小写字母、数字和连字符' },
          { minLength: 3, message: '最少3个字符' },
          { maxLength: 63, message: '最多63个字符' }
        ]
      }
    };
  }

  async updateWorkspace(workspaceName: string, updateData: Partial<Workspace>): Promise<Workspace> {
    const workspaceIndex = this.workspaces.findIndex(w => w.name === workspaceName);
    if (workspaceIndex === -1) {
      throw new Error(`工作空间 ${workspaceName} 不存在`);
    }

    const updatedWorkspace = {
      ...this.workspaces[workspaceIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    this.workspaces[workspaceIndex] = updatedWorkspace;
    return updatedWorkspace;
  }

  async deleteWorkspace(workspaceName: string): Promise<void> {
    const workspaceIndex = this.workspaces.findIndex(w => w.name === workspaceName);
    if (workspaceIndex === -1) {
      throw new Error(`工作空间 ${workspaceName} 不存在`);
    }

    this.workspaces.splice(workspaceIndex, 1);
  }
}
