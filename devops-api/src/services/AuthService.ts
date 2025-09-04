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
        
        // 创建会话信息
        const sessionInfo: SessionInfo = {
          sessionId,
          host: credentials.host,
          username: credentials.username,
          connected: true,
          connectedAt: new Date(),
          client
        };
        
        this.sessions.set(sessionId, sessionInfo);
        
        try {
          // 读取workspace/enable文件，获取默认工作空间
          const defaultWorkspace = await this.getDefaultWorkspace(sessionInfo);
          
          // 获取所有可用工作空间
          const availableWorkspaces = await this.getAvailableWorkspaces(sessionInfo);
          
          console.log(`用户 ${credentials.username}@${credentials.host} 登录成功`);
          resolve({
            sessionId,
            defaultWorkspace,
            availableWorkspaces
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
        this.sessions.delete(sessionId);
      });

      // 连接SSH
      client.connect({
        host: credentials.host,
        username: credentials.username,
        password: credentials.password,
        port: 22,
        readyTimeout: 15000,
        keepaliveInterval: 30000
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
   * 执行远程命令
   */
  async executeCommand(sessionId: string, command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const session = this.getSession(sessionId);
    if (!session || !session.connected) {
      throw new Error('会话不存在或已断开');
    }

    return new Promise((resolve, reject) => {
      session.client.exec(command, (err, stream) => {
        if (err) {
          reject(new Error(`执行命令失败: ${err.message}`));
          return;
        }

        let stdout = '';
        let stderr = '';
        
        stream.on('close', (code: number) => {
          resolve({ stdout, stderr, exitCode: code });
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on('error', (error: Error) => {
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
      // 检查workspace/enable文件是否存在
      const enableExists = await this.remoteFileExists(session.sessionId, `${this.rootPath}/workspace/enable`);
      if (!enableExists) {
        return undefined;
      }

      // 读取enable文件内容
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
      console.error('获取默认工作空间失败:', error);
      return undefined;
    }
  }

  /**
   * 获取所有可用工作空间
   */
  async getAvailableWorkspaces(session: SessionInfo): Promise<string[]> {
    try {
      const workspaces = await this.listRemoteDirectory(session.sessionId, `${this.rootPath}/workspace`);
      return workspaces.filter(name => name !== '.devops-web'); // 过滤掉系统目录
    } catch (error) {
      console.error('获取可用工作空间失败:', error);
      return [];
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
}

// 创建单例实例
export const authService = new AuthService();

// 定期清理过期会话
setInterval(() => {
  authService.cleanupSessions();
}, 10 * 60 * 1000); // 每10分钟检查一次