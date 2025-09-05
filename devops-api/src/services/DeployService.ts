import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { RemoteServerService } from './RemoteServerService';
import { SSHService } from './SSHService';

export interface CommandExecution {
  id: string;
  serverId: string;
  workspace: string;
  command: string;
  args: string[];
  workingDir?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  output: string[];
  error: string[];
  pid?: number;
}

export interface ApplicationDeployment {
  id: string;
  name: string;
  type: 'java' | 'vue' | 'go' | 'nginx' | 'tomcat' | 'python';
  workspace: string;
  serverId: string;
  gitUrl?: string;
  svnUrl?: string;
  branch?: string;
  buildTool?: string;
  template?: string;
  namespace?: string;
  ports?: {
    app?: number;
    expose?: number;
    service?: string;
    export?: string;
  };
  resources?: {
    cpu?: string;
    memory?: string;
    storage?: string;
  };
  status: 'deploying' | 'running' | 'stopped' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface RemoteResource {
  workspaces: string[];
  templates: {
    type: string;
    name: string;
    path: string;
  }[];
  deployments: {
    name: string;
    status: string;
    type: string;
    namespace?: string;
  }[];
}

export class DeployService {
  private executions: Map<string, CommandExecution> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private serverService: RemoteServerService;
  private sshService: SSHService;

  constructor() {
    this.serverService = new RemoteServerService();
    this.sshService = new SSHService();
  }

  // 执行远程命令
  async executeCommand(options: {
    serverId: string;
    command: string;
    args: string[];
    workingDir?: string;
    timeout?: number;
    workspace: string;
  }): Promise<CommandExecution> {
    const executionId = uuidv4();
    const server = await this.serverService.getServerById(options.serverId);
    
    if (!server) {
      throw new Error(`服务器 ${options.serverId} 不存在`);
    }

    const execution: CommandExecution = {
      id: executionId,
      serverId: options.serverId,
      workspace: options.workspace,
      command: options.command,
      args: options.args,
      workingDir: options.workingDir,
      status: 'pending',
      startTime: new Date(),
      output: [],
      error: []
    };

    this.executions.set(executionId, execution);

    // 异步执行命令
    this.runRemoteCommand(execution, server, options.timeout).catch(error => {
      console.error('命令执行失败:', error);
      execution.status = 'failed';
      execution.error.push(error.message);
      execution.endTime = new Date();
    });

    return execution;
  }

  // 运行远程命令
  private async runRemoteCommand(execution: CommandExecution, server: any, timeout = 300000) {
    try {
      execution.status = 'running';
      
      // 构建完整的命令
      const fullCommand = `cd ${execution.workingDir || '~'} && ${execution.command} ${execution.args.join(' ')}`;
      
      // 使用SSH执行远程命令
      const result = await this.sshService.executeCommand(server, fullCommand, {
        timeout,
        onData: (data: string) => {
          execution.output.push(data);
        },
        onError: (error: string) => {
          execution.error.push(error);
        }
      });

      execution.exitCode = result.exitCode;
      execution.status = result.exitCode === 0 ? 'completed' : 'failed';
      execution.endTime = new Date();

    } catch (error: any) {
      execution.status = 'failed';
      execution.error.push(error.message);
      execution.endTime = new Date();
      throw error;
    }
  }

  // 获取执行历史
  async getExecutionHistory(options: {
    page: number;
    size: number;
    status?: string;
    serverId?: string;
  }) {
    const executions = Array.from(this.executions.values());
    
    let filtered = executions;
    if (options.status) {
      filtered = executions.filter(e => e.status === options.status);
    }
    if (options.serverId) {
      filtered = filtered.filter(e => e.serverId === options.serverId);
    }

    // 按时间倒序排序
    filtered.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    const start = (options.page - 1) * options.size;
    const end = start + options.size;
    const items = filtered.slice(start, end);

    return {
      items,
      total: filtered.length,
      page: options.page,
      size: options.size,
      pages: Math.ceil(filtered.length / options.size)
    };
  }

