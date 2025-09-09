import { BasePlatformHandler } from './BasePlatformHandler';
import { ApplicationInstance, WorkspaceConfig } from '../../types/application';

/**
 * Kubernetes平台处理器
 * 处理K8s YAML文件的解析和状态查询
 */
export class KubernetesHandler extends BasePlatformHandler {

  async parseApplications(deployDir: string, config: WorkspaceConfig, sessionId?: string): Promise<ApplicationInstance[]> {
    console.log(`K8s处理器: 扫描远程部署目录 ${deployDir}`);
    const files = await this.scanDeploymentFiles(deployDir, ['.yml', '.yaml'], sessionId);
    console.log(`K8s处理器: 找到 ${files.length} 个文件:`, files);

    const applications: ApplicationInstance[] = [];

    for (const file of files) {
      try {
        console.log(`K8s处理器: 解析远程文件 ${file}`);
        const content = await this.readFile(file, sessionId);
        console.log(`K8s处理器: 文件内容长度 ${content.length}`);

        const app = await this.parseK8sYaml(file, content, config);
        if (app) {
          console.log(`K8s处理器: 成功解析应用:`, app.name);
          applications.push(app);
        } else {
          console.log(`K8s处理器: 文件不是有效的K8s部署文件: ${file}`);
        }
      } catch (error) {
        console.error(`解析K8s文件失败: ${file}`, error);
      }
    }

    console.log(`K8s处理器: 总共解析到 ${applications.length} 个应用`);
    return applications;
  }

  async getApplicationStatus(nameOrApp: string | ApplicationInstance, config: WorkspaceConfig, sessionId: string): Promise<Partial<ApplicationInstance>> {
    // 支持传入应用名称或完整应用对象
    const name = typeof nameOrApp === 'string' ? nameOrApp : nameOrApp.name;

    // 优先使用应用对象中的命名空间信息，如果没有则使用配置中的命名空间
    const namespace = typeof nameOrApp === 'object' && nameOrApp.platformSpecific?.namespace
      ? nameOrApp.platformSpecific.namespace
      : config.BUILD_K8S_NAMESPACE || 'default';

    console.log(`获取应用状态: ${name}, 命名空间: ${namespace}`);
    
    try {
      // 获取Deployment状态
      const deploymentCmd = `kubectl get deployment ${name} -n ${namespace} -o json`;
      const deploymentResult = await this.executeCommand(sessionId, deploymentCmd);
      
      if (deploymentResult.exitCode === 0) {
        const deployment = this.safeJsonParse(deploymentResult.stdout);
        return this.parseK8sDeploymentStatus(deployment);
      }
      
      // 如果Deployment不存在，尝试查找Pod
      const podCmd = `kubectl get pods -l app=${name} -n ${namespace} -o json`;
      const podResult = await this.executeCommand(sessionId, podCmd);
      
      if (podResult.exitCode === 0) {
        const pods = this.safeJsonParse(podResult.stdout);
        return this.parseK8sPodsStatus(pods);
      }
      
      return { status: 'unknown' };
    } catch (error) {
      console.error(`获取K8s应用状态失败: ${name}`, error);
      return { status: 'error' };
    }
  }

  async executeOperation(name: string, operation: string, params?: any, config?: WorkspaceConfig, sessionId?: string): Promise<boolean> {
    if (!sessionId) return false;
    const namespace = config?.BUILD_K8S_NAMESPACE || 'default';
    
    try {
      let command = '';
      
      switch (operation) {
        case 'start':
          command = `kubectl scale deployment ${name} --replicas=1 -n ${namespace}`;
          break;
        case 'stop':
          command = `kubectl scale deployment ${name} --replicas=0 -n ${namespace}`;
          break;
        case 'restart':
          command = `kubectl rollout restart deployment ${name} -n ${namespace}`;
          break;
        case 'scale':
          const replicas = params?.replicas || 1;
          command = `kubectl scale deployment ${name} --replicas=${replicas} -n ${namespace}`;
          break;
        case 'redeploy':
          if (!config) throw new Error('配置信息缺失');
          // 从params中获取workspace信息
          const workspace = params?.workspace || 'wukong-crm';
          return await this.redeployApplication(name, workspace, config, sessionId);
        default:
          throw new Error(`不支持的操作: ${operation}`);
      }
      
      const result = await this.executeCommand(sessionId, command);
      return result.exitCode === 0;
    } catch (error) {
      console.error(`K8s操作失败: ${operation} ${name}`, error);
      return false;
    }
  }

  /**
   * 解析K8s YAML文件
   */
  private async parseK8sYaml(filePath: string, content: string, config: WorkspaceConfig): Promise<ApplicationInstance | null> {
    const yaml = this.parseYaml(content);
    
    // 检查是否是K8s Deployment
    if (yaml.kind !== 'Deployment' && !content.includes('kind: Deployment')) {
      return null;
    }

    const name = this.extractAppNameFromFile(filePath);
    const app = this.createBaseApplication(name, '', 'KUBERNETES', filePath);
    
    // 解析基本信息
    if (yaml.metadata?.name) {
      app.name = yaml.metadata.name;
    }
    
    // 解析命名空间 - 支持多种格式
    let namespace = 'default';
    if (yaml.metadata?.namespace) {
      // 标准Kubernetes格式
      namespace = yaml.metadata.namespace;
    } else if (yaml.namespace) {
      // 扁平化格式
      namespace = yaml.namespace;
    } else if (config.BUILD_K8S_NAMESPACE) {
      // 配置默认值
      namespace = config.BUILD_K8S_NAMESPACE;
    }

    app.platformSpecific = {
      namespace: namespace
    };

    console.log(`解析到命名空间: ${namespace}`);

    // 解析容器信息
    console.log(`解析容器信息，YAML结构:`, JSON.stringify(yaml, null, 2));

    // 处理标准的Kubernetes Deployment格式
    if (yaml.spec?.template?.spec?.containers) {
      const container = yaml.spec.template.spec.containers[0];
      console.log(`找到标准容器配置:`, container);
      if (container) {
        app.image = container.image;
        console.log(`设置镜像: ${container.image}`);
        app.ports = this.parseK8sPorts(container.ports);
        app.environment = this.parseK8sEnv(container.env);
        app.resources = this.parseK8sResources(container.resources);
      }
    }
    // 处理扁平化的YAML格式（直接包含image字段）
    else if (yaml.image) {
      console.log(`找到扁平化镜像配置: ${yaml.image}`);
      app.image = yaml.image;
    } else {
      console.log(`未找到容器配置，YAML spec:`, yaml.spec);
      console.log(`YAML根级字段:`, Object.keys(yaml));
    }

    // 解析副本数
    if (yaml.spec?.replicas) {
      app.replicas = {
        desired: yaml.spec.replicas,
        ready: 0,
        available: 0
      };
    }

    return app;
  }

