import { v4 as uuidv4 } from 'uuid';
import { authService } from './AuthService';

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
  private readonly rootPath = '/root/devops';
  
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

  async createWorkspace(workspaceData: Partial<Workspace>, sessionId?: string): Promise<Workspace> {
    if (!workspaceData.name || !workspaceData.displayName) {
      throw new Error('工作空间名称和显示名称不能为空');
    }

    // 验证工作空间名称格式
    if (!/^[a-z0-9-]+$/.test(workspaceData.name)) {
      throw new Error('工作空间名称只能包含小写字母、数字和连字符');
    }

    const existingWorkspace = this.workspaces.find(w => w.name === workspaceData.name);
    if (existingWorkspace) {
      throw new Error(`工作空间 ${workspaceData.name} 已存在`);
    }

    // 如果有 sessionId，在远程主机上创建工作空间目录结构
    if (sessionId) {
      await this.createRemoteWorkspaceStructure(sessionId, workspaceData.name, workspaceData);
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

  /**
   * 在远程主机上创建工作空间目录结构
   */
  private async createRemoteWorkspaceStructure(sessionId: string, workspaceName: string, workspaceData: Partial<Workspace>): Promise<void> {
    const session = authService.getSession(sessionId);
    if (!session) {
      throw new Error('会话已过期，请重新登录');
    }

    const workspacePath = `${this.rootPath}/workspace/${workspaceName}`;

    try {
      // 1. 生成配置文件内容
      const configContent = this.generateWorkspaceConfigContent(workspaceData);
      const readmeContent = this.generateWorkspaceReadme(workspaceName, workspaceData);

      // 2. 创建一个批量脚本，一次性执行所有操作
      const batchScript = `#!/bin/bash
set -e  # 遇到错误立即退出

# 创建工作空间目录结构
mkdir -p "${workspacePath}"/{deploy,templates/{k8s,compose,swarm}}

# 创建配置文件
cat > "${workspacePath}/config" << 'EOF'
${configContent}
EOF

# 创建README文件
cat > "${workspacePath}/README.md" << 'EOF'
${readmeContent}
EOF

echo "工作空间 ${workspaceName} 创建完成"
`;

      // 3. 执行批量脚本
      const result = await authService.executeCommand(sessionId, batchScript);
      
      if (result.exitCode !== 0) {
        throw new Error(`批量创建脚本执行失败: ${result.stderr}`);
      }

      console.log(`成功在远程主机创建工作空间目录结构: ${workspaceName}`);
      console.log('脚本执行输出:', result.stdout);

    } catch (error: any) {
      console.error(`创建远程工作空间目录结构失败: ${workspaceName}`, error);
      // 如果创建失败，尝试清理
      try {
        await authService.executeCommand(sessionId, `rm -rf "${workspacePath}"`);
        console.log(`已清理失败的工作空间目录: ${workspacePath}`);
      } catch (cleanupError) {
        console.error('清理失败的工作空间目录时出错:', cleanupError);
      }
      throw new Error(`在远程主机创建工作空间失败: ${error.message}`);
    }
  }

  /**
   * 生成工作空间配置文件内容
   */
  private generateWorkspaceConfigContent(workspaceData: Partial<Workspace>): string {
    const lines = [
      '# 工作空间配置文件',
      `# 工作空间: ${workspaceData.name}`,
      `# 创建时间: ${new Date().toISOString()}`,
      '',
      '# 基本信息',
      `WORKSPACE_NAME="${workspaceData.name || ''}"`,
      `WORKSPACE_DISPLAY_NAME="${workspaceData.displayName || ''}"`,
      `WORKSPACE_DESCRIPTION="${workspaceData.description || ''}"`,
      '',
      '# 部署平台配置',
      'BUILD_PLATFORM="KUBERNETES"',
      'BUILD_K8S_NAMESPACE="default"',
      'DEFAULT_ENVIRONMENT="development"',
      '',
      '# Git 配置',
      'BUILD_GIT_URL=""',
      'BUILD_GIT_BRANCH="main"',
      '',
      '# Harbor 配置',
      'BUILD_ENABEL_HARBOR="0"',
      'BUILD_HARBOR_ADDRESS=""',
      'BUILD_HARBOR_PROJECT=""',
      'BUILD_HARBOR_USERNAME=""',
      'BUILD_HARBOR_PASSWORD=""',
      '',
      '# 构建配置',
      'BUILD_VERSION="node:18.12"',
      'BUILD_COMMANDS="npm ci && npm run build"',
      'BUILD_MAVEN_SETTINGS="/root/settings.xml"',
      '',
      '# 资源配置',
      'DEFAULT_MEMORY_LIMIT="2Gi"',
      'DEFAULT_STORAGE_SIZE="10Gi"',
      'DEFAULT_STORAGE_CLASS="standard"',
      '',
      `# 最后更新时间: ${new Date().toISOString()}`
    ];

    return lines.join('\n');
  }

  /**
   * 生成工作空间README文件
   */
  private generateWorkspaceReadme(workspaceName: string, workspaceData: Partial<Workspace>): string {
    return `# ${workspaceData.displayName || workspaceName}

${workspaceData.description || ''}

## 工作空间信息

- **名称**: ${workspaceName}
- **显示名称**: ${workspaceData.displayName || ''}
- **创建时间**: ${new Date().toLocaleString('zh-CN')}

## 目录结构

\`\`\`
${workspaceName}/
├── config              # 工作空间配置文件
├── deploy/             # 部署文件目录
├── templates/          # 模板目录
│   ├── k8s/           # Kubernetes 模板
│   ├── compose/       # Docker Compose 模板
│   └── swarm/         # Docker Swarm 模板
└── README.md          # 说明文档
\`\`\`

## 使用说明

1. 在 \`deploy/\` 目录中放置应用部署配置文件
2. 在 \`templates/\` 目录中自定义模板文件
3. 修改 \`config\` 文件来配置工作空间参数

## 部署命令

\`\`\`bash
# 使用该工作空间进行部署
devops run --workspace ${workspaceName} <type> <project-name>
\`\`\`

---
*此文档由 DevOps 平台自动生成*
`;
  }
}
