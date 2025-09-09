import { BasePlatformHandler } from './BasePlatformHandler';
import { ApplicationInstance, WorkspaceConfig } from '../../types/application';

/**
 * Docker Compose平台处理器
 * 处理docker-compose.yml文件的解析和状态查询
 */
export class DockerComposeHandler extends BasePlatformHandler {

  async parseApplications(deployDir: string, config: WorkspaceConfig, sessionId?: string): Promise<ApplicationInstance[]> {
    const files = await this.scanDeploymentFiles(deployDir, ['.yml', '.yaml'], sessionId);
    const applications: ApplicationInstance[] = [];

    for (const file of files) {
      try {
        const content = await this.readFile(file, sessionId);
        const apps = await this.parseComposeYaml(file, content, config);
        applications.push(...apps);
      } catch (error) {
        console.error(`解析Docker Compose文件失败: ${file}`, error);
      }
    }

    return applications;
  }

  async getApplicationStatus(nameOrApp: string | ApplicationInstance, config: WorkspaceConfig, sessionId: string): Promise<Partial<ApplicationInstance>> {
    const name = typeof nameOrApp === 'string' ? nameOrApp : nameOrApp.name;
    
    try {
      // 使用docker-compose ps命令获取状态
      const command = `docker-compose ps ${name} --format json`;
      const result = await this.executeCommand(sessionId, command);
      
      if (result.exitCode === 0 && result.stdout.trim()) {
        const containers = this.parseComposeStatus(result.stdout);
        return this.aggregateContainerStatus(containers);
      }
      
      // 如果docker-compose命令失败，尝试直接查询docker容器
      const dockerCmd = `docker ps -a --filter "name=${name}" --format "{{.Names}},{{.Status}},{{.Image}}"`;
      const dockerResult = await this.executeCommand(sessionId, dockerCmd);
      
      if (dockerResult.exitCode === 0) {
        return this.parseDockerStatus(dockerResult.stdout, name);
      }
      
      return { status: 'unknown' };
    } catch (error) {
      console.error(`获取Docker Compose应用状态失败: ${name}`, error);
      return { status: 'error' };
    }
  }

  async executeOperation(name: string, operation: string, params?: any, config?: WorkspaceConfig): Promise<boolean> {
    const sessionId = this.getSessionId();
    
    try {
      let command = '';
      
      switch (operation) {
        case 'start':
          command = `docker-compose up -d ${name}`;
          break;
        case 'stop':
          command = `docker-compose stop ${name}`;
          break;
        case 'restart':
          command = `docker-compose restart ${name}`;
          break;
        case 'scale':
          const replicas = params?.replicas || 1;
          command = `docker-compose up -d --scale ${name}=${replicas}`;
          break;
        default:
          throw new Error(`不支持的操作: ${operation}`);
      }
      
      const result = await this.executeCommand(sessionId, command);
      return result.exitCode === 0;
    } catch (error) {
      console.error(`Docker Compose操作失败: ${operation} ${name}`, error);
      return false;
    }
  }

  /**
   * 解析Docker Compose YAML文件
   */
  private async parseComposeYaml(filePath: string, content: string, config: WorkspaceConfig): Promise<ApplicationInstance[]> {
    const yaml = this.parseYaml(content);
    const applications: ApplicationInstance[] = [];
    
    // 检查是否是docker-compose格式
    if (!yaml.services && !content.includes('services:')) {
      return applications;
    }

    // 解析services部分
    const services = this.parseComposeServices(content);
    
    for (const [serviceName, serviceConfig] of Object.entries(services)) {
      const app = this.createBaseApplication(serviceName, '', 'DOCKER_COMPOSE', filePath);
      
      // 解析服务配置
      this.parseServiceConfig(app, serviceConfig as any);
      
      // 设置项目名称
      app.platformSpecific = {
        composeProject: this.extractProjectName(filePath)
      };
      
      applications.push(app);
    }

    return applications;
  }

  /**
   * 解析Compose服务配置
   */
  private parseComposeServices(content: string): Record<string, any> {
    const services: Record<string, any> = {};
    const lines = content.split('\n');
    let currentService = '';
    let inServices = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === 'services:') {
        inServices = true;
        continue;
      }
      
      if (inServices && trimmed && !trimmed.startsWith(' ') && trimmed.includes(':')) {
        // 新的顶级section，退出services
        if (!trimmed.startsWith('  ')) {
          inServices = false;
          continue;
        }
      }
      
      if (inServices && trimmed.endsWith(':') && trimmed.startsWith('  ') && !trimmed.startsWith('    ')) {
        // 新的服务
        currentService = trimmed.replace(':', '').trim();
        services[currentService] = {};
      } else if (currentService && trimmed.includes(':')) {
        // 服务配置项
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        if (key && value) {
          services[currentService][key.trim()] = value;
        }
      }
    }
    
    return services;
  }

  /**
   * 解析服务配置
   */
  private parseServiceConfig(app: ApplicationInstance, config: any): void {
    // 解析镜像
    if (config.image) {
      app.image = config.image;
    }
    
    // 解析端口
    if (config.ports) {
      app.ports = this.parsePorts(config.ports);
    }
    
    // 解析环境变量
    if (config.environment) {
      app.environment = this.parseEnvironment(config.environment);
    }
  }

  /**
   * 解析环境变量
   */
  private parseEnvironment(env: any): Record<string, string> {
    const environment: Record<string, string> = {};
    
    if (typeof env === 'string') {
      // 单行环境变量
      const [key, value] = env.split('=');
      if (key && value) {
        environment[key] = value;
      }
    } else if (Array.isArray(env)) {
      // 数组形式的环境变量
      env.forEach(item => {
        if (typeof item === 'string') {
          const [key, value] = item.split('=');
          if (key && value) {
            environment[key] = value;
          }
        }
      });
    }
    
    return environment;
  }

  /**
   * 解析Compose状态输出
   */
  private parseComposeStatus(output: string): any[] {
    try {
      const lines = output.trim().split('\n');
      return lines.map(line => this.safeJsonParse(line)).filter(Boolean);
    } catch (error) {
      console.error('解析Compose状态失败:', error);
      return [];
    }
  }

  /**
   * 聚合容器状态
   */
  private aggregateContainerStatus(containers: any[]): Partial<ApplicationInstance> {
    if (containers.length === 0) {
      return { status: 'stopped' };
    }
    
    const runningContainers = containers.filter(c => c.State === 'running').length;
    const totalContainers = containers.length;
    
    return {
      status: runningContainers > 0 ? 'running' : 'stopped',
      replicas: {
        desired: totalContainers,
        ready: runningContainers,
        available: runningContainers
      },
      updatedAt: new Date()
    };
  }

  /**
   * 解析Docker状态
   */
  private parseDockerStatus(output: string, serviceName: string): Partial<ApplicationInstance> {
    const lines = output.trim().split('\n');
    const containers = lines.filter(line => line.includes(serviceName));
    
    if (containers.length === 0) {
      return { status: 'stopped' };
    }
    
    const runningContainers = containers.filter(line => line.includes('Up')).length;
    
    return {
      status: runningContainers > 0 ? 'running' : 'stopped',
      replicas: {
        desired: containers.length,
        ready: runningContainers,
        available: runningContainers
      },
      updatedAt: new Date()
    };
  }

  /**
   * 提取项目名称
   */
  private extractProjectName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 2] || 'default';
  }

  /**
   * 获取会话ID（临时实现）
   */
  private getSessionId(): string {
    return 'temp-session-id';
  }
}
