import { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import Joi from 'joi';

// 验证创建enable文件请求的schema
const createEnableSchema = Joi.object({
  workspace: Joi.string().required().messages({
    'any.required': '工作空间名称不能为空',
    'string.empty': '工作空间名称不能为空'
  })
});

export class RemoteWorkspaceController {
  private readonly rootPath = '/root/devops';
  /**
   * 获取远程主机的工作空间列表
   */
  async getRemoteWorkspaces(req: Request, res: Response) {
    try {
      const sessionId = (req.session as any).sessionId;

      console.log('获取远程工作空间列表请求 - sessionId:', sessionId);

      if (!sessionId) {
        console.log('未找到sessionId，用户未登录');
        res.status(401).json({
          success: false,
          message: '请先进行SSH登录',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        console.log('会话不存在或已过期，sessionId:', sessionId);
        res.status(401).json({
          success: false,
          message: '会话已过期，请重新登录',
          code: 'SESSION_EXPIRED'
        });
        return;
      }

      console.log('开始获取远程工作空间列表，用户:', session.username, '主机:', session.host);

      // 列出workspace目录下的所有工作空间
      const workspaces = await authService.listRemoteDirectory(sessionId, `${this.rootPath}/workspace`);

      // 过滤掉系统目录和隐藏目录
      const filteredWorkspaces = workspaces.filter(name =>
        !name.startsWith('.') &&
        name !== 'enable' &&
        name !== '.devops-web'
      );

      console.log('成功获取工作空间列表:', filteredWorkspaces);

      res.json({
        success: true,
        data: {
          workspaces: filteredWorkspaces
        }
      });
      return;
    } catch (error: any) {
      console.error('获取远程工作空间列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取工作空间列表失败: ' + error.message,
        code: 'SERVER_ERROR'
      });
      return;
    }
  }

  /**
   * 读取远程workspace/enable文件
   */
  async getWorkspaceEnable(req: Request, res: Response) {
    try {
      const sessionId = (req.session as any).sessionId;
      
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录'
        });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({
          success: false,
          message: '会话已过期'
        });
        return;
      }

      // 检查enable文件是否存在
      const enablePath = `${this.rootPath}/workspace/enable`;
      const exists = await authService.remoteFileExists(sessionId, enablePath);
      
      if (!exists) {
        res.json({
          success: true,
          data: {
            exists: false
          }
        });
        return;
      }

      // 读取enable文件内容
      const content = await authService.readRemoteFile(sessionId, enablePath);
      
      // 解析ENABEL_WORKSPACE_PATH
      let workspace: string | undefined;
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('ENABEL_WORKSPACE_PATH=')) {
          const value = trimmed.split('=')[1];
          workspace = value?.replace(/"/g, '').trim();
          break;
        }
      }

      res.json({
        success: true,
        data: {
          exists: true,
          workspace,
          content
        }
      });
      return;
    } catch (error: any) {
      console.error('读取enable文件失败:', error);
      res.status(500).json({
        success: false,
        message: '读取enable文件失败: ' + error.message
      });
      return;
    }
  }

  /**
   * 创建workspace/enable文件
   */
  async createEnableFile(req: Request, res: Response) {
    try {
      const sessionId = (req.session as any).sessionId;
      
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录'
        });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({
          success: false,
          message: '会话已过期'
        });
        return;
      }

      // 验证请求参数
      const { error, value } = createEnableSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: error.details[0].message
        });
        return;
      }

      const { workspace } = value;

      // 验证工作空间是否存在
      const workspaces = await authService.listRemoteDirectory(sessionId, `${this.rootPath}/workspace`);
      if (!workspaces.includes(workspace)) {
        res.status(400).json({
          success: false,
          message: `工作空间 ${workspace} 不存在`
        });
        return;
      }

      // 创建enable文件内容
      const enableContent = `#命令行也可以传入 --workspace foo来指定工作目录 
ENABEL_WORKSPACE_PATH="${workspace}"
`;

      // 写入enable文件
      const enablePath = `${this.rootPath}/workspace/enable`;
      await authService.writeRemoteFile(sessionId, enablePath, enableContent);

      console.log(`用户 ${session.username}@${session.host} 设置默认工作空间: ${workspace}`);

      res.json({
        success: true,
        message: `已成功设置 ${workspace} 为默认工作空间`
      });
      return;
    } catch (error: any) {
      console.error('创建enable文件失败:', error);
      res.status(500).json({
        success: false,
        message: '创建enable文件失败: ' + error.message
      });
      return;
    }
  }

  /**
   * 更新远程工作空间配置
   */
  async updateRemoteWorkspaceConfig(req: Request, res: Response) {
    try {
      const sessionId = (req.session as any).sessionId;
      const { name } = req.params;
      const configData = req.body;

      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录'
        });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({
          success: false,
          message: '会话已过期'
        });
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          message: '工作空间名称不能为空'
        });
        return;
      }

      // 生成配置文件内容
      const configContent = this.generateConfigContent(configData);

      // 写入工作空间config文件
      const configPath = `${this.rootPath}/workspace/${name}/config`;
      await authService.writeRemoteFile(sessionId, configPath, configContent);

      console.log(`用户 ${session.username}@${session.host} 更新工作空间配置: ${name}`);

      res.json({
        success: true,
        message: `工作空间 ${name} 配置已更新`
      });
      return;
    } catch (error: any) {
      console.error('更新工作空间配置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新工作空间配置失败: ' + error.message
      });
      return;
    }
  }

  /**
   * 获取远程工作空间配置
   */
  async getRemoteWorkspaceConfig(req: Request, res: Response) {
    try {
      const sessionId = (req.session as any).sessionId;
      const { name } = req.params;
      
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '未登录'
        });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.status(401).json({
          success: false,
          message: '会话已过期'
        });
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          message: '工作空间名称不能为空'
        });
        return;
      }

      // 读取工作空间config文件
      const configPath = `${this.rootPath}/workspace/${name}/config`;
      const exists = await authService.remoteFileExists(sessionId, configPath);
      
      if (!exists) {
        res.json({
          success: true,
          data: {
            exists: false
          }
        });
        return;
      }

      const content = await authService.readRemoteFile(sessionId, configPath);
      
      res.json({
        success: true,
        data: {
          exists: true,
          content,
          config: this.parseConfig(content)
        }
      });
      return;
    } catch (error: any) {
      console.error('获取工作空间配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取工作空间配置失败: ' + error.message
      });
      return;
    }
  }

  /**
   * 解析配置文件内容
   */
  private parseConfig(content: string): Record<string, string> {
    const config: Record<string, string> = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/"/g, '').trim();
          config[key.trim()] = value;
        }
      }
    }
    
    return config;
  }

  /**
   * 检查远程连接状态
   */
  async checkRemoteConnection(req: Request, res: Response) {
    try {
      const sessionId = (req.session as any).sessionId;
      
      if (!sessionId) {
        res.json({
          success: false,
          connected: false,
          message: '未登录'
        });
        return;
      }

      const session = authService.getSession(sessionId);
      if (!session) {
        res.json({
          success: false,
          connected: false,
          message: '会话已过期'
        });
        return;
      }

      // 执行简单命令测试连接
      const result = await authService.executeCommand(sessionId, 'echo "connection_test"');
      const connected = result.exitCode === 0 && result.stdout.includes('connection_test');

      res.json({
        success: true,
        connected,
        host: session.host,
        username: session.username,
        connectedAt: session.connectedAt
      });
      return;
    } catch (error: any) {
      console.error('检查远程连接失败:', error);
      res.json({
        success: false,
        connected: false,
        message: '检查连接失败: ' + error.message
      });
      return;
    }
  }

  /**
   * 生成配置文件内容
   */
  private generateConfigContent(configData: any): string {
    const lines = [
      '# 工作空间配置文件',
      '# 此文件包含工作空间的基本配置信息',
      '',
      '# 基本信息',
      `WORKSPACE_DISPLAY_NAME="${configData.displayName || ''}"`,
      `WORKSPACE_DESCRIPTION="${configData.description || ''}"`,
      '',
      '# 部署配置',
      `BUILD_PLATFORM="${configData.platform || 'KUBERNETES'}"`,
      `BUILD_K8S_NAMESPACE="${configData.namespace || 'default'}"`,
      `DEFAULT_ENVIRONMENT="${configData.environment || 'development'}"`,
      '',
      '# Git 配置',
      `BUILD_GIT_URL="${configData.gitUrl || ''}"`,
      `BUILD_GIT_BRANCH="${configData.gitBranch || 'main'}"`,
      '',
      '# Harbor 配置',
      `BUILD_ENABEL_HARBOR="${configData.harborEnabled ? '1' : '0'}"`,
      `BUILD_HARBOR_ADDRESS="${configData.harborAddress || ''}"`,
      `BUILD_HARBOR_PROJECT="${configData.harborProject || ''}"`,
      `BUILD_HARBOR_USERNAME="${configData.harborUsername || ''}"`,
      `BUILD_HARBOR_PASSWORD="${configData.harborPassword || ''}"`,
      '',
      '# 构建配置',
      `BUILD_VERSION="${configData.buildVersion || 'node:18.12'}"`,
      `BUILD_COMMANDS="${configData.buildCommands || 'npm ci && npm run build'}"`,
      `BUILD_MAVEN_SETTINGS="${configData.mavenSettings || '/root/settings.xml'}"`,
      '',
      `# 最后更新时间: ${new Date().toISOString()}`
    ];

    return lines.join('\n');
  }
}