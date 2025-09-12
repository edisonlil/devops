import { v4 as uuidv4 } from 'uuid';
import * as yaml from 'js-yaml';
import { RemoteServerService, RemoteServer } from './RemoteServerService';
import { SSHService } from './SSHService';
import { authService } from './AuthService';

export interface PortCheckResult {
  port: number;
  isAvailable: boolean;
  message: string;
  processInfo?: {
    pid?: string;
    name?: string;
    user?: string;
  };
  timestamp: string;
}

export interface ServerPortCheck {
  serverId: string;
  serverName: string;
  serverHost: string;
  connected: boolean;
  ports: PortCheckResult[];
  error?: string;
}

export interface MiddlewareTemplate {
  name: string;
  type: string;
  description: string;
  category: string;
  difficulty: string;
  icon: string;
  platforms: string[];
  tags: string[];
  version: string;
  author: string;
  source: 'global' | 'workspace';
}

export interface TemplateFormDefinition {
  groups: FormGroup[];
}

export interface FormGroup {
  name: string;
  label: string;
  fields: FormField[];
}

export interface FormField {
  name: string;
  label: string;
  type: 'input' | 'textarea' | 'select' | 'switch' | 'resource-slider';
  required: boolean;
  default?: any;
  placeholder?: string;
  help?: string;
  validation?: string;
  options?: { label: string; value: string }[];
}

export interface MiddlewareInstance {
  name: string;
  template: string;
  namespace: string;
  workspace: string;
  status: 'running' | 'error' | 'pending' | 'stopped';
  createdAt: string;
  lastActivity: string;
  resources: {
    cpu: {
      request: string;
      limit: string;
      usage: number;
    };
    memory: {
      request: string;
      limit: string;
      usage: number;
    };
    storage: {
      size: string;
      used: number;
    };
  };
  connectionInfo: {
    internal: string;
    external?: string;
  };
  ports: Array<{
    name: string;
    port: number;
    targetPort: number;
    protocol: string;
    nodePort?: number;
  }>;
}

export interface DeploymentJob {
  id: string;
  config: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: string;
  endTime?: string;
  error?: string;
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
}

export class MiddlewareService {
  private templates: MiddlewareTemplate[] = [
    {
      name: 'redis-standalone',
      type: 'Redis',
      description: 'Redis 单机版，适用于开发和小规模应用',
      category: 'cache',
      difficulty: 'simple',
      icon: '🔴',
      platforms: ['kubernetes'],
      tags: ['缓存', '简单', '推荐'],
      version: '7.0',
      author: 'DevOps Team',
      source: 'global'
    },
    {
      name: 'redis-cluster',
      type: 'Redis',
      description: 'Redis 集群版，支持高可用和水平扩展',
      category: 'cache',
      difficulty: 'advanced',
      icon: '🔴',
      platforms: ['kubernetes'],
      tags: ['缓存', '集群', '高可用'],
      version: '7.0',
      author: 'DevOps Team',
      source: 'global'
    },
    {
      name: 'mysql-standalone',
      type: 'MySQL',
      description: 'MySQL 单机版数据库',
      category: 'database',
      difficulty: 'recommended',
      icon: '🗄️',
      platforms: ['kubernetes'],
      tags: ['数据库', '推荐'],
      version: '8.0',
      author: 'DevOps Team',
      source: 'global'
    },
    {
      name: 'mysql-ha',
      type: 'MySQL',
      description: 'MySQL 高可用集群，支持主从复制',
      category: 'database',
      difficulty: 'advanced',
      icon: '🗄️',
      platforms: ['kubernetes'],
      tags: ['数据库', '高可用', '集群'],
      version: '8.0',
      author: 'DevOps Team',
      source: 'global'
    },
    {
      name: 'elasticsearch-cluster',
      type: 'Elasticsearch',
      description: 'Elasticsearch 搜索引擎集群',
      category: 'search',
      difficulty: 'advanced',
      icon: '🔍',
      platforms: ['kubernetes'],
      tags: ['搜索', '集群', '分析'],
      version: '8.11',
      author: 'DevOps Team',
      source: 'global'
    },
    {
      name: 'kafka-cluster',
      type: 'Apache Kafka',
      description: 'Kafka 消息队列集群',
      category: 'message-queue',
      difficulty: 'advanced',
      icon: '📨',
      platforms: ['kubernetes'],
      tags: ['消息队列', '集群', '流处理'],
      version: '3.6',
      author: 'DevOps Team',
      source: 'global'
    },
    {
      name: 'mongodb-replicaset',
      type: 'MongoDB',
      description: 'MongoDB 副本集',
      category: 'database',
      difficulty: 'intermediate',
      icon: '📊',
      platforms: ['kubernetes'],
      tags: ['数据库', '文档', '副本集'],
      version: '7.0',
      author: 'DevOps Team',
      source: 'global'
    },
    {
      name: 'minio-distributed',
      type: 'MinIO',
      description: 'MinIO 分布式对象存储',
      category: 'other',
      difficulty: 'intermediate',
      icon: '🚀',
      platforms: ['kubernetes'],
      tags: ['存储', '对象存储', '分布式'],
      version: 'latest',
      author: 'DevOps Team',
      source: 'global'
    }
  ];

