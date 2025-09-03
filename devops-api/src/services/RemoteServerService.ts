import { v4 as uuidv4 } from 'uuid';
import { SSHService } from './SSHService';

export interface RemoteServer {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  privateKey?: string;
  passphrase?: string;
  description?: string;
  tags: string[];
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency?: number;
  error?: string;
  systemInfo?: {
    os: string;
    kernel: string;
    architecture: string;
  };
}

export class RemoteServerService {
  private servers: Map<string, RemoteServer> = new Map();
  private sshService: SSHService;

  constructor() {
    this.sshService = new SSHService();
    this.initializeDefaultServers();
  }

  // 初始化默认服务器配置
  private initializeDefaultServers() {
    const defaultServers: Omit<RemoteServer, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: '开发服务器',
        host: '192.168.1.100',
        port: 22,
        username: 'devops',
        authType: 'password',
        password: 'devops123',
        description: '开发环境服务器',
        tags: ['development', 'testing'],
        status: 'disconnected'
      },
      {
        name: '生产服务器',
        host: '10.0.0.100',
        port: 22,
        username: 'deploy',
        authType: 'key',
        privateKey: '~/.ssh/id_rsa',
        description: '生产环境服务器',
        tags: ['production', 'critical'],
        status: 'disconnected'
      },
      {
        name: '测试服务器',
        host: '192.168.1.200',
        port: 22,
        username: 'test',
        authType: 'password',
        password: 'test123',
        description: '测试环境服务器',
        tags: ['testing', 'staging'],
        status: 'disconnected'
      }
    ];

    defaultServers.forEach(serverData => {
      const server: RemoteServer = {
        ...serverData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.servers.set(server.id, server);
    });
  }

  // 获取所有服务器
  async getServers(): Promise<RemoteServer[]> {
    return Array.from(this.servers.values()).map(server => ({
      ...server,
      // 不返回敏感信息
      password: server.password ? '******' : undefined,
      privateKey: server.privateKey ? '******' : undefined,
      passphrase: server.passphrase ? '******' : undefined
    }));
  }

  // 根据ID获取服务器（包含敏感信息，仅内部使用）
  async getServerById(serverId: string): Promise<RemoteServer | undefined> {
    return this.servers.get(serverId);
  }

  // 添加服务器
  async addServer(serverData: Omit<RemoteServer, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<RemoteServer> {
    // 验证必填字段
    if (!serverData.name || !serverData.host || !serverData.username) {
      throw new Error('服务器名称、主机地址和用户名不能为空');
    }

    // 验证认证配置
    if (serverData.authType === 'password' && !serverData.password) {
      throw new Error('密码认证需要提供密码');
    }
    if (serverData.authType === 'key' && !serverData.privateKey) {
      throw new Error('密钥认证需要提供私钥路径');
    }

    // 检查是否存在相同的服务器
    const existingServer = Array.from(this.servers.values())
      .find(s => s.host === serverData.host && s.port === serverData.port && s.username === serverData.username);
    
    if (existingServer) {
      throw new Error(`服务器 ${serverData.host}:${serverData.port} (用户: ${serverData.username}) 已存在`);
    }

    const server: RemoteServer = {
      ...serverData,
      id: uuidv4(),
      port: serverData.port || 22,
      tags: serverData.tags || [],
      status: 'disconnected',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.servers.set(server.id, server);
    return this.sanitizeServer(server);
  }

  // 更新服务器配置
  async updateServer(serverId: string, updateData: Partial<RemoteServer>): Promise<RemoteServer> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    // 验证更新数据
    if (updateData.authType === 'password' && updateData.password === undefined && server.authType !== 'password') {
      throw new Error('密码认证需要提供密码');
    }
    if (updateData.authType === 'key' && updateData.privateKey === undefined && server.authType !== 'key') {
      throw new Error('密钥认证需要提供私钥路径');
    }

    const updatedServer = {
      ...server,
      ...updateData,
      id: serverId, // 确保ID不被修改
      updatedAt: new Date()
    };

    this.servers.set(serverId, updatedServer);
    return this.sanitizeServer(updatedServer);
  }

  // 删除服务器
  async deleteServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    this.servers.delete(serverId);
  }

  // 测试连接
  async testConnection(serverId: string): Promise<ConnectionTestResult> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    const startTime = Date.now();

    try {
      // 测试SSH连接
      const connected = await this.sshService.testConnection(server);
      
      if (!connected) {
        await this.updateServerStatus(serverId, 'error');
        return {
          success: false,
          message: 'SSH连接失败',
          error: '无法建立SSH连接'
        };
      }

      // 获取基本系统信息
      const systemInfoResult = await this.sshService.executeCommand(server, 'uname -a', { timeout: 5000 });
      let systemInfo;
      
      if (systemInfoResult.exitCode === 0) {
        const output = systemInfoResult.output.join(' ').trim();
        const parts = output.split(' ');
        systemInfo = {
          os: parts[0] || 'Unknown',
          kernel: parts[2] || 'Unknown',
          architecture: parts[parts.length - 1] || 'Unknown'
        };
      }

      const latency = Date.now() - startTime;
      await this.updateServerStatus(serverId, 'connected');

      return {
        success: true,
        message: '连接成功',
        latency,
        systemInfo
      };

    } catch (error: any) {
      await this.updateServerStatus(serverId, 'error');
      return {
        success: false,
        message: '连接测试失败',
        error: error.message,
        latency: Date.now() - startTime
      };
    }
  }

  // 更新服务器状态
  private async updateServerStatus(serverId: string, status: RemoteServer['status']) {
    const server = this.servers.get(serverId);
    if (server) {
      server.status = status;
      server.updatedAt = new Date();
      if (status === 'connected') {
        server.lastConnected = new Date();
      }
      this.servers.set(serverId, server);
    }
  }

  // 清理敏感信息
  private sanitizeServer(server: RemoteServer): RemoteServer {
    return {
      ...server,
      password: server.password ? '******' : undefined,
      privateKey: server.privateKey ? '******' : undefined,
      passphrase: server.passphrase ? '******' : undefined
    };
  }

  // 获取服务器统计信息
  async getServerStats() {
    const servers = Array.from(this.servers.values());
    const total = servers.length;
    const connected = servers.filter(s => s.status === 'connected').length;
    const disconnected = servers.filter(s => s.status === 'disconnected').length;
    const error = servers.filter(s => s.status === 'error').length;

    return {
      total,
      connected,
      disconnected,
      error,
      tags: this.getAllTags()
    };
  }

  // 获取所有标签
  private getAllTags(): string[] {
    const tags = new Set<string>();
    this.servers.forEach(server => {
      server.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }

  // 批量测试连接
  async batchTestConnections(): Promise<Map<string, ConnectionTestResult>> {
    const results = new Map<string, ConnectionTestResult>();
    const servers = Array.from(this.servers.values());

    // 并发测试连接，但限制并发数量
    const batchSize = 5;
    for (let i = 0; i < servers.length; i += batchSize) {
      const batch = servers.slice(i, i + batchSize);
      const promises = batch.map(server => 
        this.testConnection(server.id).then(result => ({
          serverId: server.id,
          result
        }))
      );

      const batchResults = await Promise.allSettled(promises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.set(result.value.serverId, result.value.result);
        }
      });
    }

    return results;
  }

  // 根据标签筛选服务器
  async getServersByTags(tags: string[]): Promise<RemoteServer[]> {
    const servers = Array.from(this.servers.values());
    return servers.filter(server => 
      tags.some(tag => server.tags.includes(tag))
    ).map(server => this.sanitizeServer(server));
  }

  // 导出服务器配置（不包含敏感信息）
  async exportServersConfig(): Promise<any[]> {
    const servers = await this.getServers();
    return servers.map(server => ({
      name: server.name,
      host: server.host,
      port: server.port,
      username: server.username,
      authType: server.authType,
      description: server.description,
      tags: server.tags
    }));
  }

  // 导入服务器配置
  async importServersConfig(configs: any[]): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const config of configs) {
      try {
        await this.addServer(config);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`${config.name || config.host}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }
}