  /**
   * 解析K8s Deployment状态
   */
  private parseK8sDeploymentStatus(deployment: any): Partial<ApplicationInstance> {
    if (!deployment) return { status: 'unknown' };

    const status = deployment.status || {};
    const spec = deployment.spec || {};
    
    return {
      status: this.determineK8sStatus(status),
      replicas: {
        desired: spec.replicas || 0,
        ready: status.readyReplicas || 0,
        available: status.availableReplicas || 0
      },
      updatedAt: new Date()
    };
  }

  /**
   * 解析K8s Pods状态
   */
  private parseK8sPodsStatus(podsResponse: any): Partial<ApplicationInstance> {
    if (!podsResponse?.items) return { status: 'unknown' };

    const pods = podsResponse.items;
    const runningPods = pods.filter((pod: any) => pod.status?.phase === 'Running').length;
    const totalPods = pods.length;
    
    return {
      status: runningPods > 0 ? 'running' : 'stopped',
      replicas: {
        desired: totalPods,
        ready: runningPods,
        available: runningPods
      },
      updatedAt: new Date()
    };
  }

  /**
   * 确定K8s状态
   */
  private determineK8sStatus(status: any): any {
    if (status.readyReplicas > 0) {
      return 'running';
    } else if (status.replicas === 0) {
      return 'stopped';
    } else if (status.conditions?.some((c: any) => c.type === 'Progressing' && c.status === 'True')) {
      return 'pending';
    } else {
      return 'error';
    }
  }

  /**
   * 解析K8s端口配置
   */
  private parseK8sPorts(ports: any[]): any[] {
    if (!ports) return [];
    
    return ports.map(port => ({
      name: port.name,
      port: port.containerPort,
      targetPort: port.containerPort,
      protocol: port.protocol || 'TCP'
    }));
  }

  /**
   * 解析K8s环境变量
   */
  private parseK8sEnv(env: any[]): Record<string, string> {
    if (!env) return {};
    
    const environment: Record<string, string> = {};
    env.forEach(item => {
      if (item.name && item.value) {
        environment[item.name] = item.value;
      }
    });
    
    return environment;
  }

  /**
   * 解析K8s资源配置
   */
  private parseK8sResources(resources: any): any {
    if (!resources) return undefined;
    
    return {
      cpu: resources.requests?.cpu,
      memory: resources.requests?.memory,
      limits: {
        cpu: resources.limits?.cpu,
        memory: resources.limits?.memory
      }
    };
  }

  /**
   * 重新部署应用
   */
  private async redeployApplication(name: string, workspace: string, config: WorkspaceConfig, sessionId: string): Promise<boolean> {
    try {
      console.log(`开始重新部署应用: ${name}`);

      // 获取应用的部署文件路径
      const deployDir = this.getDeployDir(workspace);
      const deploymentFile = `${deployDir}/${name}.yml`;

      console.log(`部署文件路径: ${deploymentFile}`);

      // 1. 删除现有的deployment（如果存在）
      const namespace = config.BUILD_K8S_NAMESPACE || 'default';
      const deleteCommand = `kubectl delete deployment ${name} -n ${namespace} --ignore-not-found=true`;
      console.log(`执行删除命令: ${deleteCommand}`);

      const deleteResult = await this.executeCommand(sessionId, deleteCommand);
      console.log(`删除结果: exitCode=${deleteResult.exitCode}`);

      // 2. 等待一下确保资源被清理
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. 重新应用YAML文件
      const applyCommand = `kubectl apply -f ${deploymentFile}`;
      console.log(`执行应用命令: ${applyCommand}`);

      const applyResult = await this.executeCommand(sessionId, applyCommand);
      console.log(`应用结果: exitCode=${applyResult.exitCode}`);

      if (applyResult.exitCode !== 0) {
        console.error(`重新部署失败: ${applyResult.stderr}`);
        return false;
      }

      console.log(`应用 ${name} 重新部署成功`);
      return true;

    } catch (error) {
      console.error(`重新部署应用失败: ${name}`, error);
      return false;
    }
  }

  /**
   * 获取部署目录路径
   */
  private getDeployDir(workspace: string): string {
    // 构建部署目录路径
    const devopsRoot = process.env.DEVOPS_ROOT || '/root/devops';
    return `${devopsRoot}/workspace/${workspace}/deploy/app`;
  }

  /**
   * 获取会话ID（临时实现）
   */
  private getSessionId(): string {
    // 这里需要从请求上下文中获取sessionId
    // 临时返回一个固定值，实际实现时需要修改
    return 'temp-session-id';
  }
}