  private instances: MiddlewareInstance[] = [
    {
      name: 'redis-cache-001',
      template: 'redis-standalone',
      namespace: 'middleware',
      workspace: 'production',
      status: 'running',
      createdAt: '2024-01-15T10:30:00Z',
      lastActivity: new Date().toISOString(),
      resources: {
        cpu: {
          request: '500m',
          limit: '1000m',
          usage: 0.35
        },
        memory: {
          request: '1Gi',
          limit: '2Gi',
          usage: 0.42
        },
        storage: {
          size: '10Gi',
          used: 0.25
        }
      },
      connectionInfo: {
        internal: 'redis-cache-001.middleware.svc.cluster.local:6379',
        external: 'redis.example.com:6379'
      },
      ports: [
        {
          name: 'redis',
          port: 6379,
          targetPort: 6379,
          protocol: 'TCP'
        }
      ]
    },
    {
      name: 'mysql-main-db',
      template: 'mysql-standalone',
      namespace: 'middleware',
      workspace: 'production',
      status: 'running',
      createdAt: '2024-01-10T08:15:00Z',
      lastActivity: new Date().toISOString(),
      resources: {
        cpu: {
          request: '1000m',
          limit: '2000m',
          usage: 0.58
        },
        memory: {
          request: '2Gi',
          limit: '4Gi',
          usage: 0.67
        },
        storage: {
          size: '50Gi',
          used: 0.45
        }
      },
      connectionInfo: {
        internal: 'mysql-main-db.middleware.svc.cluster.local:3306'
      },
      ports: [
        {
          name: 'mysql',
          port: 3306,
          targetPort: 3306,
          protocol: 'TCP'
        }
      ]
    }
  ];

  private deployments: Map<string, DeploymentJob> = new Map();
  private remoteServerService: RemoteServerService;
  private sshService: SSHService;

  constructor() {
    this.remoteServerService = new RemoteServerService();
    this.sshService = new SSHService();
  }

  async getTemplates(workspace: string) {
    const categories = [...new Set(this.templates.map(t => t.category))];
    const platforms = [...new Set(this.templates.flatMap(t => t.platforms))];
    
    return {
      templates: {
        global: this.templates.filter(t => t.source === 'global'),
        workspace: this.templates.filter(t => t.source === 'workspace')
      },
      defaults: {
        memory_limit: '2Gi',
        storage_size: '10Gi',
        backup_enabled: true,
        monitoring_enabled: true
      },
      categories,
      platforms
    };
  }

  async getTemplate(workspace: string, templateName: string): Promise<MiddlewareTemplate> {
    const template = this.templates.find(t => t.name === templateName);
    if (!template) {
      throw new Error(`模板 ${templateName} 不存在`);
    }
    return template;
  }

