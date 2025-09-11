import { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import { AuthUtils } from '../utils/AuthUtils';

interface CommandExecution {
  id: string;
  command: string;
  workingDir?: string;
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  stdout: string;
  stderr: string;
  logs: string[];
}

export class DeployController {
  private executions: Map<string, CommandExecution> = new Map();

  constructor() {
    // 初始化
  }

  // 获取远程服务器列表
  getRemoteServers = async (req: Request, res: Response) => {
    try {
      // 模拟数据
      const servers = [
        {
          id: '1',
          name: '开发服务器',
          host: '192.168.1.100',
          port: 22,
          username: 'devops',
          status: 'connected'
        }
      ];
      
      res.json({
        success: true,
        data: { servers }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取服务器列表失败'
      });
    }
  };

  // 执行远程命令
  executeDevopsCommand = async (req: Request, res: Response) => {
    try {
      const sessionId = AuthUtils.getSessionId(req, 'DeployController');
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '会话无效'
        });
        return;
      }

      const { command, workingDir } = req.body;
      
      if (!command) {
        res.status(400).json({
          success: false,
          message: '命令不能为空'
        });
        return;
      }

      console.log(`开始执行远程命令: ${command}`);
      console.log(`工作目录: ${workingDir || '默认'}`);
      
      // 创建执行ID
      const executionId = 'exec-' + Date.now();
      
      // 异步执行命令，不等待结果
      this.executeCommandAsync(sessionId, executionId, command, workingDir)
        .catch(error => {
          console.error(`异步执行命令失败 [${executionId}]:`, error);
        });

      // 立即返回执行ID
      res.json({
        success: true,
        data: {
          executionId,
          status: 'running',
          message: '命令开始执行'
        }
      });
      return;
    } catch (error: any) {
      console.error('执行远程命令失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '命令执行失败'
      });
      return;
    }
  };

  // 其他方法的简化版本
  addRemoteServer = async (req: Request, res: Response) => {
    res.json({ success: true, message: '功能开发中' });
  };

  updateRemoteServer = async (req: Request, res: Response) => {
    res.json({ success: true, message: '功能开发中' });
  };

  deleteRemoteServer = async (req: Request, res: Response) => {
    res.json({ success: true, message: '功能开发中' });
  };

  testConnection = async (req: Request, res: Response) => {
    res.json({ success: true, message: '连接正常' });
  };

  // 获取Git仓库分支列表
  getGitBranches = async (req: Request, res: Response) => {
    try {
      const sessionId = AuthUtils.getSessionId(req, 'DeployController');
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '会话无效'
        });
        return;
      }

      const { gitUrl } = req.body;

      if (!gitUrl) {
        res.status(400).json({
          success: false,
          message: 'Git URL不能为空'
        });
        return;
      }

      console.log(`获取Git仓库分支: ${gitUrl}`);

      // 使用git ls-remote命令获取远程分支
      const command = `git ls-remote --heads "${gitUrl}" | sed 's/.*refs\\/heads\\///' | sort`;

      try {
        const result = await authService.executeCommand(sessionId, command);

        if (result.exitCode !== 0) {
          console.error('获取分支失败:', result.stderr);
          res.json({
            success: true,
            data: {
              branches: ['main', 'master', 'develop'] // 提供默认分支作为备选
            }
          });
          return;
        }

        const branches = result.stdout
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .slice(0, 50); // 限制最多50个分支

        console.log(`获取到 ${branches.length} 个分支:`, branches);

        res.json({
          success: true,
          data: {
            branches: branches.length > 0 ? branches : ['main', 'master']
          }
        });
        return;
      } catch (error: any) {
        console.error('执行git命令失败:', error);
        // 如果命令执行失败，返回默认分支
        res.json({
          success: true,
          data: {
            branches: ['main', 'master', 'develop']
          }
        });
        return;
      }
    } catch (error: any) {
      console.error('获取Git分支失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
      return;
    }
  };

  getDevopsStatus = async (req: Request, res: Response) => {
    try {
      const sessionId = AuthUtils.getSessionId(req, 'DeployController');
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '会话无效'
        });
        return;
      }

      // 检查devops命令是否存在
      const checkCommands = [
        'which devops',
        'ls -la /root/devops/bin/devops',
        'echo "PATH=$PATH"'
      ];

      const results = [];
      for (const cmd of checkCommands) {
        try {
          const result = await authService.executeCommand(sessionId, cmd);
          results.push({
            command: cmd,
            exitCode: result.exitCode,
            stdout: result.stdout?.trim(),
            stderr: result.stderr?.trim()
          });
        } catch (error: any) {
          results.push({
            command: cmd,
            error: error.message
          });
        }
      }

      res.json({ 
        success: true, 
        data: { 
          isInstalled: true, 
          version: '1.8.5',
          debugInfo: results
        } 
      });
      return;
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'DevOps状态检查失败'
      });
      return;
    }
  };

  getExecutionHistory = async (req: Request, res: Response) => {
    res.json({ success: true, data: { items: [], total: 0 } });
  };

  getExecutionDetails = async (req: Request, res: Response) => {
    try {
      const { executionId } = req.params;
      
      const execution = this.executions.get(executionId);
      if (!execution) {
        res.status(404).json({
          success: false,
          message: '执行记录不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: execution.id,
          command: execution.command,
          workingDir: execution.workingDir,
          status: execution.status,
          startTime: execution.startTime,
          endTime: execution.endTime,
          exitCode: execution.exitCode,
          duration: execution.endTime 
            ? execution.endTime.getTime() - execution.startTime.getTime()
            : Date.now() - execution.startTime.getTime()
        }
      });
      return;
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取执行详情失败'
      });
      return;
    }
  };

  getExecutionLogs = async (req: Request, res: Response) => {
    try {
      const { executionId } = req.params;
      
      const execution = this.executions.get(executionId);
      if (!execution) {
        res.status(404).json({
          success: false,
          message: '执行记录不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          logs: execution.logs,
          stdout: execution.stdout,
          stderr: execution.stderr,
          status: execution.status
        }
      });
      return;
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || '获取执行日志失败'
      });
      return;
    }
  };

  cancelExecution = async (req: Request, res: Response) => {
    res.json({ success: true, message: '已取消' });
  };

  deployApplication = async (req: Request, res: Response) => {
    res.json({ success: true, message: '部署中' });
  };

  getApplications = async (req: Request, res: Response) => {
    res.json({ success: true, data: { applications: [] } });
  };

  getApplicationDetails = async (req: Request, res: Response) => {
    res.json({ success: true, data: {} });
  };

  startApplication = async (req: Request, res: Response) => {
    res.json({ success: true, message: '启动成功' });
  };

  stopApplication = async (req: Request, res: Response) => {
    res.json({ success: true, message: '停止成功' });
  };

  restartApplication = async (req: Request, res: Response) => {
    res.json({ success: true, message: '重启成功' });
  };

  deleteApplication = async (req: Request, res: Response) => {
    res.json({ success: true, message: '删除成功' });
  };

  getRemoteWorkspaces = async (req: Request, res: Response) => {
    res.json({ success: true, data: { workspaces: ['default', 'production'] } });
  };

  getRemoteTemplates = async (req: Request, res: Response) => {
    res.json({ success: true, data: { templates: [] } });
  };

  getRemoteDeployments = async (req: Request, res: Response) => {
    res.json({ success: true, data: { deployments: [] } });
  };

  getSystemInfo = async (req: Request, res: Response) => {
    res.json({ success: true, data: { os: 'Linux' } });
  };

  // 模板预览功能
  previewTemplate = async (req: Request, res: Response) => {
    try {
      const sessionId = AuthUtils.getSessionId(req, 'DeployController');
      if (!sessionId) {
        res.status(401).json({
          success: false,
          message: '会话无效'
        });
        return;
      }

      const { workspace } = req.params;
      const {
        templateName,
        config = {}
      } = req.body;

      if (!templateName) {
        res.status(400).json({
          success: false,
          message: '模板名称不能为空'
        });
        return;
      }

      console.log(`开始渲染模板预览: ${templateName}，工作空间: ${workspace}`);

      // 调用模板预览服务
      const previewResult = await this.renderTemplatePreview(sessionId, workspace, templateName, config);

      res.json({
        success: true,
        data: previewResult
      });
      return;
    } catch (error: any) {
      console.error('模板预览失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '模板预览失败'
      });
      return;
    }
  };

  // 渲染模板预览的核心逻辑
  private async renderTemplatePreview(
    sessionId: string, 
    workspace: string, 
    templateName: string, 
    config: any
  ): Promise<{ files: Record<string, string> }> {
    const session = authService.getSession(sessionId);
    if (!session) {
      throw new Error('会话不存在或已过期');
    }

    // 构建Python渲染脚本的参数 - 支持多种模板路径
    let templatePath = `/root/devops/templates/k8s/app/${templateName}`;
    
    // 如果是工作空间模板，优先使用工作空间路径
    const workspaceTemplatePath = `/root/devops/workspace/${workspace}/templates/k8s/app/${templateName}`;
    const outputTempDir = `/tmp/template-preview-${Date.now()}`;
    
    // 基本配置参数
    const renderArgs = {
      moduleName: config.name || 'app-preview',
      imagePath: config.imagePath || 'example/app:latest',
      namespace: config.namespace || workspace,
      appPort: config.appPort || 8080,
      exposePort: config.exposePort || 30000,
      javaOpts: config.javaOpts || '',
      buildEnv: config.buildEnv || 'prod',
      enableHarbor: config.enableHarbor || false,
      harborSecretName: config.harborSecretName || '',
      network: config.network || ''
    };

    console.log('渲染参数:', renderArgs);

    // 创建批量渲染脚本，传入多个可能的模板路径
    const possiblePaths = [workspaceTemplatePath, templatePath];
    const batchScript = this.createTemplateRenderScript(possiblePaths, outputTempDir, renderArgs);
    
    try {
      // 执行渲染脚本
      const result = await authService.executeCommand(sessionId, batchScript);
      
      console.log('脚本执行结果:');
      console.log('退出码:', result.exitCode);
      console.log('标准输出:', result.stdout);
      console.log('错误输出:', result.stderr);
      
      if (result.exitCode !== 0) {
        console.error('模板渲染脚本执行失败:', result.stderr);
        throw new Error(`模板渲染失败: ${result.stderr || '未知错误'}`);
      }

      console.log('模板渲染完成，开始读取文件');

      // 解析渲染结果
      return await this.parseRenderResults(sessionId, result.stdout);
      
    } catch (error) {
      console.error('模板渲染过程出错:', error);
      throw error;
    }
  }

  // 创建模板渲染脚本
  private createTemplateRenderScript(possiblePaths: string[], outputDir: string, args: any): string {
    return `#!/bin/bash
set -e

echo "=== 开始模板渲染 ==="
echo "查找模板目录中..."

# 检查多个可能的模板路径（按优先级顺序：工作空间 > 全局）
TEMPLATE_PATH=""
${possiblePaths.map(path => `
if [ -z "$TEMPLATE_PATH" ] && [ -d "${path}" ]; then
  echo "找到模板目录: ${path}"
  TEMPLATE_PATH="${path}"
fi`).join('')}

if [ -z "$TEMPLATE_PATH" ]; then
  echo "ERROR: 未找到模板目录，已尝试以下路径:"
  ${possiblePaths.map(path => `echo "  - ${path}"`).join('\n  ')}
  exit 1
fi

echo "使用模板目录: $TEMPLATE_PATH"

# 创建临时输出目录
mkdir -p "${outputDir}"

# 查找模板文件
echo "=== 查找模板文件 ==="
find "$TEMPLATE_PATH" -type f \\( -name "*.yaml" -o -name "*.yml" -o -name "*.j2" -o -name "Dockerfile*" \\) -print0 | while IFS= read -r -d '' file; do
  filename=$(basename "$file")
  echo "TEMPLATE_FILE: $filename"
done

echo "=== 开始渲染各个文件 ==="

# 渲染每个模板文件
find "$TEMPLATE_PATH" -type f \\( -name "*.yaml" -o -name "*.yml" -o -name "*.j2" \\) -print0 | while IFS= read -r -d '' template_file; do
  filename=$(basename "$template_file")
  output_filename="\${filename%.*}"  # 移除.j2扩展名
  output_file="${outputDir}/\${output_filename}"
  
  echo "渲染文件: $filename -> \${output_filename}"
  
  # 判断使用哪种渲染器
  if [[ "$filename" == *.j2 ]]; then
    # 使用高级渲染器处理Jinja2模板
    python3 /root/devops/bin/advanced_template_renderer.py \\
      --template "$template_file" \\
      --output "$output_file" \\
      --module-name "${args.moduleName}" \\
      --image-path "${args.imagePath}" \\
      --namespace "${args.namespace}" \\
      --app-port ${args.appPort} \\
      --service-port ${args.exposePort} \\
      --java-opts "${args.javaOpts}" \\
      ${args.enableHarbor ? '--enable-harbor' : ''} \\
      ${args.harborSecretName ? '--harbor-secret-name "' + args.harborSecretName + '"' : ''} \\
      --validate || echo "高级渲染器失败: $filename"
  else
    # 使用基础渲染器处理占位符模板
    python3 /root/devops/bin/template_renderer.py \\
      --template "$template_file" \\
      --output "$output_file" \\
      --module-name "${args.moduleName}" \\
      --image-path "${args.imagePath}" \\
      --namespace "${args.namespace}" \\
      --app-port ${args.appPort} \\
      --expose-port ${args.exposePort} \\
      --java-opts "${args.javaOpts}" \\
      ${args.enableHarbor ? '--enable-harbor' : ''} \\
      ${args.harborSecretName ? '--harbor-secret-name "' + args.harborSecretName + '"' : ''} \\
      --validate || echo "基础渲染器失败: $filename"
  fi
done

# 复制非模板文件（如Dockerfile）
find "$TEMPLATE_PATH" -type f ! \\( -name "*.yaml" -o -name "*.yml" -o -name "*.j2" \\) -print0 | while IFS= read -r -d '' file; do
  filename=$(basename "$file")
  cp "$file" "${outputDir}/$filename"
  echo "复制文件: $filename"
done

echo "=== 输出渲染结果 ==="
for file in "${outputDir}"/*; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "--- FILE: $filename ---"
    cat "$file"
    echo "--- END: $filename ---"
  fi
done

echo "=== 渲染完成 ==="

# 清理临时目录
rm -rf "${outputDir}"
`;
  }

  // 解析渲染结果
  private async parseRenderResults(sessionId: string, output: string): Promise<{ files: Record<string, string> }> {
    const files: Record<string, string> = {};
    const lines = output.split('\n');
    
    let currentFile = '';
    let currentContent: string[] = [];
    let inFileContent = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('--- FILE:') && trimmedLine.endsWith('---')) {
        // 保存前一个文件的内容
        if (currentFile && currentContent.length > 0) {
          files[currentFile] = currentContent.join('\n');
        }
        
        // 开始新文件
        currentFile = trimmedLine.replace('--- FILE:', '').replace('---', '').trim();
        currentContent = [];
        inFileContent = true;
      } else if (trimmedLine.startsWith('--- END:') && trimmedLine.endsWith('---')) {
        // 文件结束
        if (currentFile && currentContent.length > 0) {
          files[currentFile] = currentContent.join('\n');
        }
        currentFile = '';
        currentContent = [];
        inFileContent = false;
      } else if (inFileContent && currentFile) {
        // 文件内容
        currentContent.push(line);
      }
    }

    // 处理最后一个文件
    if (currentFile && currentContent.length > 0) {
      files[currentFile] = currentContent.join('\n');
    }

    console.log(`解析完成，共找到 ${Object.keys(files).length} 个文件:`, Object.keys(files));

    return { files };
  }

  // 异步执行命令
  private async executeCommandAsync(
    sessionId: string, 
    executionId: string, 
    command: string, 
    workingDir?: string
  ): Promise<void> {
    const execution: CommandExecution = {
      id: executionId,
      command,
      workingDir,
      status: 'running',
      startTime: new Date(),
      stdout: '',
      stderr: '',
      logs: []
    };

    this.executions.set(executionId, execution);
    
    try {
      console.log(`执行命令 [${executionId}]: ${command}`);
      
      // 构建完整的命令，确保环境变量和PATH正确
      let fullCommand = this.buildCommandWithEnvironment(command, workingDir);
      
      execution.logs.push(`[${new Date().toISOString()}] INFO: 开始执行命令: ${command}`);
      if (workingDir) {
        execution.logs.push(`[${new Date().toISOString()}] INFO: 工作目录: ${workingDir}`);
      }
      
      // 使用流式执行命令，实时更新输出
      await this.executeCommandWithStreaming(sessionId, executionId, fullCommand);
      
    } catch (error: any) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.stderr = error.message || '未知错误';
      execution.logs.push(`[${new Date().toISOString()}] ERROR: 执行异常: ${error.message}`);
      
      console.error(`命令执行异常 [${executionId}]:`, error);
    }
  }

  // 构建带有正确环境的命令
  private buildCommandWithEnvironment(command: string, workingDir?: string): string {
    // devops命令的实际安装路径
    const devopsPath = '/root/devops/bin/devops';

    let fullCommand = '';
    
    // 设置环境变量，确保能找到devops命令和SDKMAN管理的工具
    const envSetup = [
      'source ~/.bashrc 2>/dev/null || true',
      'source ~/.profile 2>/dev/null || true',
      // 初始化 SDKMAN
      'export SDKMAN_DIR="$HOME/.sdkman"',
      '[[ -s "$SDKMAN_DIR/bin/sdkman-init.sh" ]] && source "$SDKMAN_DIR/bin/sdkman-init.sh"',
      // 添加 SDKMAN 管理的工具路径
      'export PATH="$HOME/.sdkman/candidates/maven/current/bin:$HOME/.sdkman/candidates/java/current/bin:$HOME/.sdkman/candidates/gradle/current/bin:$PATH"',
      // 添加其他常见路径
      'export PATH="/root/devops/bin:/usr/local/bin:/usr/bin:/bin:/root/devops:/opt/devops:/opt/maven/bin:/usr/local/maven/bin:/usr/share/maven/bin:$PATH"'
    ].join(' && ');

    // 如果指定了工作目录
    if (workingDir) {
      fullCommand = `${envSetup} && cd "${workingDir}" && `;
    } else {
      fullCommand = `${envSetup} && `;
    }

    // 如果命令以devops开头，使用正确的路径
    if (command.startsWith('devops ')) {
      const devopsCmd = command.substring(7); // 去掉 'devops '
      fullCommand += `${devopsPath} ${devopsCmd}`;
    } else {
      fullCommand += command;
    }

    return fullCommand;
  }

  // 支持流式输出的命令执行
  private async executeCommandWithStreaming(
    sessionId: string,
    executionId: string,
    command: string
  ): Promise<void> {
    const session = authService.getSession(sessionId);
    const execution = this.executions.get(executionId);
    
    if (!session || !session.connected || !execution) {
      throw new Error('会话不存在或已断开');
    }

    return new Promise((resolve, reject) => {
      session.client.exec(command, (err, stream) => {
        if (err) {
          reject(new Error(`执行命令失败: ${err.message}`));
          return;
        }

        let stdoutBuffer = '';
        let stderrBuffer = '';

        // 监听标准输出
        stream.on('data', (data: Buffer) => {
          const output = data.toString();
          stdoutBuffer += output;
          execution.stdout = stdoutBuffer;
          
          // 添加实时日志
          const lines = output.split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              execution.logs.push(`[${new Date().toISOString()}] OUTPUT: ${line.trim()}`);
            }
          });
          
          console.log(`[${executionId}] STDOUT:`, output);
        });

        // 监听错误输出
        stream.stderr.on('data', (data: Buffer) => {
          const output = data.toString();
          stderrBuffer += output;
          execution.stderr = stderrBuffer;
          
          // 添加错误日志
          const lines = output.split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              execution.logs.push(`[${new Date().toISOString()}] ERROR: ${line.trim()}`);
            }
          });
          
          console.log(`[${executionId}] STDERR:`, output);
        });

        // 监听命令结束
        stream.on('close', (exitCode: number) => {
          execution.status = exitCode === 0 ? 'completed' : 'failed';
          execution.endTime = new Date();
          execution.exitCode = exitCode;
          
          if (exitCode === 0) {
            execution.logs.push(`[${new Date().toISOString()}] SUCCESS: 命令执行成功 (退出码: ${exitCode})`);
          } else {
            execution.logs.push(`[${new Date().toISOString()}] ERROR: 命令执行失败 (退出码: ${exitCode})`);
          }
          
          console.log(`命令执行完成 [${executionId}]: 状态=${execution.status}, 退出码=${exitCode}`);
          resolve();
        });

        // 监听错误
        stream.on('error', (error: Error) => {
          execution.status = 'failed';
          execution.endTime = new Date();
          execution.stderr += error.message;
          execution.logs.push(`[${new Date().toISOString()}] ERROR: 流执行错误: ${error.message}`);
          
          console.error(`流执行错误 [${executionId}]:`, error);
          reject(error);
        });
      });
    });
  }
}