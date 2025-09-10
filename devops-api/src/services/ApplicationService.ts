import { ApplicationInstance, WorkspaceConfig, PlatformHandler, ApplicationOperation, OperationParams } from '../types/application';
import { workspaceConfigService } from './WorkspaceConfigService';
import { KubernetesHandler } from './platform/KubernetesHandler';
import { DockerComposeHandler } from './platform/DockerComposeHandler';
import { DockerSwarmHandler } from './platform/DockerSwarmHandler';
import path from 'path';

/**
 * 应用管理服务
 * 统一管理不同平台的应用实例
 */
class ApplicationService {
  private handlers = new Map<string, PlatformHandler>();

  constructor() {
    // 注册平台处理器
    this.handlers.set('KUBERNETES', new KubernetesHandler());
    this.handlers.set('DOCKER_COMPOSE', new DockerComposeHandler());
    this.handlers.set('DOCKER_SWARM', new DockerSwarmHandler());
  }

  /**
   * 获取工作空间的应用列表
   */
  async getApplications(workspace: string, sessionId: string): Promise<ApplicationInstance[]> {
    try {
      console.log(`获取工作空间应用列表: ${workspace}`);

      // 获取工作空间配置（带缓存）
      console.log(`获取工作空间配置: ${workspace}`);
      const config = await workspaceConfigService.getWorkspaceConfig(workspace, sessionId);
      console.log(`工作空间配置:`, config);

      // 获取对应的平台处理器
      console.log(`平台类型: ${config.BUILD_PLATFORM}`);
      const handler = this.getHandler(config.BUILD_PLATFORM);

      // 构建部署目录路径
      const deployDir = this.getDeployDir(workspace);

      // 解析应用列表
      console.log(`开始解析应用列表，目录: ${deployDir}`);
      const applications = await handler.parseApplications(deployDir, config, sessionId);
      console.log(`解析到 ${applications.length} 个应用:`, applications);

      // 批量获取实时状态
      const applicationsWithStatus = await this.batchGetStatus(applications, handler, config, sessionId);

      console.log(`找到 ${applicationsWithStatus.length} 个应用`);
      return applicationsWithStatus;
    } catch (error) {
      console.error(`获取应用列表失败: ${workspace}`, error);
      throw error;
    }
  }

  /**
   * 获取单个应用详情
   */
  async getApplication(workspace: string, appName: string, sessionId: string): Promise<ApplicationInstance | null> {
    try {
      const applications = await this.getApplications(workspace, sessionId);
      return applications.find(app => app.name === appName) || null;
    } catch (error) {
      console.error(`获取应用详情失败: ${workspace}/${appName}`, error);
      throw error;
    }
  }

  /**
   * 执行应用操作
   */
  async executeOperation(
    workspace: string, 
    appName: string, 
    operation: ApplicationOperation, 
    params: OperationParams = {},
    sessionId: string
  ): Promise<boolean> {
    try {
      console.log(`执行应用操作: ${workspace}/${appName} - ${operation}`);
      
      // 获取工作空间配置
      const config = await workspaceConfigService.getWorkspaceConfig(workspace, sessionId);
      
      // 获取对应的平台处理器
      const handler = this.getHandler(config.BUILD_PLATFORM);
      
      // 执行操作
      const paramsWithWorkspace = { ...params, workspace };
      const result = await handler.executeOperation(appName, operation, paramsWithWorkspace, config, sessionId);
      
      console.log(`操作${result ? '成功' : '失败'}: ${workspace}/${appName} - ${operation}`);
      return result;
    } catch (error) {
      console.error(`执行应用操作失败: ${workspace}/${appName} - ${operation}`, error);
      return false;
    }
  }

  /**
   * 获取应用日志
   */
  async getApplicationLogs(
    workspace: string,
    appName: string,
    sessionId: string,
    lines: number = 100,
    follow: boolean = false,
    container?: string
  ): Promise<string> {
    try {
      const config = await workspaceConfigService.getWorkspaceConfig(workspace, sessionId);
      const handler = this.getHandler(config.BUILD_PLATFORM);

      // 获取命名空间
      const namespace = config.BUILD_K8S_NAMESPACE || workspace || 'default';

      // 如果是Kubernetes平台，直接调用getApplicationLogs方法
      if (config.BUILD_PLATFORM === 'KUBERNETES') {
        const kubernetesHandler = handler as any; // 类型断言
        return await kubernetesHandler.getApplicationLogs(
          appName,
          namespace,
          { lines, follow, container },
          sessionId
        );
      }

      throw new Error(`平台 ${config.BUILD_PLATFORM} 暂不支持日志查看功能`);
    } catch (error) {
      console.error(`获取应用日志失败: ${workspace}/${appName}`, error);
      throw error;
    }
  }

