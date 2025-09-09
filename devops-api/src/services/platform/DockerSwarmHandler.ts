import { BasePlatformHandler } from './BasePlatformHandler';
import { ApplicationInstance, WorkspaceConfig } from '../../types/application';

/**
 * Docker Swarm平台处理器
 * 处理Docker Swarm模式的docker-compose.yml文件解析和状态查询
 */
export class DockerSwarmHandler extends BasePlatformHandler {

  async parseApplications(deployDir: string, config: WorkspaceConfig): Promise<ApplicationInstance[]> {
    const files = await this.scanDeploymentFiles(deployDir, ['.yml', '.yaml']);
    const applications: ApplicationInstance[] = [];

    for (const file of files) {
      try {
        const content = await this.readFile(file);
        const apps = await this.parseSwarmFile(file, content, config);
        applications.push(...apps);
      } catch (error) {
        console.error(`解析Docker Swarm文件失败: ${file}`, error);
      }
    }

    return applications;
  }

  async getApplicationStatus(name: string, config: WorkspaceConfig, sessionId: string): Promise<Partial<ApplicationInstance>> {
    try {
      // 使用docker service命令获取状态
      const command = `docker service ps ${name} --format "{{json .}}"`;
      const result = await this.executeCommand(sessionId, command);
      
      if (result.exitCode === 0 && result.stdout.trim()) {
        const serviceInfo = this.safeJsonParse(result.stdout);
        return this.parseSwarmStatus(serviceInfo);
      }
      
      // 如果服务不存在，尝试查找stack中的服务
      const stackCommand = `docker service ls --filter "name=${name}" --format "{{json .}}"`;
      const stackResult = await this.executeCommand(sessionId, stackCommand);
      
      if (stackResult.exitCode === 0 && stackResult.stdout.trim()) {
        const serviceInfo = this.safeJsonParse(stackResult.stdout);
        return this.parseSwarmServiceStatus(serviceInfo);
      }
      
      return { status: 'stopped' };
    } catch (error) {
      console.error(`获取Docker Swarm应用状态失败: ${name}`, error);
      return { status: 'error' };
    }
  }

  async executeOperation(name: string, operation: string, params?: any, config?: WorkspaceConfig, sessionId?: string): Promise<boolean> {
    if (!sessionId) return false;
    
    try {
      let command = '';
      
      switch (operation) {
        case 'start':
          command = `docker service update --replicas 1 ${name}`;
          break;
        case 'stop':
          command = `docker service update --replicas 0 ${name}`;
          break;
        case 'restart':
          command = `docker service update --force ${name}`;
          break;
        case 'scale':
          const replicas = params?.replicas || 1;
          command = `docker service scale ${name}=${replicas}`;
          break;
        case 'logs':
          const lines = params?.lines || 100;
          const follow = params?.follow ? '-f' : '';
          command = `docker service logs ${follow} --tail ${lines} ${name}`;
          break;
        default:
          throw new Error(`不支持的操作: ${operation}`);
      }
      
      const result = await this.executeCommand(sessionId, command);
      return result.exitCode === 0;
    } catch (error) {
      console.error(`Docker Swarm操作失败: ${operation} ${name}`, error);
      return false;
    }
  }

  /**
   * 解析Docker Swarm文件
   */
  private async parseSwarmFile(filePath: string, content: string, config: WorkspaceConfig): Promise<ApplicationInstance[]> {
    const yaml = this.parseYaml(content);
    const applications: ApplicationInstance[] = [];
    
    // 检查是否是docker-compose格式且包含deploy配置
    if (!yaml.services && !content.includes('services:')) {
      return applications;
    }

    // 解析services
    const services = yaml.services || this.parseServicesFromContent(content);
    
    for (const [serviceName, serviceConfig] of Object.entries(services)) {
      // 只处理包含deploy配置的服务（Swarm模式特征）
      if (!this.hasSwarmDeployConfig(serviceConfig as any, content)) {
        continue;
      }

      const app = this.createBaseApplication(serviceName, '', 'DOCKER_SWARM', filePath);
      
      // 解析服务配置
      this.parseSwarmServiceConfig(app, serviceConfig as any);
      
      // 设置平台特定信息
      app.platformSpecific = {
        stackName: this.extractStackName(filePath)
      };
      
      applications.push(app);
    }

    return applications;
  }

