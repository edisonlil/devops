import { Client } from 'ssh2';
import * as fs from 'fs';
import { RemoteServer } from './RemoteServerService';

export interface SSHExecutionResult {
  exitCode: number;
  output: string[];
  error: string[];
}

export interface SSHExecutionOptions {
  timeout?: number;
  onData?: (data: string) => void;
  onError?: (error: string) => void;
}

export class SSHService {
  private connections: Map<string, Client> = new Map();

  // 建立SSH连接
  private async createConnection(server: RemoteServer): Promise<Client> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      
      const connectionConfig: any = {
        host: server.host,
        port: server.port,
        username: server.username,
        keepaliveInterval: 30000,
        readyTimeout: 20000
      };

      if (server.authType === 'password') {
        connectionConfig.password = server.password;
      } else if (server.authType === 'key') {
        try {
          // 处理私钥路径
          let privateKeyPath = server.privateKey;
          if (privateKeyPath?.startsWith('~/')) {
            privateKeyPath = privateKeyPath.replace('~', require('os').homedir());
          }
          
          if (privateKeyPath && fs.existsSync(privateKeyPath)) {
            connectionConfig.privateKey = fs.readFileSync(privateKeyPath);
            if (server.passphrase) {
              connectionConfig.passphrase = server.passphrase;
            }
          } else {
            // 如果是密钥内容而不是路径
            connectionConfig.privateKey = server.privateKey;
            if (server.passphrase) {
              connectionConfig.passphrase = server.passphrase;
            }
          }
        } catch (error: any) {
          return reject(new Error(`读取私钥失败: ${error.message}`));
        }
      }

      conn.on('ready', () => {
        resolve(conn);
      });

      conn.on('error', (error: Error) => {
        reject(new Error(`SSH连接失败: ${error.message}`));
      });