  /**
   * 刷新应用状态
   */
  async refreshApplicationStatus(workspace: string, appName: string, sessionId: string): Promise<Partial<ApplicationInstance>> {
    try {
      const config = await workspaceConfigService.getWorkspaceConfig(workspace, sessionId);
      const handler = this.getHandler(config.BUILD_PLATFORM);
      
      return await handler.getApplicationStatus(appName, config, sessionId);
    } catch (error) {
      console.error(`刷新应用状态失败: ${workspace}/${appName}`, error);
      return { status: 'error' };
    }
  }

  /**
   * 批量获取应用状态
   */
  private async batchGetStatus(
    applications: ApplicationInstance[], 
    handler: PlatformHandler, 
    config: WorkspaceConfig,
    sessionId: string
  ): Promise<ApplicationInstance[]> {
    const promises = applications.map(async (app) => {
      try {
        const status = await handler.getApplicationStatus(app, config, sessionId);
        return { ...app, ...status };
      } catch (error) {
        console.error(`获取应用状态失败: ${app.name}`, error);
        return { ...app, status: 'error' as const };
      }
    });

    return Promise.all(promises);
  }

  /**
   * 获取平台处理器
   */
  private getHandler(platform: string): PlatformHandler {
    const handler = this.handlers.get(platform);
    if (!handler) {
      throw new Error(`不支持的平台类型: ${platform}`);
    }
    return handler;
  }

  /**
   * 获取远程部署目录路径
   */
  private getDeployDir(workspace: string): string {
    // 使用远程主机上的路径
    const devopsRoot = process.env.DEVOPS_ROOT || '/root/devops';
    const deployPath = path.posix.join(devopsRoot, 'workspace', workspace, 'deploy', 'app');
    console.log(`构建远程部署目录路径: ${deployPath}`);
    return deployPath;
  }