  async getTemplateForm(workspace: string, templateName: string): Promise<TemplateFormDefinition> {
    const template = await this.getTemplate(workspace, templateName);
    
    // 根据模板类型返回不同的表单定义
    const baseForm: TemplateFormDefinition = {
      groups: [
        {
          name: 'basic',
          label: '基础配置',
          fields: [
            {
              name: 'root_password',
              label: '管理员密码',
              type: 'input',
              required: true,
              placeholder: '请输入管理员密码',
              help: '密码长度至少8位，包含字母和数字',
              validation: '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*#?&]{8,}$'
            }
          ]
        }
      ]
    };

    // 根据模板类型添加特定字段
    if (template.type === 'Redis') {
      baseForm.groups[0].fields.push({
        name: 'max_memory',
        label: '最大内存',
        type: 'select',
        required: false,
        default: '1gb',
        options: [
          { label: '512MB', value: '512mb' },
          { label: '1GB', value: '1gb' },
          { label: '2GB', value: '2gb' },
          { label: '4GB', value: '4gb' }
        ]
      });
    }

    if (template.type === 'MySQL') {
      baseForm.groups[0].fields.push({
        name: 'database_name',
        label: '数据库名称',
        type: 'input',
        required: true,
        default: 'myapp',
        placeholder: '请输入数据库名称'
      });
    }

    return baseForm;
  }

  async validateConfig(workspace: string, config: any) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基础验证
    if (!config.instance_name) {
      errors.push('实例名称不能为空');
    } else if (!/^[a-z0-9-]+$/.test(config.instance_name)) {
      errors.push('实例名称只能包含小写字母、数字和连字符');
    }

    if (!config.template_name) {
      errors.push('模板名称不能为空');
    }

    // 资源验证
    if (config.memory_limit) {
      const memoryMB = this.parseMemory(config.memory_limit);
      if (memoryMB < 512) {
        warnings.push('内存配置过小，建议至少512Mi');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async previewConfig(workspace: string, config: any) {
    const template = await this.getTemplate(workspace, config.template_name);

    // 生成YAML配置
    const yamlConfig = this.generateYamlConfig(config, template);

    // 生成CLI命令
    const cliCommand = this.generateCliCommand(config);

    // 生成连接信息
    const connectionInfo = {
      internal: `${config.instance_name}.${config.namespace || 'middleware'}.svc.cluster.local`,
      external: config.enable_external ? `${config.instance_name}.example.com` : undefined
    };

    return {
      yaml: yamlConfig,
      cli_command: cliCommand,
      connection_info: connectionInfo
    };
  }

  async estimateCost(workspace: string, config: any) {
    // 简单的成本计算逻辑
    const cpuCost = this.parseCpu(config.cpu_limit || '500m') * 0.05; // $0.05 per core per month
    const memoryCost = this.parseMemory(config.memory_limit || '1Gi') / 1024 * 0.01; // $0.01 per GB per month
    const storageCost = this.parseStorage(config.storage_size || '10Gi') * 0.001; // $0.001 per GB per month
    const backupCost = config.backup_enabled ? storageCost * 0.5 : 0;

    return {
      cpu: cpuCost,
      memory: memoryCost,
      storage: storageCost,
      backup: backupCost,
      total: cpuCost + memoryCost + storageCost + backupCost
    };
  }

  async deploy(workspace: string, config: any) {
    const deploymentId = uuidv4();

    const deployment: DeploymentJob = {
      id: deploymentId,
      config,
      status: 'pending',
      progress: 0,
      startTime: new Date().toISOString(),
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '开始部署中间件实例...'
        }
      ]
    };

    this.deployments.set(deploymentId, deployment);

    // 模拟异步部署过程
    this.simulateDeployment(deploymentId);

    return {
      deploymentId,
      status: 'pending',
      message: '部署已开始'
    };
  }