      conn.connect(connectionConfig);
    });
  }

  // 获取或创建连接
  private async getConnection(server: RemoteServer): Promise<Client> {
    const connectionKey = `${server.host}:${server.port}:${server.username}`;
    
    let connection = this.connections.get(connectionKey);
    if (!connection) {
      connection = await this.createConnection(server);
      this.connections.set(connectionKey, connection);
      
      // 连接关闭时清理
      connection.on('close', () => {
        this.connections.delete(connectionKey);
      });
    }
    
    return connection;
  }

  // 测试连接
  async testConnection(server: RemoteServer): Promise<boolean> {
    try {
      const connection = await this.createConnection(server);
      
      return new Promise((resolve) => {
        // 执行简单命令测试连接
        connection.exec('echo "test"', (err, stream) => {
          if (err) {
            resolve(false);
            connection.end();
            return;
          }
          
          let output = '';
          stream.on('data', (data: Buffer) => {
            output += data.toString();
          });
          
          stream.on('close', (code: number) => {
            connection.end();
            resolve(code === 0 && output.includes('test'));
          });
        });
      });
    } catch (error) {
      return false;
    }
  }

  // 执行命令
  async executeCommand(
    server: RemoteServer, 
    command: string, 
    options: SSHExecutionOptions = {}
  ): Promise<SSHExecutionResult> {
    const { timeout = 30000, onData, onError } = options;
    
    try {
      const connection = await this.getConnection(server);
      
      return new Promise((resolve, reject) => {
        let timeoutHandle: NodeJS.Timeout | undefined;
        
        if (timeout > 0) {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`命令执行超时 (${timeout}ms)`));
          }, timeout);
        }

        connection.exec(command, (err, stream) => {
          if (err) {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            reject(new Error(`执行命令失败: ${err.message}`));
            return;
          }

          const output: string[] = [];
          const error: string[] = [];

          stream.on('data', (data: Buffer) => {
            const text = data.toString();
            output.push(text);
            if (onData) {
              onData(text);
            }
          });

          stream.stderr.on('data', (data: Buffer) => {
            const text = data.toString();
            error.push(text);
            if (onError) {
              onError(text);
            }
          });

          stream.on('close', (exitCode: number, signal?: string) => {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            
            if (signal) {
              reject(new Error(`命令被信号 ${signal} 终止`));
            } else {
              resolve({
                exitCode,
                output,
                error
              });
            }
          });

          stream.on('error', (streamError: Error) => {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            reject(new Error(`流错误: ${streamError.message}`));
          });
        });
      });
    } catch (error: any) {
      throw new Error(`SSH执行失败: ${error.message}`);
    }
  }

  // 执行交互式命令
  async executeInteractiveCommand(
    server: RemoteServer,
    command: string,
    interactions: { expect: string; send: string }[],
    options: SSHExecutionOptions = {}
  ): Promise<SSHExecutionResult> {
    const { timeout = 60000 } = options;
    
    try {
      const connection = await this.getConnection(server);
      
      return new Promise((resolve, reject) => {
        let timeoutHandle: NodeJS.Timeout | undefined;
        
        if (timeout > 0) {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`交互式命令执行超时 (${timeout}ms)`));
          }, timeout);
        }

        connection.exec(command, (err, stream) => {
          if (err) {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            reject(new Error(`执行命令失败: ${err.message}`));
            return;
          }

          const output: string[] = [];
          const error: string[] = [];
          let currentInteraction = 0;
          let buffer = '';

          const checkInteractions = () => {
            if (currentInteraction < interactions.length) {
              const interaction = interactions[currentInteraction];
              if (buffer.includes(interaction.expect)) {
                stream.stdin.write(interaction.send + '\n');
                currentInteraction++;
                buffer = '';
              }
            }
          };

          stream.on('data', (data: Buffer) => {
            const text = data.toString();
            output.push(text);
            buffer += text;
            checkInteractions();
          });

          stream.stderr.on('data', (data: Buffer) => {
            const text = data.toString();
            error.push(text);
          });

          stream.on('close', (exitCode: number) => {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            resolve({
              exitCode,
              output,
              error
            });
          });
        });
      });
    } catch (error: any) {
      throw new Error(`交互式SSH执行失败: ${error.message}`);
    }
  }

  // 上传文件
  async uploadFile(server: RemoteServer, localPath: string, remotePath: string): Promise<void> {
    try {
      const connection = await this.getConnection(server);
      
      return new Promise((resolve, reject) => {
        connection.sftp((err, sftp) => {
          if (err) {
            reject(new Error(`SFTP连接失败: ${err.message}`));
            return;
          }

          sftp.fastPut(localPath, remotePath, (uploadErr) => {
            if (uploadErr) {
              reject(new Error(`文件上传失败: ${uploadErr.message}`));
            } else {
              resolve();
            }
          });
        });
      });
    } catch (error: any) {
      throw new Error(`上传文件失败: ${error.message}`);
    }
  }

  // 下载文件
  async downloadFile(server: RemoteServer, remotePath: string, localPath: string): Promise<void> {
    try {
      const connection = await this.getConnection(server);
      
      return new Promise((resolve, reject) => {
        connection.sftp((err, sftp) => {
          if (err) {
            reject(new Error(`SFTP连接失败: ${err.message}`));
            return;
          }

          sftp.fastGet(remotePath, localPath, (downloadErr) => {
            if (downloadErr) {
              reject(new Error(`文件下载失败: ${downloadErr.message}`));
            } else {
              resolve();
            }
          });
        });
      });
    } catch (error: any) {
      throw new Error(`下载文件失败: ${error.message}`);
    }
  }

  // 检查文件是否存在
  async fileExists(server: RemoteServer, remotePath: string): Promise<boolean> {
    try {
      const result = await this.executeCommand(server, `test -f "${remotePath}" && echo "exists"`, { timeout: 5000 });
      return result.exitCode === 0 && result.output.join('').includes('exists');
    } catch (error) {
      return false;
    }
  }

  // 创建目录
  async createDirectory(server: RemoteServer, remotePath: string): Promise<void> {
    const result = await this.executeCommand(server, `mkdir -p "${remotePath}"`, { timeout: 10000 });
    if (result.exitCode !== 0) {
      throw new Error(`创建目录失败: ${result.error.join('')}`);
    }
  }

  // 获取文件内容
  async getFileContent(server: RemoteServer, remotePath: string): Promise<string> {
    const result = await this.executeCommand(server, `cat "${remotePath}"`, { timeout: 30000 });
    if (result.exitCode !== 0) {
      throw new Error(`读取文件失败: ${result.error.join('')}`);
    }
    return result.output.join('');
  }

  // 写入文件内容
  async writeFileContent(server: RemoteServer, remotePath: string, content: string): Promise<void> {
    const escapedContent = content.replace(/'/g, "'\\''");
    const command = `echo '${escapedContent}' > "${remotePath}"`;
    
    const result = await this.executeCommand(server, command, { timeout: 30000 });
    if (result.exitCode !== 0) {
      throw new Error(`写入文件失败: ${result.error.join('')}`);
    }
  }

  // 关闭所有连接
  closeAllConnections(): void {
    this.connections.forEach((connection, key) => {
      try {
        connection.end();
      } catch (error) {
        console.error(`关闭连接 ${key} 时出错:`, error);
      }
    });
    this.connections.clear();
  }

  // 关闭特定服务器的连接
  closeConnection(server: RemoteServer): void {
    const connectionKey = `${server.host}:${server.port}:${server.username}`;
    const connection = this.connections.get(connectionKey);
    
    if (connection) {
      try {
        connection.end();
      } catch (error) {
        console.error(`关闭连接 ${connectionKey} 时出错:`, error);
      }
      this.connections.delete(connectionKey);
    }
  }
}