  /**
   * 获取支持的平台列表
   */
  getSupportedPlatforms(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 检查平台是否支持
   */
  isPlatformSupported(platform: string): boolean {
    return this.handlers.has(platform);
  }

  /**
   * 获取应用配置文件
   */
  async getApplicationConfig(workspace: string, appName: string, sessionId: string): Promise<{ content: string; filePath: string }> {
    try {
      console.log(`获取应用配置: ${workspace}/${appName}`);

      // 构建配置文件路径
      const devopsRoot = process.env.DEVOPS_ROOT || '/root/devops';
      const filePath = `${devopsRoot}/workspace/${workspace}/deploy/app/${appName}.yml`;

      console.log(`配置文件路径: ${filePath}`);

      // 读取文件内容
      const content = await this.readRemoteFile(filePath, sessionId, workspace);

      console.log(`读取到配置内容长度: ${content.length}`);

      return {
        content,
        filePath
      };
    } catch (error) {
      console.error(`获取应用配置失败: ${workspace}/${appName}`, error);
      throw error;
    }
  }

  /**
   * 保存应用配置文件
   */
  async saveApplicationConfig(
    workspace: string,
    appName: string,
    content: string,
    autoRedeploy: boolean,
    sessionId: string
  ): Promise<{ saved: boolean; redeployed?: boolean }> {
    try {
      console.log(`保存应用配置: ${workspace}/${appName}, 自动重新部署: ${autoRedeploy}`);

      const config = await workspaceConfigService.getWorkspaceConfig(workspace, sessionId);

      // 构建配置文件路径
      const devopsRoot = process.env.DEVOPS_ROOT || '/root/devops';
      const filePath = `${devopsRoot}/workspace/${workspace}/deploy/app/${appName}.yml`;

      // 创建备份目录并备份原文件
      const backupDir = `${devopsRoot}/workspace/${workspace}/deploy/app/backups`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${appName}.yml.backup.${timestamp}`;
      const backupPath = `${backupDir}/${backupFileName}`;

      // 确保备份目录存在
      await this.executeRemoteCommand(sessionId, `mkdir -p "${backupDir}"`, workspace);

      // 备份原文件
      await this.executeRemoteCommand(sessionId, `cp "${filePath}" "${backupPath}"`, workspace);

      console.log(`配置文件已备份到: ${backupPath}`);

      // 清理旧备份文件（保留最近10个备份）
      await this.cleanupOldBackups(sessionId, backupDir, appName, workspace);

      // 保存新内容
      await this.writeRemoteFile(filePath, content, sessionId, workspace);

      let redeployed = false;
      if (autoRedeploy) {
        // 自动重新部署
        const handler = this.getHandler(config.BUILD_PLATFORM);
        redeployed = await handler.executeOperation(appName, 'redeploy', { workspace }, config, sessionId);
      }

      return {
        saved: true,
        redeployed
      };
    } catch (error) {
      console.error(`保存应用配置失败: ${workspace}/${appName}`, error);
      throw error;
    }
  }

  /**
   * 获取平台统计信息
   */
  async getPlatformStats(sessionId: string): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    
    // 这里可以实现获取各平台的应用数量统计
    for (const platform of this.handlers.keys()) {
      stats[platform] = 0; // 临时实现
    }
    
    return stats;
  }

  /**
   * 读取远程文件
   */
  private async readRemoteFile(filePath: string, sessionId: string, workspace: string = 'wukong-crm'): Promise<string> {
    const command = `cat "${filePath}"`;
    const result = await this.executeRemoteCommand(sessionId, command, workspace);

    if (result.exitCode !== 0) {
      throw new Error(`读取文件失败: ${result.stderr}`);
    }

    return result.stdout;
  }

  /**
   * 写入远程文件
   */
  private async writeRemoteFile(filePath: string, content: string, sessionId: string, workspace: string = 'wukong-crm'): Promise<void> {
    // 转义内容中的特殊字符
    const escapedContent = content.replace(/'/g, "'\"'\"'");
    const command = `echo '${escapedContent}' > "${filePath}"`;

    const result = await this.executeRemoteCommand(sessionId, command, workspace);

    if (result.exitCode !== 0) {
      throw new Error(`写入文件失败: ${result.stderr}`);
    }
  }

  /**
   * 清理旧备份文件
   */
  private async cleanupOldBackups(sessionId: string, backupDir: string, appName: string, workspace: string): Promise<void> {
    try {
      // 列出该应用的所有备份文件，按时间排序
      const listCommand = `ls -t "${backupDir}/${appName}.yml.backup."* 2>/dev/null || true`;
      const result = await this.executeRemoteCommand(sessionId, listCommand, workspace);

      if (result.exitCode === 0 && result.stdout.trim()) {
        const backupFiles = result.stdout.trim().split('\n');

        // 如果备份文件超过10个，删除最旧的
        if (backupFiles.length > 10) {
          const filesToDelete = backupFiles.slice(10); // 保留最新的10个
          for (const file of filesToDelete) {
            if (file.trim()) {
              await this.executeRemoteCommand(sessionId, `rm -f "${file.trim()}"`, workspace);
              console.log(`已删除旧备份文件: ${file.trim()}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('清理旧备份文件失败:', error);
      // 不抛出错误，因为这不是关键操作
    }
  }

  /**
   * 执行远程命令
   */
  private async executeRemoteCommand(sessionId: string, command: string, workspace: string = 'wukong-crm'): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      console.log(`执行远程命令: ${command}`);

      // 使用KubernetesHandler的executeCommand方法
      const config = await workspaceConfigService.getWorkspaceConfig(workspace, sessionId);
      const handler = this.getHandler(config.BUILD_PLATFORM);

      // 直接调用KubernetesHandler的executeCommand方法
      if (handler && typeof (handler as any).executeCommand === 'function') {
        const result = await (handler as any).executeCommand(sessionId, command);
        return {
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          exitCode: result.exitCode || 0
        };
      }

      // 如果不是Kubernetes处理器，返回错误
      return {
        stdout: '',
        stderr: 'Unsupported platform for remote command execution',
        exitCode: 1
      };
    } catch (error) {
      console.error('执行远程命令失败:', error);
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1
      };
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 清理资源，如关闭连接等
    console.log('应用管理服务清理完成');
  }
}

export const applicationService = new ApplicationService();