  async getDeploymentStatus(workspace: string, deploymentId: string) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`部署 ${deploymentId} 不存在`);
    }
    return deployment;
  }

  async getDeploymentLogs(workspace: string, deploymentId: string) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`部署 ${deploymentId} 不存在`);
    }
    return {
      logs: deployment.logs
    };
  }

  async getInstances(workspace: string) {
    const workspaceInstances = this.instances.filter(i => i.workspace === workspace);
    return {
      instances: workspaceInstances
    };
  }

  async getInstance(workspace: string, instanceName: string) {
    const instance = this.instances.find(i => i.name === instanceName && i.workspace === workspace);
    if (!instance) {
      throw new Error(`实例 ${instanceName} 不存在`);
    }
    return instance;
  }

  async deleteInstance(workspace: string, instanceName: string) {
    const index = this.instances.findIndex(i => i.name === instanceName && i.workspace === workspace);
    if (index === -1) {
      throw new Error(`实例 ${instanceName} 不存在`);
    }
    this.instances.splice(index, 1);
  }

  async scaleInstance(workspace: string, instanceName: string, replicas: number) {
    const instance = await this.getInstance(workspace, instanceName);
    // 这里应该实现实际的扩缩容逻辑
    console.log(`扩缩容实例 ${instanceName} 到 ${replicas} 个副本`);
  }

  async restartInstance(workspace: string, instanceName: string) {
    const instance = await this.getInstance(workspace, instanceName);
    instance.lastActivity = new Date().toISOString();
    console.log(`重启实例 ${instanceName}`);
  }

  async getInstanceLogs(workspace: string, instanceName: string, lines?: number) {
    const instance = await this.getInstance(workspace, instanceName);

    // 模拟日志数据
    const logLines = [
      '2024-01-20 10:30:15 [INFO] Starting Redis server...',
      '2024-01-20 10:30:16 [INFO] Redis server started successfully',
      '2024-01-20 10:30:17 [INFO] Ready to accept connections',
      '2024-01-20 10:35:22 [INFO] Client connected: 192.168.1.100:45678',
      '2024-01-20 10:40:33 [INFO] Background saving started by pid 1234',
      '2024-01-20 10:40:34 [INFO] Background saving terminated with success'
    ];

    const limitedLogs = lines ? logLines.slice(-lines) : logLines;

    return {
      logs: limitedLogs
    };
  }

  // 端口占用检查功能
  async checkPortAvailability(
    workspace: string, 
    ports: number[], 
    sessionId?: string
  ): Promise<ServerPortCheck[]> {
    console.log(`开始检查工作空间 ${workspace} 的端口占用情况，端口列表:`, ports);
    
    try {
      if (!sessionId) {
        throw new Error('需要提供SSH会话ID');
      }
      
      // 检查SSH会话是否有效
      if (!authService.isSessionValid(sessionId)) {
        throw new Error('SSH会话无效或已过期');
      }
      
      const currentHost: ServerPortCheck = {
        serverId: 'current-ssh-session',
        serverName: '当前SSH会话服务器',
        serverHost: 'remote-server',
        connected: true,
        ports: []
      };

      // 检查每个端口
      for (const port of ports) {
        const portResult = await this.checkSinglePortWithSSH(sessionId, port);
        currentHost.ports.push(portResult);
      }
      
      return [currentHost];
      
    } catch (error: any) {
      console.error('端口检查失败:', error);
      return [{
        serverId: 'current-ssh-session',
        serverName: '当前SSH会话服务器',
        serverHost: 'remote-server',
        connected: false,
        ports: [],
        error: error.message
      }];
    }
  }

  private async checkSinglePortWithSSH(sessionId: string, port: number): Promise<PortCheckResult> {
    try {
      // 使用authService的executeCommand方法执行远程命令
      const checkCommand = `netstat -tln | grep :${port} | head -1`;
      const result = await authService.executeCommand(sessionId, checkCommand);
      
      const outputStr = result.stdout || '';
      const isOccupied = outputStr.trim().length > 0;
      
      console.log(`端口 ${port} 检查结果: ${isOccupied ? '已占用' : '可用'}, 输出: "${outputStr.trim()}"`);
      
      let processInfo: PortCheckResult['processInfo'];
      
      if (isOccupied) {
        // 如果端口被占用，获取进程信息
        try {
          const processCommand = `lsof -i :${port} | tail -n +2 | head -1 | awk '{print $2,$1,$3}'`;
          const processResult = await authService.executeCommand(sessionId, processCommand);
          
          const processOutputStr = processResult.stdout || '';
          if (processOutputStr.trim()) {
            const [pid, name, user] = processOutputStr.trim().split(' ');
            processInfo = { pid, name, user };
          }
        } catch (error) {
          // 获取进程信息失败，但端口仍被占用
          console.warn(`获取端口 ${port} 进程信息失败:`, error);
        }
      }
      
      return {
        port,
        isAvailable: !isOccupied,
        message: isOccupied ? `端口 ${port} 已被占用` : `端口 ${port} 可用`,
        processInfo,
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error(`检查端口 ${port} 时发生错误:`, error);
      return {
        port,
        isAvailable: false,
        message: `检查端口 ${port} 时发生错误: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkSinglePortLocal(port: number): Promise<PortCheckResult> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // 检查端口是否被占用的命令
      const checkCommand = `netstat -tln | grep :${port}`;
      
      let isOccupied = false;
      let outputStr = '';
      
      try {
        const result = await execAsync(checkCommand);
        outputStr = result.stdout || '';
        // 如果有输出，说明端口被占用
        isOccupied = outputStr.trim().length > 0;
        console.log(`端口 ${port} 检查结果: ${isOccupied ? '已占用' : '可用'}, 输出: "${outputStr.trim()}"`);
      } catch (error: any) {
        // grep 没有找到匹配的结果会返回退出码 1，这是正常的，表示端口没有被占用
        console.log(`端口 ${port} 检查命令执行结果: 退出码 ${error.code}, 错误: ${error.message}`);
        if (error.code === 1) {
          isOccupied = false;
        } else {
          // 其他错误（比如命令不存在）才是真正的错误
          throw error;
        }
      }
      
      let processInfo: PortCheckResult['processInfo'];
      
      if (isOccupied) {
        // 如果端口被占用，获取进程信息
        try {
          const processCommand = `lsof -i :${port} | tail -n +2 | head -1 | awk '{print $2,$1,$3}'`;
          const processResult = await execAsync(processCommand);
          
          const processOutputStr = processResult.stdout || '';
          if (processOutputStr.trim()) {
            const [pid, name, user] = processOutputStr.trim().split(' ');
            processInfo = { pid, name, user };
          }
        } catch (error) {
          // 获取进程信息失败，但端口仍被占用
          console.warn(`获取端口 ${port} 进程信息失败:`, error);
        }
      }
      
      return {
        port,
        isAvailable: !isOccupied,
        message: isOccupied ? `端口 ${port} 已被占用` : `端口 ${port} 可用`,
        processInfo,
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      return {
        port,
        isAvailable: false,
        message: `检查端口 ${port} 时发生错误: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkSinglePort(server: any, port: number): Promise<PortCheckResult> {
    try {
      // 检查端口是否被占用的命令
      const checkCommand = `netstat -tln | grep :${port} | head -1`;
      const result = await this.sshService.executeCommand(server, checkCommand);
      
      const outputStr = result.output.join('');
      const isOccupied = outputStr.trim().length > 0;
      
      let processInfo: PortCheckResult['processInfo'];
      
      if (isOccupied) {
        // 如果端口被占用，获取进程信息
        try {
          const processCommand = `lsof -i :${port} | tail -n +2 | head -1 | awk '{print $2,$1,$3}'`;
          const processResult = await this.sshService.executeCommand(server, processCommand);
          
          const processOutputStr = processResult.output.join('');
          if (processOutputStr.trim()) {
            const [pid, name, user] = processOutputStr.trim().split(' ');
            processInfo = { pid, name, user };
          }
        } catch (error) {
          // 获取进程信息失败，但端口仍被占用
          console.warn(`获取端口 ${port} 进程信息失败:`, error);
        }
      }
      
      return {
        port,
        isAvailable: !isOccupied,
        message: isOccupied ? `端口 ${port} 已被占用` : `端口 ${port} 可用`,
        processInfo,
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      return {
        port,
        isAvailable: false,
        message: `检查端口 ${port} 时发生错误: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async getWorkspaceTargetServers(workspace: string) {
    // 从 deploy-target 配置文件获取工作空间的目标服务器
    try {
      const deployTargetPath = `${process.env.HOME || process.env.USERPROFILE}/.deploy/deploy-target`;
      
      // 检查配置文件是否存在
      const fs = require('fs');
      if (!fs.existsSync(deployTargetPath)) {
        console.warn(`deploy-target 配置文件不存在: ${deployTargetPath}`);
        return [];
      }

      // 读取配置文件
      const content = fs.readFileSync(deployTargetPath, 'utf8');
      const lines = content.split('\n').filter((line: string) => 
        line.trim() && !line.trim().startsWith('#')
      );

      // 查找工作空间对应的服务器配置
      const targetServers = [];
      for (const line of lines) {
        const [key, value] = line.split('=');
        if (key && key.trim() === workspace && value) {
          // 解析服务器配置: username:host:password
          const [username, host, password] = value.trim().split(':');
          if (username && host && password) {
            // 构造远程服务器对象
            const server: RemoteServer = {
              id: `${workspace}-${host}`,
              name: `${workspace} 部署目标`,
              host: host,
              port: 22,
              username: username,
              authType: 'password' as const,
              password: password,
              tags: [workspace, 'deployment'],
              status: 'disconnected' as const,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            targetServers.push(server);
          }
        }
      }

      if (targetServers.length > 0) {
        console.log(`从 deploy-target 配置读取到 ${targetServers.length} 个服务器`, targetServers.map(s => s.host));
        return targetServers;
      } else {
        console.warn(`未在 deploy-target 配置中找到工作空间 '${workspace}' 的服务器配置`);
        return [];
      }
      
    } catch (error) {
      console.error('读取 deploy-target 配置失败:', error);
      return [];
    }
  }

  // 辅助方法
  private parseMemory(memoryStr: string): number {
    if (memoryStr.endsWith('Gi')) {
      return parseInt(memoryStr) * 1024;
    }
    if (memoryStr.endsWith('Mi')) {
      return parseInt(memoryStr);
    }
    return 0;
  }

  private parseCpu(cpuStr: string): number {
    if (cpuStr.endsWith('m')) {
      return parseInt(cpuStr) / 1000;
    }
    return parseInt(cpuStr);
  }

  private parseStorage(storageStr: string): number {
    if (storageStr.endsWith('Gi')) {
      return parseInt(storageStr);
    }
    if (storageStr.endsWith('Ti')) {
      return parseInt(storageStr) * 1024;
    }
    return 0;
  }

  private generateYamlConfig(config: any, template: MiddlewareTemplate): string {
    const yamlObj = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: config.instance_name,
        namespace: config.namespace || 'middleware',
        labels: {
          app: config.instance_name,
          template: template.name
        }
      },
      spec: {
        replicas: config.replicas || 1,
        selector: {
          matchLabels: {
            app: config.instance_name
          }
        },
        template: {
          metadata: {
            labels: {
              app: config.instance_name
            }
          },
          spec: {
            containers: [{
              name: template.type.toLowerCase(),
              image: `${template.type.toLowerCase()}:${template.version}`,
              resources: {
                requests: {
                  cpu: config.cpu_limit || '500m',
                  memory: config.memory_limit || '1Gi'
                },
                limits: {
                  cpu: config.cpu_limit || '500m',
                  memory: config.memory_limit || '1Gi'
                }
              }
            }]
          }
        }
      }
    };

    return yaml.dump(yamlObj);
  }

  private generateCliCommand(config: any): string {
    // 生成等效的 DevOps CLI 命令
    const templateName = config.template_name;
    const instanceName = config.instance_name;
    const namespace = config.namespace || 'middleware';
    
    let command = `devops run middleware ${templateName} ${instanceName}`;
    
    // 添加命名空间参数
    if (namespace !== 'middleware') {
      command += ` --namespace ${namespace}`;
    }
    
    // 添加服务端口配置（使用现代的 --service-port 参数）
    if (config.service_port) {
      command += ` --service-port "${config.service_port}"`;
    } else if (config.app_port) {
      // 如果有传统的 app_port 配置，转换为 service-port 格式
      command += ` --service-port "${config.app_port}"`;
    }
    
    // 传统单端口参数支持（向后兼容 --expose-port）
    if (config.expose_port && !config.service_port && !config.app_port) {
      command += ` --expose-port "${config.expose_port}"`;
    }
    
    // 添加导出端口配置
    if (config.export_port) {
      command += ` --export-port "${config.export_port}"`;
    }
    
    // 添加资源配置
    if (config.cpu_limit) {
      command += ` --cpu-limit ${config.cpu_limit}`;
    }
    
    if (config.memory_limit) {
      command += ` --memory-limit ${config.memory_limit}`;
    }
    
    if (config.storage_size) {
      command += ` --storage-size ${config.storage_size}`;
    }
    
    // 添加副本数配置
    if (config.replicas && config.replicas > 1) {
      command += ` --replicas ${config.replicas}`;
    }
    
    // 添加高级配置选项
    if (config.backup_enabled) {
      command += ` --backup-enabled`;
    }
    
    if (config.monitoring_enabled) {
      command += ` --monitoring-enabled`;
    }
    
    if (config.network_policy_enabled) {
      command += ` --network-policy`;
    }
    
    return command;
  }

  private simulateDeployment(deploymentId: string) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    const steps = [
      { progress: 10, message: '验证配置参数...' },
      { progress: 25, message: '生成部署文件...' },
      { progress: 40, message: '创建存储卷...' },
      { progress: 60, message: '部署应用实例...' },
      { progress: 80, message: '等待服务就绪...' },
      { progress: 100, message: '部署完成' }
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex >= steps.length) {
        deployment.status = 'completed';
        deployment.endTime = new Date().toISOString();
        clearInterval(interval);

        // 创建实例
        const newInstance: MiddlewareInstance = {
          name: deployment.config.instance_name,
          template: deployment.config.template_name,
          namespace: deployment.config.namespace || 'middleware',
          workspace: deployment.config.workspace,
          status: 'running',
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          resources: {
            cpu: {
              request: deployment.config.cpu_limit || '500m',
              limit: deployment.config.cpu_limit || '500m',
              usage: Math.random() * 0.8
            },
            memory: {
              request: deployment.config.memory_limit || '1Gi',
              limit: deployment.config.memory_limit || '1Gi',
              usage: Math.random() * 0.8
            },
            storage: {
              size: deployment.config.storage_size || '10Gi',
              used: Math.random() * 0.5
            }
          },
          connectionInfo: {
            internal: `${deployment.config.instance_name}.${deployment.config.namespace || 'middleware'}.svc.cluster.local`
          },
          ports: [
            {
              name: 'main',
              port: 6379,
              targetPort: 6379,
              protocol: 'TCP'
            }
          ]
        };

        this.instances.push(newInstance);
        return;
      }

      const step = steps[stepIndex];
      deployment.progress = step.progress;
      deployment.status = 'running';
      deployment.logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: step.message
      });

      stepIndex++;
    }, 2000);
  }
}
