import { Client } from 'ssh2';
import { v4 as uuidv4 } from 'uuid';

export interface SSHCredentials {
  host: string;
  username: string;
  password: string;
}

export interface SessionInfo {
  sessionId: string;
  host: string;
  username: string;
  password: string; // 在内存中保存密码用于自动重连
  connected: boolean;
  connectedAt: Date;
  client: Client;
}

export class AuthService {
  private sessions = new Map<string, SessionInfo>();
  private readonly rootPath = '/root/devops';

  /**
   * SSH登录认证
   */
  async loginWithSSH(credentials: SSHCredentials): Promise<{ sessionId: string; defaultWorkspace?: string; availableWorkspaces: string[] }> {
    const sessionId = uuidv4();
    
    return new Promise((resolve, reject) => {
      const client = new Client();
      
      const timeoutId = setTimeout(() => {
        client.destroy();
        reject(new Error('SSH连接超时'));
      }, 15000);

      client.on('ready', async () => {
        clearTimeout(timeoutId);
        
        // 创建会话信息，包含密码用于自动重连
        const sessionInfo: SessionInfo = {
          sessionId,
          host: credentials.host,
          username: credentials.username,
          password: credentials.password, // 在内存中保存密码
          connected: true,
          connectedAt: new Date(),
          client
        };
        
        this.sessions.set(sessionId, sessionInfo);
        
        try {
          // 使用批量优化方法获取工作空间信息
          const workspaceInfo = await this.getWorkspaceInfo(sessionInfo);
          
          console.log(`用户 ${credentials.username}@${credentials.host} 登录成功`);
          resolve({
            sessionId,
            defaultWorkspace: workspaceInfo.defaultWorkspace,
            availableWorkspaces: workspaceInfo.availableWorkspaces
          });
        } catch (error) {
          console.error('获取工作空间信息失败:', error);
          resolve({
            sessionId,
            availableWorkspaces: []
          });
        }
      });

      client.on('error', (err) => {
        clearTimeout(timeoutId);
        console.error(`SSH登录失败: ${credentials.username}@${credentials.host}`, err.message);
        
        // 根据错误类型返回更具体的错误信息
        if (err.message.includes('Authentication failed')) {
          reject(new Error('用户名或密码错误'));
        } else if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
          reject(new Error('无法连接到主机，请检查主机地址和端口'));
        } else if (err.message.includes('timeout')) {
          reject(new Error('连接超时，请检查网络连接'));
        } else {
          reject(new Error(`SSH连接失败: ${err.message}`));
        }
      });

      client.on('close', () => {
        console.log(`SSH会话已关闭: ${sessionId}`);
        // 更新会话状态
        const sessionInfo = this.sessions.get(sessionId);
        if (sessionInfo) {
          sessionInfo.connected = false;
          // 保留会话信息一段时间，但标记为断开
          setTimeout(() => {
            this.sessions.delete(sessionId);
          }, 5000); // 5秒后删除会话
        }
      });

      // 连接SSH
      client.connect({
        host: credentials.host,
        username: credentials.username,
        password: credentials.password,
        port: 22,
        readyTimeout: 30000, // 增加连接超时时间
        keepaliveInterval: 15000, // 更频繁的心跳
        keepaliveCountMax: 10 // 增加心跳次数
      });
    });
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 登出
   */
  logout(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.client.destroy();
      } catch (error) {
        console.error('关闭SSH连接时出错:', error);
      }
      this.sessions.delete(sessionId);
      console.log(`用户 ${session.username}@${session.host} 已登出`);
    }
  }

  /**
   * 检查会话是否有效
   */
  isSessionValid(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.connected === true;
  }

  /**
   * 检查SSH连接健康状态
   */
  async checkConnectionHealth(sessionId: string): Promise<boolean> {
    const session = this.getSession(sessionId);
    if (!session || !session.connected) {
      return false;
    }
    
    try {
      // 使用简单的echo命令测试连接
      const result = await this.executeCommand(sessionId, 'echo "health_check"', 5000);
      return result.exitCode === 0 && result.stdout.includes('health_check');
    } catch (error) {
      console.warn(`SSH连接健康检查失败: ${error}`);
      // 更新会话状态
      if (session) {
        session.connected = false;
      }
      return false;
    }
  }

  /**
   * 执行远程命令
   */
  async executeCommand(sessionId: string, command: string, timeout: number = 60000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const session = this.getSession(sessionId);
    if (!session || !session.connected) {
      throw new Error('会话不存在或已断开');
    }

    return new Promise((resolve, reject) => {
      // 设置超时处理
      const timeoutId = setTimeout(() => {
        reject(new Error(`命令执行超时 (${timeout}ms): ${command.slice(0, 100)}...`));
      }, timeout);
      
      session.client.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timeoutId);
          reject(new Error(`执行命令失败: ${err.message}`));
          return;
        }

        let stdout = '';
        let stderr = '';
        
        stream.on('close', (code: number) => {
          clearTimeout(timeoutId);
          resolve({ stdout, stderr, exitCode: code });
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on('error', (error: Error) => {
          clearTimeout(timeoutId);
          reject(new Error(`命令执行出错: ${error.message}`));
        });
      });
    });
  }

  /**
   * 读取远程文件
   */
  async readRemoteFile(sessionId: string, filePath: string): Promise<string> {
    try {
      // 使用SSH命令而不是SFTP来读取文件
      const result = await this.executeCommand(sessionId, `cat "${filePath}" 2>/dev/null || echo ""`);

      if (result.exitCode !== 0) {
        throw new Error(`文件不存在或无法读取: ${filePath}`);
      }

      return result.stdout;
    } catch (error: any) {
      throw new Error(`读取远程文件失败: ${error.message}`);
    }
  }

  /**
   * 写入远程文件
   */
  async writeRemoteFile(sessionId: string, filePath: string, content: string): Promise<void> {
    const session = this.getSession(sessionId);
    if (!session || !session.connected) {
      throw new Error('会话不存在或已断开');
    }

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) {
          reject(new Error(`SFTP连接失败: ${err.message}`));
          return;
        }

        sftp.writeFile(filePath, content, 'utf8', (err) => {
          if (err) {
            reject(new Error(`写入文件失败: ${err.message}`));
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * 列出远程目录内容
   */
  async listRemoteDirectory(sessionId: string, dirPath: string): Promise<string[]> {
    try {
      // 使用一条命令同时列出目录并过滤出子目录
      const command = `find "${dirPath}" -maxdepth 1 -type d -not -path "${dirPath}" -printf "%f\\n" 2>/dev/null | grep -v "^\\." | sort`;
      const result = await this.executeCommand(sessionId, command);

      if (result.exitCode !== 0) {
        console.warn(`目录不存在或无法访问: ${dirPath}`);
        return [];
      }

      const output = result.stdout.trim();
      if (!output) {
        return [];
      }

      // 分割输出并过滤空行
      return output.split('\n')
        .map(item => item.trim())
        .filter(item => item);

    } catch (error: any) {
      console.error(`列出远程目录失败: ${dirPath}`, error);
      return [];
    }
  }

  /**
   * 检查远程文件是否存在
   */
  async remoteFileExists(sessionId: string, filePath: string): Promise<boolean> {
    try {
      const result = await this.executeCommand(sessionId, `test -f "${filePath}" && echo "exists"`);
      return result.exitCode === 0 && result.stdout.includes('exists');
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取默认工作空间
   */
  async getDefaultWorkspace(session: SessionInfo): Promise<string | undefined> {
    try {
      // 直接尝试读取enable文件，如果不存在会抛出异常
      const content = await this.readRemoteFile(session.sessionId, `${this.rootPath}/workspace/enable`);
      
      // 解析enable文件，查找ENABEL_WORKSPACE_PATH
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('ENABEL_WORKSPACE_PATH=')) {
          const value = trimmed.split('=')[1];
          return value?.replace(/"/g, '').trim();
        }
      }
      
      return undefined;
    } catch (error) {
      // 文件不存在或读取失败时返回undefined
      return undefined;
    }
  }

  /**
   * 获取所有可用工作空间
   */
  async getAvailableWorkspaces(session: SessionInfo): Promise<string[]> {
    try {
      const workspaces = await this.listRemoteDirectory(session.sessionId, `${this.rootPath}/workspace`);
      return workspaces.filter(name => 
        !name.startsWith('.') &&
        name !== 'enable' &&
        name !== '.devops-web'
      ); // 过滤掉系统目录和隐藏文件
    } catch (error) {
      console.error('获取可用工作空间失败:', error);
      return [];
    }
  }

  /**
   * 批量获取工作空间信息（优化版本）
   * 一次SSH调用获取工作空间列表和默认工作空间
   */
  async getWorkspaceInfo(session: SessionInfo): Promise<{
    availableWorkspaces: string[];
    defaultWorkspace: string | undefined;
  }> {
    try {
      // 创建一个批量脚本，一次性获取所有信息
      const batchScript = `#!/bin/bash
# 列出工作空间目录
echo "=== WORKSPACES ==="
ls -1 "${this.rootPath}/workspace" 2>/dev/null | grep -v '^\\.\\|^enable$' || echo "NO_WORKSPACES"

echo "=== DEFAULT_WORKSPACE ==="
# 读取默认工作空间配置（如果存在）
if [ -f "${this.rootPath}/workspace/enable" ]; then
  grep "^ENABEL_WORKSPACE_PATH=" "${this.rootPath}/workspace/enable" 2>/dev/null || echo "NO_DEFAULT"
else
  echo "NO_DEFAULT"
fi
`;

      const result = await this.executeCommand(session.sessionId, batchScript);
      
      if (result.exitCode !== 0) {
        console.warn('批量获取工作空间信息警告:', result.stderr);
        return { availableWorkspaces: [], defaultWorkspace: undefined };
      }

      const output = result.stdout;
      const lines = output.split('\n').map(line => line.trim()).filter(Boolean);
      
      let availableWorkspaces: string[] = [];
      let defaultWorkspace: string | undefined;
      
      let currentSection = '';
      for (const line of lines) {
        if (line === '=== WORKSPACES ===') {
          currentSection = 'workspaces';
        } else if (line === '=== DEFAULT_WORKSPACE ===') {
          currentSection = 'default';
        } else if (currentSection === 'workspaces' && line !== 'NO_WORKSPACES') {
          availableWorkspaces.push(line);
        } else if (currentSection === 'default' && line !== 'NO_DEFAULT') {
          // 解析 ENABEL_WORKSPACE_PATH=value
          if (line.startsWith('ENABEL_WORKSPACE_PATH=')) {
            const value = line.split('=')[1];
            defaultWorkspace = value?.replace(/"/g, '').trim();
          }
        }
      }

      console.log(`批量获取工作空间信息成功: ${availableWorkspaces.length}个工作空间, 默认: ${defaultWorkspace}`);
      return { availableWorkspaces, defaultWorkspace };

    } catch (error) {
      console.error('批量获取工作空间信息失败:', error);
      return { availableWorkspaces: [], defaultWorkspace: undefined };
    }
  }

  /**
   * 清理过期会话
   */
  cleanupSessions(): void {
    const now = new Date();
    const maxAge = 2 * 60 * 60 * 1000; // 2小时

    for (const [sessionId, session] of this.sessions) {
      if (now.getTime() - session.connectedAt.getTime() > maxAge) {
        this.logout(sessionId);
      }
    }
  }

  /**
   * 获取所有会话状态
   */
  getSessionsStatus(): Array<{ sessionId: string; host: string; username: string; connectedAt: Date }> {
    return Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      host: session.host,
      username: session.username,
      connectedAt: session.connectedAt
    }));
  }

  /**
   * 尝试重新建立SSH连接（带重试机制）
   */
  async attemptReconnection(sessionId: string, maxRetries: number = 2): Promise<{ success: boolean; message?: string }> {
    const sessionInfo = this.sessions.get(sessionId);
    if (!sessionInfo) {
      return { success: false, message: '会话信息不存在' };
    }

    console.log(`尝试重新连接到 ${sessionInfo.username}@${sessionInfo.host}，最大重试次数: ${maxRetries}...`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`第 ${attempt} 次重连尝试...`);
      
      const result = await this.singleReconnectAttempt(sessionInfo, sessionId, attempt);
      if (result.success) {
        console.log(`SSH重连成功（第 ${attempt} 次尝试）`);
        return result;
      }
      
      // 如果不是最后一次尝试，等待一段时间再重试
      if (attempt < maxRetries) {
        const waitTime = attempt * 2000; // 递增等待时间：2s, 4s
        console.log(`第 ${attempt} 次重连失败，${waitTime/1000}秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.log(`所有重连尝试都失败，放弃重连`);
        return { success: false, message: `重连失败（尝试 ${maxRetries} 次）` };
      }
    }
    
    return { success: false, message: '重连失败' };
  }
  
  /**
   * 单次重连尝试
   */
  private async singleReconnectAttempt(sessionInfo: SessionInfo, sessionId: string, attempt: number): Promise<{ success: boolean; message?: string }> {
    return new Promise((resolve) => {
      const newClient = new Client();
      
      const timeoutId = setTimeout(() => {
        newClient.destroy();
        resolve({ success: false, message: `第 ${attempt} 次SSH重连超时` });
      }, 8000); // 8秒超时

      newClient.on('ready', () => {
        clearTimeout(timeoutId);
        
        // 关闭旧的连接
        try {
          sessionInfo.client.destroy();
        } catch (error) {
          console.warn('关闭旧连接失败:', error);
        }
        
        // 更新会话信息
        sessionInfo.client = newClient;
        sessionInfo.connected = true;
        sessionInfo.connectedAt = new Date();
        
        resolve({ success: true, message: 'SSH重连成功' });
      });

      newClient.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        console.warn(`第 ${attempt} 次SSH重连失败:`, error.message);
        resolve({ success: false, message: `第 ${attempt} 次重连失败: ${error.message}` });
      });

      newClient.on('close', () => {
        sessionInfo.connected = false;
        console.log(`SSH重连会话已关闭: ${sessionId}`);
      });

      // 尝试连接
      try {
        newClient.connect({
          host: sessionInfo.host,
          username: sessionInfo.username,
          password: sessionInfo.password,
          readyTimeout: 8000
        });
      } catch (error: any) {
        clearTimeout(timeoutId);
        resolve({ success: false, message: `第 ${attempt} 次连接失败: ${error.message}` });
      }
    });
  }
}

// 创建单例实例
export const authService = new AuthService();

// 定期清理过期会话
setInterval(() => {
  authService.cleanupSessions();
}, 10 * 60 * 1000); // 每10分钟检查一次