  // 获取执行详情
  async getExecutionDetails(executionId: string): Promise<CommandExecution> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error('执行记录不存在');
    }
    return execution;
  }

  // 获取执行日志
  async getExecutionLogs(executionId: string) {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error('执行记录不存在');
    }

    return {
      executionId,
      output: execution.output,
      error: execution.error,
      status: execution.status
    };
  }

  // 取消执行
  async cancelExecution(executionId: string) {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error('执行记录不存在');
    }

    if (execution.status === 'running') {
      const process = this.processes.get(executionId);
      if (process) {
        process.kill('SIGTERM');
        this.processes.delete(executionId);
      }
      execution.status = 'cancelled';
      execution.endTime = new Date();
    }
  }

  // 获取 devops 状态
  async getDevopsStatus(serverId: string) {
    const server = await this.serverService.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    try {
      // 检查 devops 命令是否可用
      const versionResult = await this.sshService.executeCommand(server, 'devops --version', { timeout: 10000 });
      
      // 获取工作空间信息
      const workspaceResult = await this.sshService.executeCommand(server, 'ls -la ~/devops/workspace/', { timeout: 10000 });

      return {
        isInstalled: versionResult.exitCode === 0,
        version: versionResult.output.join('').trim(),
        workspaces: this.parseWorkspaceList(workspaceResult.output.join('')),
        lastCheck: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        isInstalled: false,
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  // 解析工作空间列表
  private parseWorkspaceList(output: string): string[] {
    const lines = output.split('\n');
    const workspaces: string[] = [];
    
    for (const line of lines) {
      if (line.includes('drwx') && !line.includes('.') && !line.includes('..')) {
        const parts = line.trim().split(/\s+/);
        const name = parts[parts.length - 1];
        if (name && name !== '.' && name !== '..') {
          workspaces.push(name);
        }
      }
    }
    
    return workspaces;
  }

  // 部署应用
  async deployApplication(config: {
    name: string;
    type: 'java' | 'vue' | 'go' | 'nginx' | 'tomcat' | 'python';
    workspace: string;
    serverId: string;
    gitUrl?: string;
    svnUrl?: string;
    branch?: string;
    buildTool?: string;
    template?: string;
    namespace?: string;
    ports?: any;
    resources?: any;
    [key: string]: any;
  }): Promise<ApplicationDeployment> {
    const deploymentId = uuidv4();
    
    // 构建 devops 命令
    const devopsArgs = this.buildDevopsCommand(config);
    
    // 执行部署命令
    const execution = await this.executeCommand({
      serverId: config.serverId,
      command: 'devops',
      args: devopsArgs,
      workspace: config.workspace
    });

    const deployment: ApplicationDeployment = {
      id: deploymentId,
      name: config.name,
      type: config.type,
      workspace: config.workspace,
      serverId: config.serverId,
      gitUrl: config.gitUrl,
      svnUrl: config.svnUrl,
      branch: config.branch,
      buildTool: config.buildTool,
      template: config.template,
      namespace: config.namespace,
      ports: config.ports,
      resources: config.resources,
      status: 'deploying',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return deployment;
  }

  // 构建 devops 命令参数
  private buildDevopsCommand(config: any): string[] {
    const args = ['run', config.type];
    
    if (config.gitUrl) {
      args.push('--git-url', config.gitUrl);
    }
    if (config.svnUrl) {
      args.push('--svn-url', config.svnUrl);
    }
    if (config.branch) {
      args.push('--git-branch', config.branch);
    }
    if (config.buildTool) {
      args.push('--build-tool', config.buildTool);
    }
    if (config.template) {
      args.push('--template', config.template);
    }
    if (config.namespace) {
      args.push('--namespace', config.namespace);
    }
    if (config.workspace) {
      args.push('--workspace', config.workspace);
    }
    if (config.ports?.app) {
      args.push('--app-port', config.ports.app.toString());
    }
    if (config.ports?.expose) {
      args.push('--expose-port', config.ports.expose.toString());
    }
    if (config.ports?.service) {
      args.push('--service-port', config.ports.service);
    }
    if (config.ports?.export) {
      args.push('--export-port', config.ports.export);
    }
    
    args.push(config.name);
    
    return args;
  }

  // 获取应用列表
  async getApplications(workspace: string, serverId?: string): Promise<ApplicationDeployment[]> {
    // 这里应该查询远程服务器上的实际部署状态
    // 暂时返回模拟数据
    return [
      {
        id: uuidv4(),
        name: 'user-service',
        type: 'java',
        workspace,
        serverId: serverId || 'default',
        status: 'running',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'web-frontend',
        type: 'vue',
        workspace,
        serverId: serverId || 'default',
        status: 'running',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  // 获取应用详情
  async getApplicationDetails(workspace: string, appName: string, serverId?: string) {
    // 实际实现中应该查询远程服务器
    return {
      name: appName,
      workspace,
      serverId,
      status: 'running',
      replicas: 3,
      ports: [8080, 9090],
      resources: {
        cpu: '1000m',
        memory: '2Gi'
      },
      createdAt: new Date(),
      lastUpdated: new Date()
    };
  }

  // 控制应用（启动/停止/重启）
  async controlApplication(workspace: string, appName: string, action: 'start' | 'stop' | 'restart', serverId: string) {
    const server = await this.serverService.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    let command = '';
    switch (action) {
      case 'start':
        command = `kubectl scale deployment ${appName} --replicas=3 -n ${workspace}`;
        break;
      case 'stop':
        command = `kubectl scale deployment ${appName} --replicas=0 -n ${workspace}`;
        break;
      case 'restart':
        command = `kubectl rollout restart deployment ${appName} -n ${workspace}`;
        break;
    }

    const result = await this.sshService.executeCommand(server, command, { timeout: 30000 });
    
    return {
      action,
      appName,
      workspace,
      success: result.exitCode === 0,
      message: result.output.join('') || result.error.join('')
    };
  }

  // 删除应用
  async deleteApplication(workspace: string, appName: string, serverId: string) {
    const server = await this.serverService.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    const command = `kubectl delete deployment ${appName} -n ${workspace}`;
    const result = await this.sshService.executeCommand(server, command, { timeout: 30000 });
    
    if (result.exitCode !== 0) {
      throw new Error(`删除应用失败: ${result.error.join('')}`);
    }
  }

  // 获取远程工作空间
  async getRemoteWorkspaces(serverId: string): Promise<string[]> {
    const server = await this.serverService.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    const result = await this.sshService.executeCommand(server, 'ls ~/devops/workspace/', { timeout: 10000 });
    return this.parseWorkspaceList(result.output.join(''));
  }

  // 获取远程模板
  async getRemoteTemplates(serverId: string, type?: string) {
    const server = await this.serverService.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    const command = type ? `find ~/devops/templates -name "*${type}*" -type d` : 'find ~/devops/templates -type d -maxdepth 3';
    const result = await this.sshService.executeCommand(server, command, { timeout: 10000 });
    
    return result.output
      .filter(line => line.trim())
      .map(path => ({
        name: path.split('/').pop(),
        path: path.trim(),
        type: '' // 移除类型推断
      }));
  }



  // 获取远程部署状态
  async getRemoteDeployments(serverId: string, workspace?: string) {
    const server = await this.serverService.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    const namespaceFilter = workspace ? `-n ${workspace}` : '--all-namespaces';
    const command = `kubectl get deployments ${namespaceFilter} -o wide`;
    
    const result = await this.sshService.executeCommand(server, command, { timeout: 15000 });
    
    // 解析 kubectl 输出
    return this.parseKubectlDeployments(result.output.join('\n'));
  }

  // 解析 kubectl 部署输出
  private parseKubectlDeployments(output: string) {
    const lines = output.split('\n');
    const deployments = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const parts = line.split(/\s+/);
        if (parts.length >= 6) {
          deployments.push({
            name: parts[0],
            namespace: parts[1] || 'default',
            ready: parts[2],
            upToDate: parts[3],
            available: parts[4],
            age: parts[5]
          });
        }
      }
    }
    
    return deployments;
  }

  // 获取系统信息
  async getSystemInfo(serverId: string) {
    const server = await this.serverService.getServerById(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    const commands = {
      os: 'uname -a',
      cpu: 'nproc',
      memory: 'free -h',
      disk: 'df -h /',
      docker: 'docker --version',
      kubectl: 'kubectl version --client --short',
      devops: 'devops --version'
    };

    const info: any = {};
    
    for (const [key, command] of Object.entries(commands)) {
      try {
        const result = await this.sshService.executeCommand(server, command, { timeout: 10000 });
        info[key] = {
          success: result.exitCode === 0,
          output: result.output.join('').trim(),
          error: result.error.join('').trim()
        };
      } catch (error: any) {
        info[key] = {
          success: false,
          error: error.message
        };
      }
    }

    return info;
  }
}