  /**
   * 检查是否包含Swarm部署配置
   */
  private hasSwarmDeployConfig(serviceConfig: any, content: string): boolean {
    return serviceConfig.deploy || content.includes('deploy:');
  }

  /**
   * 从内容中解析services（简单实现）
   */
  private parseServicesFromContent(content: string): Record<string, any> {
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
      
      if (inServices && trimmed && !trimmed.startsWith(' ') && !trimmed.startsWith('#')) {
        if (trimmed.includes(':')) {
          currentService = trimmed.replace(':', '').trim();
          services[currentService] = {};
        }
      }
      
      if (inServices && currentService && trimmed.includes(':')) {
        const [key, value] = trimmed.split(':');
        if (key && value) {
          services[currentService][key.trim()] = value.trim();
        }
      }
    }
    
    return services;
  }

  /**
   * 解析Swarm服务配置
   */
  private parseSwarmServiceConfig(app: ApplicationInstance, serviceConfig: any): void {
    // 解析镜像
    if (serviceConfig.image) {
      app.image = serviceConfig.image;
    }
    
    // 解析端口
    if (serviceConfig.ports) {
      app.ports = this.parsePorts(serviceConfig.ports);
    }
    
    // 解析环境变量
    if (serviceConfig.environment) {
      app.environment = this.parseEnvironment(serviceConfig.environment);
    }
    
    // 解析Swarm部署配置
    if (serviceConfig.deploy) {
      this.parseSwarmDeployConfig(app, serviceConfig.deploy);
    }
  }

  /**
   * 解析Swarm部署配置
   */
  private parseSwarmDeployConfig(app: ApplicationInstance, deployConfig: any): void {
    // 解析副本数
    if (deployConfig.replicas) {
      app.replicas = {
        desired: deployConfig.replicas,
        ready: 0,
        available: 0
      };
    }
    
    // 解析资源限制
    if (deployConfig.resources) {
      app.resources = this.parseResources(deployConfig.resources);
    }
  }

  /**
   * 解析环境变量
   */
  private parseEnvironment(env: any): Record<string, string> {
    const environment: Record<string, string> = {};
    
    if (Array.isArray(env)) {
      env.forEach(item => {
        if (typeof item === 'string' && item.includes('=')) {
          const [key, ...valueParts] = item.split('=');
          environment[key] = valueParts.join('=');
        }
      });
    } else if (typeof env === 'object') {
      Object.assign(environment, env);
    }
    
    return environment;
  }

  /**
   * 解析资源配置
   */
  private parseResources(resources: any): any {
    if (!resources) return undefined;
    
    return {
      cpu: resources.reservations?.cpus,
      memory: resources.reservations?.memory,
      limits: {
        cpu: resources.limits?.cpus,
        memory: resources.limits?.memory
      }
    };
  }

  /**
   * 解析Docker Swarm状态
   */
  private parseSwarmStatus(serviceInfo: any): Partial<ApplicationInstance> {
    if (!serviceInfo) return { status: 'unknown' };
    
    const currentState = serviceInfo.CurrentState || serviceInfo.DesiredState;
    return {
      status: this.formatStatus(currentState),
      updatedAt: new Date()
    };
  }

  /**
   * 解析Docker Swarm服务状态
   */
  private parseSwarmServiceStatus(serviceInfo: any): Partial<ApplicationInstance> {
    if (!serviceInfo) return { status: 'unknown' };
    
    const replicas = serviceInfo.Replicas || '0/0';
    const [ready, desired] = replicas.split('/').map((n: string) => parseInt(n) || 0);
    
    return {
      status: ready > 0 ? 'running' : 'stopped',
      replicas: {
        desired,
        ready,
        available: ready
      },
      updatedAt: new Date()
    };
  }

  /**
   * 提取Stack名称
   */
  private extractStackName(filePath: string): string {
    const fileName = this.extractAppNameFromFile(filePath);
    return fileName.replace(/docker-compose/, 'stack');
  }
}
