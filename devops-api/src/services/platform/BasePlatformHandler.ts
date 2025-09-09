import { PlatformHandler, ApplicationInstance, WorkspaceConfig } from '../../types/application';
import { authService } from '../AuthService';
import path from 'path';

/**
 * 平台处理器基类
 * 提供通用的文件扫描和命令执行功能
 */
export abstract class BasePlatformHandler implements PlatformHandler {
  
  abstract parseApplications(deployDir: string, config: WorkspaceConfig): Promise<ApplicationInstance[]>;
  abstract getApplicationStatus(name: string, config: WorkspaceConfig, sessionId: string): Promise<Partial<ApplicationInstance>>;
  abstract executeOperation(name: string, operation: string, params?: any, config?: WorkspaceConfig, sessionId?: string): Promise<boolean>;

  /**
   * 扫描部署目录中的文件（通过SSH远程执行）
   */
  protected async scanDeploymentFiles(deployDir: string, extensions: string[] = ['.yml', '.yaml'], sessionId?: string): Promise<string[]> {
    try {
      console.log(`扫描远程部署目录: ${deployDir}`);

      if (!sessionId) {
        console.error('缺少sessionId，无法执行远程命令');
        return [];
      }

      // 通过SSH执行ls命令获取文件列表
      const command = `ls -la ${deployDir}`;
      const result = await this.executeCommand(sessionId, command);

      if (result.exitCode !== 0) {
        console.error(`扫描远程目录失败: ${deployDir}`, result.stderr);
        return [];
      }

      // 解析ls输出，提取文件名
      const lines = result.stdout.split('\n');
      const files = lines
        .filter(line => line.trim() && !line.startsWith('total') && !line.includes(' . ') && !line.includes(' .. '))
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[parts.length - 1]; // 最后一部分是文件名
        })
        .filter(file => extensions.some(ext => file.endsWith(ext)));

      console.log(`远程目录中的部署文件:`, files);

      // 返回完整路径
      const deploymentFiles = files.map(file => path.posix.join(deployDir, file));
      console.log(`完整路径的部署文件:`, deploymentFiles);

      return deploymentFiles;
    } catch (error) {
      console.error(`扫描远程部署目录失败: ${deployDir}`, error);
      return [];
    }
  }

  /**
   * 读取远程文件内容
   */
  protected async readFile(filePath: string, sessionId?: string): Promise<string> {
    try {
      if (!sessionId) {
        console.error('缺少sessionId，无法读取远程文件');
        throw new Error('缺少sessionId');
      }

      console.log(`读取远程文件: ${filePath}`);

      // 通过SSH执行cat命令读取文件内容
      const command = `cat "${filePath}"`;
      const result = await this.executeCommand(sessionId, command);

      if (result.exitCode !== 0) {
        console.error(`读取远程文件失败: ${filePath}`, result.stderr);
        throw new Error(`读取文件失败: ${result.stderr}`);
      }

      console.log(`成功读取远程文件: ${filePath}, 内容长度: ${result.stdout.length}`);
      return result.stdout;
    } catch (error) {
      console.error(`读取远程文件失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 执行命令
   */
  protected async executeCommand(sessionId: string, command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      console.log(`执行命令: ${command}`);
      const result = await authService.executeCommand(sessionId, command);
      return result;
    } catch (error) {
      console.error(`命令执行失败: ${command}`, error);
      throw error;
    }
  }

  /**
   * 解析YAML内容
   */
  protected parseYaml(content: string): any {
    try {
      // 简单的YAML解析，实际项目中建议使用yaml库
      const lines = content.split('\n');
      const result: any = {};
      let currentKey = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        if (trimmed.includes(':')) {
          const [key, ...valueParts] = trimmed.split(':');
          const value = valueParts.join(':').trim();
          currentKey = key.trim();
          
          if (value) {
            result[currentKey] = value;
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('YAML解析失败:', error);
      return {};
    }
  }

  /**
   * 从文件路径提取应用名称
   */
  protected extractAppNameFromFile(filePath: string): string {
    const fileName = path.basename(filePath);
    return fileName.replace(/\.(yml|yaml)$/, '');
  }

  /**
   * 创建基础应用实例
   */
  protected createBaseApplication(name: string, workspace: string, platform: any, deploymentFile: string): ApplicationInstance {
    return {
      name,
      workspace,
      platform,
      status: 'unknown',
      deploymentFile,
      updatedAt: new Date()
    };
  }

  /**
   * 解析端口配置
   */
  protected parsePorts(portsConfig: any): any[] {
    if (!portsConfig) return [];
    
    if (Array.isArray(portsConfig)) {
      return portsConfig.map(port => {
        if (typeof port === 'string') {
          const [hostPort, containerPort] = port.split(':');
          return {
            port: parseInt(containerPort || hostPort),
            targetPort: parseInt(containerPort || hostPort),
            nodePort: hostPort !== containerPort ? parseInt(hostPort) : undefined
          };
        }
        return port;
      });
    }
    
    return [];
  }

  /**
   * 格式化状态
   */
  protected formatStatus(rawStatus: string): any {
    const status = rawStatus?.toLowerCase();
    
    if (status?.includes('running') || status?.includes('ready')) {
      return 'running';
    } else if (status?.includes('stopped') || status?.includes('exited')) {
      return 'stopped';
    } else if (status?.includes('error') || status?.includes('failed')) {
      return 'error';
    } else if (status?.includes('pending') || status?.includes('creating')) {
      return 'pending';
    }
    
    return 'unknown';
  }

  /**
   * 安全的JSON解析
   */
  protected safeJsonParse(jsonString: string): any {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('JSON解析失败:', error);
      return null;
    }
  }
}
