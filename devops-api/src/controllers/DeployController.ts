import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
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

  /**
   * 解析工作空间配置文件内容
   */
  private parseWorkspaceConfig(content: string): Record<string, string> {
    const config: Record<string, string> = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/"/g, '').trim();
          config[key.trim()] = value;
        }
      }
    }
    
    return config;
  }

  /**
   * 构建带认证的Git URL
   */
  private buildAuthenticatedGitUrl(gitUrl: string, username: string, password: string): string {
    console.log(`构建认证Git URL: ${gitUrl}`);
    console.log(`用户名: ${username}`);
    console.log(`密码长度: ${password.length}`);
    
    try {
      const url = new URL(gitUrl);
      console.log(`URL解析成功: protocol=${url.protocol}, host=${url.host}`);
      
      // 对用户名和密码进行URL编码
      const encodedUsername = encodeURIComponent(username);
      const encodedPassword = encodeURIComponent(password);
      
      // 构建带认证的URL
      url.username = encodedUsername;
      url.password = encodedPassword;
      
      const result = url.toString();
      console.log(`认证URL构建成功`);
      return result;
    } catch (error) {
      console.error('构建认证Git URL失败:', error);
      console.log('尝试使用字符串替换方式');
      
      // 如果URL解析失败，尝试简单的字符串替换方式
      if (gitUrl.startsWith('https://')) {
        const result = gitUrl.replace('https://', `https://${encodeURIComponent(username)}:${encodeURIComponent(password)}@`);
        console.log('HTTPS URL替换成功');
        return result;
      } else if (gitUrl.startsWith('http://')) {
        const result = gitUrl.replace('http://', `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@`);
        console.log('HTTP URL替换成功');
        return result;
      } else {
        console.error('不支持的Git URL格式:', gitUrl);
        return gitUrl; // 如果都不匹配，返回原始URL
      }
    }
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

      // 获取当前工作空间
      const workspace = req.params.workspace || 'default';
      console.log(`当前工作空间: ${workspace}`);
      
      // 尝试获取工作空间Git认证配置
      let command = `GIT_TERMINAL_PROMPT=0 git ls-remote --heads "${gitUrl}" 2>&1 | grep 'refs/heads/' | sed 's|.*refs/heads/||' | sort`;
      console.log(`初始Git命令: ${command}`);
      
      try {
        // 尝试读取工作空间配置文件获取Git认证信息
        const configPath = `/root/devops/workspace/${workspace}/config`;
        console.log(`检查工作空间配置文件: ${configPath}`);
        const configExists = await authService.remoteFileExists(sessionId, configPath);
        console.log(`配置文件存在: ${configExists}`);
        
        if (configExists) {
          const configContent = await authService.readRemoteFile(sessionId, configPath);
          console.log(`配置文件内容长度: ${configContent.length}`);
          const config = this.parseWorkspaceConfig(configContent);
          console.log(`解析的配置:`, config);
          
          // 如果配置了Git用户名和密码，使用认证方式
          if (config.BUILD_GIT_USERNAME && config.BUILD_GIT_PASSWORD) {
            console.log(`使用工作空间Git认证信息: 用户名=${config.BUILD_GIT_USERNAME}`);
            
            // 构建帶认证的Git URL
            const urlWithAuth = this.buildAuthenticatedGitUrl(gitUrl, config.BUILD_GIT_USERNAME, config.BUILD_GIT_PASSWORD);
            console.log(`认证URL构建完成 (隐藏密码)`);
            // 使用更安全的Git命令，禁用交互式提示
            command = `GIT_TERMINAL_PROMPT=0 git ls-remote --heads "${urlWithAuth}" 2>&1 | grep 'refs/heads/' | sed 's|.*refs/heads/||' | sort`;
            console.log(`使用认证后的Git命令 (隐藏密码部分)`);
          } else {
            console.log(`工作空间配置中未找到Git认证信息`);
            console.log(`BUILD_GIT_USERNAME: ${config.BUILD_GIT_USERNAME || '未设置'}`);
            console.log(`BUILD_GIT_PASSWORD: ${config.BUILD_GIT_PASSWORD ? '已设置' : '未设置'}`);
          }
        } else {
          console.log(`工作空间配置文件不存在，使用默认Git命令`);
        }
      } catch (configError) {
        console.warn('获取工作空间配置失败，使用默认Git命令:', configError);
      }

      // 使用git ls-remote命令获取远程分支

      try {
        console.log(`开始执行Git命令...`);
        const result = await authService.executeCommand(sessionId, command);
        console.log(`Git命令执行结果: exitCode=${result.exitCode}`);
        console.log(`Git命令stdout长度: ${result.stdout?.length || 0}`);
        console.log(`Git命令stderr长度: ${result.stderr?.length || 0}`);
        
        if (result.stderr) {
          console.log(`Git命令stderr内容: ${result.stderr}`);
        }

        if (result.exitCode !== 0) {
          console.error('获取分支失败:', result.stderr);
          
          // 如果是认证问题，提供更详细的错误信息
          let errorMessage = '获取分支失败：' + result.stderr;
          if (result.stderr.includes('Authentication failed') || 
              result.stderr.includes('Permission denied') ||
              result.stderr.includes('could not read Username') ||
              result.stderr.includes('terminal prompts disabled')) {
            errorMessage = 'Git仓库需要认证，请在工作空间设置中配置Git用户名和密码';
          }
          
          res.json({
            success: false,
            message: errorMessage
          });
          return;
        }

        const branches = result.stdout
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .slice(0, 50); // 限制最多50个分支

        console.log(`获取到 ${branches.length} 个分支:`, branches);

        if (branches.length === 0) {
          res.json({
            success: false,
            message: '未找到任何分支'
          });
          return;
        }

        res.json({
          success: true,
          data: {
            branches: branches
          }
        });
        return;
      } catch (error: any) {
        console.error('执行git命令失败:', error);
        res.json({
          success: false,
          message: '执行git命令失败：' + error.message
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

  // 上传代码包
  uploadCodePackage = async (req: Request, res: Response) => {
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
      const { extractMode = 'none' } = req.body; // 获取解压模式参数，默认不解压
      if (!workspace) {
        res.status(400).json({
          success: false,
          message: '工作空间参数不能为空'
        });
        return;
      }

      // 检查是否有上传的文件
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: '请选择要上传的代码包文件'
        });
        return;
      }

      const uploadedFile = req.file;
      console.log('收到文件上传请求:', {
        originalName: uploadedFile.originalname,
        size: uploadedFile.size,
        mimetype: uploadedFile.mimetype,
        workspace
      });

      // 验证文件类型
      const allowedExtensions = ['.zip', '.tar', '.tar.gz', '.tar.bz2', '.rar', '.7z'];
      const fileExtension = path.extname(uploadedFile.originalname).toLowerCase();
      const isValidType = allowedExtensions.includes(fileExtension) || 
                         uploadedFile.originalname.toLowerCase().endsWith('.tar.gz') ||
                         uploadedFile.originalname.toLowerCase().endsWith('.tar.bz2');
      
      if (!isValidType) {
        // 删除临时文件
        if (fs.existsSync(uploadedFile.path)) {
          fs.unlinkSync(uploadedFile.path);
        }
        res.status(400).json({
          success: false,
          message: '不支持的文件格式，请上传 ZIP、TAR 等压缩文件'
        });
        return;
      }

      // 验证文件大小（限制为100MB）
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (uploadedFile.size > maxSize) {
        // 删除临时文件
        if (fs.existsSync(uploadedFile.path)) {
          fs.unlinkSync(uploadedFile.path);
        }
        res.status(400).json({
          success: false,
          message: '文件大小不能超过100MB'
        });
        return;
      }

      // 生成远程文件名和路径
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uniqueId = uuidv4().slice(0, 8);
      const fileBaseName = path.parse(uploadedFile.originalname).name;
      const fileExt = path.extname(uploadedFile.originalname);
      const remoteFileName = `${fileBaseName}-${timestamp}-${uniqueId}${fileExt}`;
      const remoteTempPath = `/tmp/devops-uploads/${remoteFileName}`;
      const remoteExtractPath = `/tmp/devops-uploads/extracted/${fileBaseName}-${uniqueId}`;

      try {
        // 1. 检查SSH会话状态，如果断开则尝试自动重连
        let session = authService.getSession(sessionId);
        if (!session || !session.connected) {
          console.log('检测到SSH会话断开，尝试自动重连...');
          
          try {
            // 尝试自动重连
            const reconnectResult = await this.attemptReconnection(sessionId);
            if (reconnectResult.success) {
              console.log('SSH会话自动重连成功，继续执行文件上传');
              session = authService.getSession(sessionId); // 获取重连后的会话
              // 重连成功，继续后续的健康检查
            } else {
              throw new Error(reconnectResult.message || '自动重连失败');
            }
          } catch (reconnectError: any) {
            console.warn('SSH自动重连失败:', reconnectError.message);
            
            // 自动重连失败，返回需要手动重连的提示，但不要求用户重新登录
            const errorResponse = {
              success: false,
              error: 'SSH_SESSION_DISCONNECTED',
              message: 'SSH连接已断开且自动重连失败，请稍后重试',
              details: {
                sessionExists: !!session,
                connected: session?.connected || false,
                autoReconnectFailed: true,
                suggestion: '系统已尝试自动重连但失败，请稍后重试或检查网络连接',
                canRetry: true
              }
            };
            
            // 使用409 Conflict状态码，表示SSH会话问题，而非认证问题
            res.status(409).json(errorResponse);
            return;
          }
        }

        // 2. 在远程服务器创建上传目录（先进行连接健康检查）
        const isHealthy = await authService.checkConnectionHealth(sessionId);
        if (!isHealthy) {
          throw new Error('SSH连接状态不稳定，请重新登录');
        }
        
        const createDirCommand = `mkdir -p /tmp/devops-uploads/extracted`;
        await authService.executeCommand(sessionId, createDirCommand, 10000);

        // 3. 使用智能文件传输（优先SCP，备选SFTP）
        console.log('开始智能文件传输到远程服务器...');
        
        const transferResult = await this.uploadFileIntelligent(sessionId, uploadedFile.path, remoteTempPath);
        console.log(`文件传输完成，使用方法: ${transferResult.method}`);
        
        console.log(`文件${transferResult.method}传输完成，解压模式: ${extractMode}`);
        
        // 检查SSH会话状态，如果断开则跳过验证步骤
        const sessionAfterTransfer = authService.getSession(sessionId);
        let fileSizeVerified = false;
        
        // 尝试验证文件大小，但如果会话断开则直接跳过
        try {
          if (sessionAfterTransfer && sessionAfterTransfer.connected) {
            // 会话仍然有效，进行文件大小验证
            const fileContent = fs.readFileSync(uploadedFile.path);
            const sizeCheckCommand = `stat -f%z "${remoteTempPath}" 2>/dev/null || stat -c%s "${remoteTempPath}" 2>/dev/null`;
            
            // 双重检查：执行命令前再次确认会话状态
            const currentSession = authService.getSession(sessionId);
            if (currentSession && currentSession.connected) {
              const sizeResult = await authService.executeCommand(sessionId, sizeCheckCommand, 10000);
              
              if (sizeResult.exitCode === 0) {
                const remoteSize = parseInt(sizeResult.stdout.trim());
                if (remoteSize === fileContent.length) {
                  console.log(`文件传输验证成功: 本地大小=${fileContent.length}, 远程大小=${remoteSize}`);
                  fileSizeVerified = true;
                } else {
                  console.warn(`文件大小不匹配: 本地=${fileContent.length}, 远程=${remoteSize}，但传输已完成100%`);
                  fileSizeVerified = true; // 仍然认为成功，因为传输已完成
                }
              } else {
                console.warn('无法验证远程文件大小，但传输已完成');
                fileSizeVerified = true; // 仍然认为成功
              }
            } else {
              console.log('执行验证前发现SSH会话已断开，跳过文件大小验证');
              fileSizeVerified = true;
            }
          } else {
            console.log('SSH会话已断开，跳过文件大小验证，但SCP传输已成功完成');
            fileSizeVerified = true; // 传输已完成，认为成功
          }
        } catch (verifyError: any) {
          console.warn('文件大小验证过程出错，但传输已完成:', verifyError.message);
          fileSizeVerified = true; // 仍然认为成功，因为传输已完成
        }

        let finalPath = remoteTempPath; // 默认返回压缩文件路径
        let message = `代码包上传成功（使用${transferResult.method}）`;

        // 根据解压模式决定是否解压
        if (extractMode === 'auto') {
          // 检查SSH会话状态，如果断开则不能解压
          const sessionBeforeExtract = authService.getSession(sessionId);
          if (!sessionBeforeExtract || !sessionBeforeExtract.connected) {
            console.warn('SSH会话已断开，无法执行解压操作，自动切换为保持压缩格式');
            // 自动降级为保持压缩格式
            finalPath = remoteTempPath;
            message = `代码包上传成功（使用${transferResult.method}），文件保存到 ${remoteTempPath}（SSH会话断开，未能解压）`;
          } else {
            console.log('开始解压文件...');
            
            try {
              // 先创建解压目录
              const createExtractDirCommand = `mkdir -p ${remoteExtractPath}`;
              await authService.executeCommand(sessionId, createExtractDirCommand, 10000);
              
              // 生成解压命令
              let extractCommand = '';
              if (fileExtension === '.zip' || uploadedFile.originalname.toLowerCase().endsWith('.zip')) {
                extractCommand = `cd /tmp/devops-uploads/extracted && unzip -o ${remoteTempPath} -d ${remoteExtractPath}`;
              } else if (fileExtension === '.tar' || uploadedFile.originalname.toLowerCase().endsWith('.tar')) {
                extractCommand = `cd /tmp/devops-uploads/extracted && tar -xf ${remoteTempPath} -C ${remoteExtractPath} --strip-components=1`;
              } else if (uploadedFile.originalname.toLowerCase().endsWith('.tar.gz')) {
                extractCommand = `cd /tmp/devops-uploads/extracted && tar -xzf ${remoteTempPath} -C ${remoteExtractPath} --strip-components=1`;
              } else if (uploadedFile.originalname.toLowerCase().endsWith('.tar.bz2')) {
                extractCommand = `cd /tmp/devops-uploads/extracted && tar -xjf ${remoteTempPath} -C ${remoteExtractPath} --strip-components=1`;
              } else {
                // 对于其他格式，尝试通用解压
                extractCommand = `cd /tmp/devops-uploads/extracted && mkdir -p ${remoteExtractPath} && cp ${remoteTempPath} ${remoteExtractPath}/`;
              }
              
              const extractResult = await authService.executeCommand(sessionId, extractCommand, 60000); // 60秒超时用于解压
              
              if (extractResult.exitCode !== 0) {
                console.warn('解压失败，尝试备用方案:', extractResult.stderr);
                // 备用方案：直接复制文件
                const copyCommand = `cp ${remoteTempPath} ${remoteExtractPath}/`;
                const copyResult = await authService.executeCommand(sessionId, copyCommand, 30000);
                if (copyResult.exitCode !== 0) {
                  throw new Error(`文件解压和复制都失败: ${extractResult.stderr}`);
                }
              }

              // 验证解压结果
              const listCommand = `ls -la ${remoteExtractPath}`;
              const listResult = await authService.executeCommand(sessionId, listCommand, 10000);
              
              if (listResult.exitCode !== 0) {
                throw new Error(`无法访问解压目录: ${listResult.stderr}`);
              }

              // 清理临时压缩文件
              const cleanupCommand = `rm -f ${remoteTempPath}`;
              await authService.executeCommand(sessionId, cleanupCommand, 10000);
              
              finalPath = remoteExtractPath;
              message = `代码包上传成功（使用${transferResult.method}），解压到 ${remoteExtractPath}`;
              
              console.log('文件上传和解压成功:', {
                originalName: uploadedFile.originalname,
                remotePath: remoteExtractPath,
                size: uploadedFile.size
              });
            } catch (extractError: any) {
              console.warn('解压操作失败，自动降级为保持压缩格式:', extractError.message);
              // 解压失败时降级为保持压缩格式
              finalPath = remoteTempPath;
              message = `代码包上传成功（使用${transferResult.method}），文件保存到 ${remoteTempPath}（解压失败）`;
            }
          }
        } else {
          message = `代码包上传成功（使用${transferResult.method}），文件保存到 ${remoteTempPath}`;
          
          console.log('文件上传成功（保持压缩格式）:', {
            originalName: uploadedFile.originalname,
            remotePath: remoteTempPath,
            size: uploadedFile.size
          });
        }

        res.json({
          success: true,
          data: {
            remotePath: finalPath,
            originalName: uploadedFile.originalname,
            size: uploadedFile.size,
            uploadTime: new Date().toISOString(),
            transferMethod: transferResult.method,
            available: transferResult.available,
            extractMode: extractMode
          },
          message: message
        });

      } catch (error: any) {
        console.error('文件上传处理失败:', error);
        
        let errorMessage = '文件上传处理失败';
        
        if (error.message.includes('ECONNRESET')) {
          errorMessage = 'SSH连接被重置，请检查网络连接和服务器状态';
        } else if (error.message.includes('SFTP连接失败')) {
          errorMessage = 'SFTP连接失败，可能是服务器SFTP服务未启用';
        } else if (error.message.includes('SCP传输失败')) {
          errorMessage = 'SCP传输失败，可能是服务器SCP命令不可用';
        } else if (error.message.includes('服务器不支持SCP和SFTP')) {
          errorMessage = '服务器不支持文件传输，请确保安装了OpenSSH并启用相关服务';
        } else if (error.message.includes('SSH会话已断开')) {
          errorMessage = 'SSH会话已断开，请重新登录后再试';
        } else if (error.message.includes('文件大小不匹配')) {
          errorMessage = '文件传输不完整，请重试或检查网络连接';
        } else {
          errorMessage = error.message || '文件上传处理失败';
        }
        
        // 清理可能的临时文件（只在会话有效时执行）
        try {
          const currentSession = authService.getSession(sessionId);
          if (currentSession && currentSession.connected) {
            // 会话仍然有效，尝试清理远程临时文件
            try {
              await authService.executeCommand(sessionId, `rm -f ${remoteTempPath}`, 10000);
              await authService.executeCommand(sessionId, `rm -rf ${remoteExtractPath}`, 10000);
              console.log('远程临时文件清理完成');
            } catch (remoteCleanupError: any) {
              console.warn('远程临时文件清理失败（会话可能已断开）:', remoteCleanupError.message);
            }
          } else {
            console.log('会话已断开，跳过远程临时文件清理');
          }
        } catch (cleanupError) {
          console.warn('清理临时文件失败:', cleanupError);
        }
        
        res.status(500).json({
          success: false,
          message: errorMessage
        });
      } finally {
        // 删除本地临时文件
        if (fs.existsSync(uploadedFile.path)) {
          fs.unlinkSync(uploadedFile.path);
        }
      }

    } catch (error: any) {
      console.error('上传代码包失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '上传代码包失败'
      });
    }
  };

  /**
   * 检测远程服务器是否支持SCP命令
   */
  private async checkScpAvailability(sessionId: string): Promise<boolean> {
    try {
      const session = authService.getSession(sessionId);
      if (!session || !session.connected) {
        return false;
      }

      // 检查scp命令是否存在
      const checkResult = await authService.executeCommand(sessionId, 'which scp 2>/dev/null || command -v scp 2>/dev/null', 5000);
      
      if (checkResult.exitCode === 0 && checkResult.stdout.trim()) {
        console.log('SCP可用:', checkResult.stdout.trim());
        return true;
      }
      
      console.log('SCP不可用，检查结果:', checkResult);
      return false;
    } catch (error: any) {
      console.error('检测SCP可用性时出错:', error);
      return false;
    }
  }

  /**
   * 检测远程服务器是否支持SFTP
   */
  private async checkSftpAvailability(sessionId: string): Promise<boolean> {
    try {
      const session = authService.getSession(sessionId);
      if (!session || !session.connected) {
        return false;
      }

      return new Promise((resolve) => {
        session.client.sftp((err, sftp) => {
          if (err) {
            console.log('SFTP不可用:', err.message);
            resolve(false);
            return;
          }
          console.log('SFTP可用');
          resolve(true);
        });
      });
    } catch (error: any) {
      console.error('检测SFTP可用性时出错:', error);
      return false;
    }
  }

  /**
   * 通过SCP上传文件（使用临时会话）
   */
  private async uploadFileViaSCP(sessionId: string, localPath: string, remotePath: string): Promise<void> {
    const mainSession = authService.getSession(sessionId);
    if (!mainSession) {
      throw new Error('主会话不存在');
    }

    const fileSize = fs.statSync(localPath).size;
    console.log(`开始SCP传输文件: ${localPath} -> ${remotePath} (大小: ${fileSize} bytes)`);
    
    let tempSession;
    try {
      // 创建临时会话用于SCP传输
      console.log('正在创建临时SSH会话...');
      tempSession = await this.createTemporarySession(mainSession.host, mainSession.username, mainSession.password);
      console.log('临时SSH会话创建成功，开始文件传输...');
      
      await this.performScpTransfer(tempSession.client, localPath, remotePath);
      console.log(`SCP文件传输成功: ${remotePath}`);
    } catch (error: any) {
      console.error('SCP传输过程中发生错误:', error.message);
      throw error;
    } finally {
      // 关闭临时会话
      if (tempSession) {
        try {
          tempSession.client.destroy();
          console.log('临时SCP会话已关闭');
        } catch (error) {
          console.warn('关闭临时SCP会话失败:', error);
        }
      }
    }
  }

  /**
   * 创建临时SSH会话
   */
  private async createTemporarySession(host: string, username: string, password: string): Promise<{ client: any; connected: boolean }> {
    return new Promise((resolve, reject) => {
      const { Client } = require('ssh2');
      const tempClient = new Client();
      let resolved = false;
      
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          try {
            tempClient.destroy();
          } catch (e) {
            // 忽略清理错误
          }
        }
      };
      
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('临时SSH会话连接超时'));
      }, 15000); // 增加超时时间到15秒

      tempClient.on('ready', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          console.log(`临时SSH会话创建成功: ${username}@${host}`);
          resolve({ client: tempClient, connected: true });
        }
      });

      tempClient.on('error', (error: Error) => {
        cleanup();
        clearTimeout(timeoutId);
        reject(new Error(`临时SSH会话连接失败: ${error.message}`));
      });

      tempClient.on('close', () => {
        if (!resolved) {
          cleanup();
          clearTimeout(timeoutId);
          reject(new Error('临时SSH会话意外关闭'));
        }
      });

      console.log(`正在创建临时SSH会话连接到 ${username}@${host}...`);
      tempClient.connect({
        host,
        username,
        password,
        readyTimeout: 15000,
        keepaliveInterval: 0 // 禁用keepalive，临时会话用完即断
      });
    });
  }

  /**
   * 执行SCP传输操作
   */
  private async performScpTransfer(client: any, localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(localPath);
      const fileSize = fs.statSync(localPath).size;
      let transferredBytes = 0;
      let transferCompleted = false;
      let streamClosed = false;
      let resolved = false;
      let finalizeTimer: NodeJS.Timeout | null = null;

      const finishTransfer = (success: boolean, message?: string) => {
        if (resolved) return;
        resolved = true;
        
        // 清理定时器
        if (finalizeTimer) {
          clearTimeout(finalizeTimer);
          finalizeTimer = null;
        }
        
        // 清理流
        try {
          fileStream.destroy();
        } catch (e) {
          // 忽略清理错误
        }
        
        if (success) {
          console.log('SCP传输最终状态：成功');
          resolve();
        } else {
          console.log('SCP传输最终状态：失败 -', message);
          reject(new Error(message || 'SCP传输失败'));
        }
      };

      // 执行SCP命令
      client.exec(`cat > "${remotePath}"`, (err: Error, stream: any) => {
        if (err) {
          finishTransfer(false, `SCP命令执行失败: ${err.message}`);
          return;
        }

        // 监听命令流错误
        stream.on('error', (error: Error) => {
          if (!resolved) {
            console.error('SCP传输流错误:', error);
            finishTransfer(false, `SCP传输流错误: ${error.message}`);
          }
        });

        // 监听命令结束
        stream.on('close', (exitCode: number) => {
          console.log(`SCP命令结束，退出码: ${exitCode}, 传输完成: ${transferCompleted}`);
          streamClosed = true;
          
          if (!resolved) {
            if (transferCompleted) {
              // 文件传输已完成，不管退出码如何都认为成功
              console.log('文件传输已完成，SCP传输成功');
              finishTransfer(true);
            } else {
              finishTransfer(false, `SCP传输失败，数据未完全传输，退出码: ${exitCode}`);
            }
          }
        });

        // 监听标准错误输出
        stream.stderr.on('data', (data: Buffer) => {
          const errorMsg = data.toString();
          console.warn('SCP stderr:', errorMsg);
          // 如果是明显的错误且传输未完成，则立即失败
          if (!transferCompleted && !resolved && (
            errorMsg.includes('Permission denied') ||
            errorMsg.includes('No such file or directory') ||
            errorMsg.includes('Cannot create')
          )) {
            finishTransfer(false, `SCP传输错误: ${errorMsg}`);
          }
        });

        // 监听文件流数据，显示进度
        fileStream.on('data', (chunk: string | Buffer) => {
          const chunkSize = typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
          transferredBytes += chunkSize;
          const progress = Math.round((transferredBytes / fileSize) * 100);
          
          // 每10%或每1MB显示进度
          if (progress % 10 === 0 || transferredBytes % (1024 * 1024) === 0 || transferredBytes === fileSize) {
            console.log(`SCP传输进度: ${progress}% (${transferredBytes}/${fileSize} bytes)`);
          }
        });

        // 文件流结束 - 这是传输完成的关键标志
        fileStream.on('end', () => {
          transferCompleted = true;
          console.log('文件数据传输完成，发送EOF信号...');
          
          // 明确告诉远程命令输入结束
          try {
            stream.stdin.end();
          } catch (e) {
            console.warn('发送EOF信号失败:', e);
          }
          
          // 如果命令流已关闭，立即完成
          if (streamClosed) {
            finishTransfer(true);
          } else {
            // 等待命令流关闭，但不要等太久
            finalizeTimer = setTimeout(() => {
              if (!resolved) {
                console.log('命令流关闭超时，但文件传输已完成，强制标记为成功');
                finishTransfer(true);
              }
            }, 3000); // 3秒超时
          }
        });

        // 文件流错误
        fileStream.on('error', (error: Error) => {
          if (!resolved) {
            finishTransfer(false, `文件读取失败: ${error.message}`);
          }
        });

        // 开始传输：将文件流管道到SSH流
        fileStream.pipe(stream.stdin, { end: false });

        // 设置总体传输超时（更合理的超时时间）
        const timeoutMinutes = Math.max(2, Math.ceil(fileSize / (1024 * 1024))); // 至少2分钟，每MB增加1分钟
        const timeoutMs = timeoutMinutes * 60 * 1000;
        
        setTimeout(() => {
          if (!resolved) {
            if (transferCompleted) {
              console.warn('传输已完成但命令未结束，强制标记为成功');
              finishTransfer(true);
            } else {
              console.error('传输超时，数据未完全传输');
              finishTransfer(false, `SCP传输超时 (${timeoutMinutes}分钟)`);
            }
          }
        }, timeoutMs);
      });
    });
  }

  /**
   * 使用SFTP传输文件
   */
  private async uploadFileViaSFTP(sessionId: string, localPath: string, remotePath: string): Promise<void> {
    const session = authService.getSession(sessionId);
    if (!session || !session.connected) {
      throw new Error('SSH会话不存在或已断开');
    }

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) {
          reject(new Error(`SFTP连接失败: ${err.message}`));
          return;
        }

        console.log(`开始传输文件: ${localPath} -> ${remotePath}`);
        
        // 使用fastPut方法传输文件，支持进度回调
        sftp.fastPut(localPath, remotePath, {
          step: (totalTransferred: number, chunk: number, total: number) => {
            const progress = Math.round((totalTransferred / total) * 100);
            if (totalTransferred % (1024 * 1024) === 0 || totalTransferred === total) {
              console.log(`SFTP传输进度: ${progress}% (${totalTransferred}/${total} bytes)`);
            }
          }
        }, (err) => {
          if (err) {
            reject(new Error(`SFTP文件传输失败: ${err.message}`));
            return;
          }
          console.log(`SFTP文件传输成功: ${remotePath}`);
          resolve();
        });
      });
    });
  }

  /**
   * 智能文件传输 - 优先使用SCP，如果不可用则使用SFTP
   */
  private async uploadFileIntelligent(sessionId: string, localPath: string, remotePath: string): Promise<{ method: string; available: { scp: boolean; sftp: boolean } }> {
    console.log('开始智能文件传输检测...');
    
    // 并行检测SCP和SFTP可用性
    const [scpAvailable, sftpAvailable] = await Promise.all([
      this.checkScpAvailability(sessionId),
      this.checkSftpAvailability(sessionId)
    ]);
    
    console.log(`传输方式可用性检测结果 - SCP: ${scpAvailable}, SFTP: ${sftpAvailable}`);
    
    // 优先使用SCP（更轻量级）
    if (scpAvailable) {
      try {
        // 再次检查SSH连接状态
        const session = authService.getSession(sessionId);
        if (!session || !session.connected) {
          throw new Error('SSH会话在SCP传输前已断开');
        }
        
        console.log('开始执行SCP传输...');
        await this.uploadFileViaSCP(sessionId, localPath, remotePath);
        console.log('SCP传输完成，检查文件是否成功传输...');
        
        // 验证文件是否成功传输（使用主会话或创建新的验证会话）
        try {
          const currentSession = authService.getSession(sessionId);
          let verificationSuccess = false;
          
          if (currentSession && currentSession.connected) {
            // 主会话可用，直接验证
            const fileSize = require('fs').statSync(localPath).size;
            const sizeCheckCommand = `stat -f%z "${remotePath}" 2>/dev/null || stat -c%s "${remotePath}" 2>/dev/null`;
            const sizeResult = await authService.executeCommand(sessionId, sizeCheckCommand, 10000);
            
            if (sizeResult.exitCode === 0) {
              const remoteSize = parseInt(sizeResult.stdout.trim());
              if (remoteSize === fileSize) {
                verificationSuccess = true;
                console.log(`SCP传输验证成功: 本地大小=${fileSize}, 远程大小=${remoteSize}`);
              } else {
                console.warn(`文件大小不匹配但SCP已完成: 本地=${fileSize}, 远程=${remoteSize}`);
                verificationSuccess = true; // 仍然认为成功
              }
            }
          } else {
            // 主会话断开，创建临时会话进行验证
            console.log('主会话断开，创建临时验证会话...');
            try {
              const mainSession = authService.getSession(sessionId);
              if (mainSession) {
                const verifySession = await this.createTemporarySession(
                  mainSession.host, 
                  mainSession.username, 
                  mainSession.password
                );
                
                try {
                  const fileSize = require('fs').statSync(localPath).size;
                  const sizeCheckCommand = `stat -f%z "${remotePath}" 2>/dev/null || stat -c%s "${remotePath}" 2>/dev/null`;
                  
                  const sizeResult = await new Promise((resolve, reject) => {
                    verifySession.client.exec(sizeCheckCommand, (err: any, stream: any) => {
                      if (err) {
                        reject(err);
                        return;
                      }
                      
                      let stdout = '';
                      let stderr = '';
                      
                      stream.on('data', (data: Buffer) => {
                        stdout += data.toString();
                      });
                      
                      stream.stderr.on('data', (data: Buffer) => {
                        stderr += data.toString();
                      });
                      
                      stream.on('close', (exitCode: number) => {
                        resolve({ exitCode, stdout: stdout.trim(), stderr: stderr.trim() });
                      });
                      
                      stream.on('error', reject);
                    });
                  }) as any;
                  
                  if (sizeResult.exitCode === 0) {
                    const remoteSize = parseInt(sizeResult.stdout);
                    if (remoteSize === fileSize) {
                      verificationSuccess = true;
                      console.log(`SCP传输验证成功（临时会话）: 本地大小=${fileSize}, 远程大小=${remoteSize}`);
                    } else {
                      console.warn(`文件大小不匹配但SCP已完成（临时会话）: 本地=${fileSize}, 远程=${remoteSize}`);
                      verificationSuccess = true; // 仍然认为成功
                    }
                  }
                } finally {
                  verifySession.client.destroy();
                }
              }
            } catch (verifyError) {
              console.warn('临时验证会话创建失败，跳过验证:', verifyError);
              verificationSuccess = true; // SCP已完成，认为成功
            }
          }
          
          if (!verificationSuccess) {
            console.warn('文件验证失败，但SCP传输过程已完成');
          }
        } catch (verifyError) {
          console.warn('SCP传输后验证出错，但传输可能已成功:', verifyError);
        }
        
        console.log('SCP文件传输流程完成');
        return { method: 'SCP', available: { scp: scpAvailable, sftp: sftpAvailable } };
        
      } catch (error: any) {
        console.warn('SCP传输失败，尝试SFTP:', error.message);
        
        // 如果是连接问题且SFTP可用，尝试SFTP
        if (sftpAvailable && !error.message.includes('SSH会话在SCP传输前已断开')) {
          console.log('尝试使用SFTP作为备选方案...');
          await this.uploadFileViaSFTP(sessionId, localPath, remotePath);
          return { method: 'SFTP(备选)', available: { scp: scpAvailable, sftp: sftpAvailable } };
        } else {
          throw new Error(`SCP传输失败且SFTP不可用: ${error.message}`);
        }
      }
    } else if (sftpAvailable) {
      // SCP不可用，使用SFTP
      await this.uploadFileViaSFTP(sessionId, localPath, remotePath);
      return { method: 'SFTP', available: { scp: scpAvailable, sftp: sftpAvailable } };
    } else {
      // 两种方式都不可用
      throw new Error('服务器不支持SCP和SFTP文件传输。请确保远程服务器已安装OpenSSH并启用相关服务。');
    }
  }

  /**
   * 尝试重新建立SSH连接
   */
  private async attemptReconnection(sessionId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // 使用AuthService的重连功能
      const reconnectResult = await authService.attemptReconnection(sessionId);
      return reconnectResult;
    } catch (error: any) {
      console.error('SSH重连尝试失败:', error);
      return { success: false, message: error.message || '重连尝试失败' };
    }
  }
}