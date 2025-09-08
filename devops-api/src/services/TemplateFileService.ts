import * as path from 'path';
import { authService } from './AuthService';

export interface TemplateFile {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
  lastModified?: Date;
}

export class TemplateFileService {
  private readonly rootPath: string;

  constructor() {
    // 远程主机上的DevOps根目录路径
    this.rootPath = '/root/devops';
  }

  // 获取模板文件列表
  async getTemplateFiles(sessionId: string, source: string, templateName: string, templateType: 'middleware' | 'app' = 'middleware'): Promise<TemplateFile[]> {
    const templatePath = this.getTemplatePath(source, templateName, templateType);

    try {
      // 检查模板目录是否存在
      const dirExistsResult = await authService.executeCommand(sessionId, `test -d "${templatePath}" && echo "exists"`);
      if (dirExistsResult.exitCode !== 0 || !dirExistsResult.stdout.includes('exists')) {
        throw new Error(`模板目录不存在: ${templateName}`);
      }

      // 使用ls命令获取文件列表，包含详细信息
      const listCommand = `ls -la "${templatePath}" | tail -n +2`; // 跳过第一行的总计信息
      const result = await authService.executeCommand(sessionId, listCommand);

      if (result.exitCode !== 0) {
        throw new Error(`读取模板目录失败: ${result.stderr}`);
      }

      const templateFiles: TemplateFile[] = [];
      const lines = result.stdout.trim().split('\n').filter(line => line.trim());

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 9) continue; // 跳过格式不正确的行

        const permissions = parts[0];
        const size = parseInt(parts[4]) || 0;
        const fileName = parts.slice(8).join(' '); // 文件名可能包含空格

        // 跳过当前目录和父目录
        if (fileName === '.' || fileName === '..') continue;

        const isDirectory = permissions.startsWith('d');
        const isFile = permissions.startsWith('-');

        if (isDirectory || isFile) {
          templateFiles.push({
            name: fileName,
            type: isDirectory ? 'directory' : 'file',
            size: isFile ? size : undefined,
            extension: isFile ? path.extname(fileName) : undefined,
            lastModified: new Date() // 简化处理，实际可以解析ls的时间信息
          });
        }
      }

      // 排序：目录在前，文件在后，同类型按名称排序
      templateFiles.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return templateFiles;
    } catch (error: any) {
      throw new Error(`读取模板目录失败: ${error.message}`);
    }
  }

  // 获取模板文件内容
  async getTemplateFileContent(sessionId: string, source: string, templateName: string, fileName: string, templateType: 'middleware' | 'app' = 'middleware'): Promise<string> {
    // 安全检查：防止路径遍历攻击
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new Error('无效的文件名');
    }

    const templatePath = this.getTemplatePath(source, templateName, templateType);
    const filePath = `${templatePath}/${fileName}`;

    try {
      // 检查文件是否存在且是文件
      const fileCheckResult = await authService.executeCommand(sessionId, `test -f "${filePath}" && echo "exists"`);
      if (fileCheckResult.exitCode !== 0 || !fileCheckResult.stdout.includes('exists')) {
        throw new Error(`文件不存在: ${fileName}`);
      }

      // 检查文件大小（限制1MB）
      const sizeResult = await authService.executeCommand(sessionId, `stat -c%s "${filePath}"`);
      if (sizeResult.exitCode === 0) {
        const fileSize = parseInt(sizeResult.stdout.trim());
        const maxSize = 1024 * 1024; // 1MB
        if (fileSize > maxSize) {
          throw new Error(`文件过大，超过 ${maxSize / 1024 / 1024}MB 限制`);
        }
      }

      // 读取文件内容
      const content = await authService.readRemoteFile(sessionId, filePath);
      return content;
    } catch (error: any) {
      throw new Error(`读取文件失败: ${error.message}`);
    }
  }

  // 获取模板路径
  private getTemplatePath(source: string, templateName: string, templateType: 'middleware' | 'app' = 'middleware'): string {
    if (source === 'global') {
      // 全局模板路径：/opt/devops/templates/k8s/{templateType}/{templateName}
      return `${this.rootPath}/templates/k8s/${templateType}/${templateName}`;
    } else {
      // 工作空间模板路径：/opt/devops/workspace/{workspace}/templates/k8s/{templateType}/{templateName}
      // 注意：这里的source实际上是workspace名称
      return `${this.rootPath}/workspace/${source}/templates/k8s/${templateType}/${templateName}`;
    }
  }

  // 检查模板是否存在
  async templateExists(sessionId: string, source: string, templateName: string, templateType: 'middleware' | 'app' = 'middleware'): Promise<boolean> {
    const templatePath = this.getTemplatePath(source, templateName, templateType);
    try {
      const result = await authService.executeCommand(sessionId, `test -d "${templatePath}" && echo "exists"`);
      return result.exitCode === 0 && result.stdout.includes('exists');
    } catch (error) {
      return false;
    }
  }

  // 获取文件类型信息
  getFileTypeInfo(fileName: string): { type: string; language: string; icon: string } {
    const ext = path.extname(fileName).toLowerCase();

    switch (ext) {
      case '.yaml':
      case '.yml':
        return { type: 'YAML', language: 'yaml', icon: '📄' };
      case '.j2':
        return { type: 'Jinja2 Template', language: 'yaml', icon: '🔧' };
      case '.md':
        return { type: 'Markdown', language: 'markdown', icon: '📝' };
      case '.sh':
        return { type: 'Shell Script', language: 'bash', icon: '⚡' };
      case '.json':
        return { type: 'JSON', language: 'json', icon: '📋' };
      case '.txt':
        return { type: 'Text', language: 'text', icon: '📄' };
      default:
        return { type: 'Unknown', language: 'text', icon: '📄' };
    }
  }

  // 编辑模板文件内容（仅限工作空间模板）
  async updateTemplateFileContent(sessionId: string, source: string, templateName: string, fileName: string, content: string, templateType: 'middleware' | 'app' = 'middleware'): Promise<void> {
    // 安全检查：只允许编辑工作空间模板
    if (source === 'global') {
      throw new Error('全局模板不允许编辑');
    }

    // 安全检查：防止路径遍历攻击
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new Error('无效的文件名');
    }

    const templatePath = this.getTemplatePath(source, templateName, templateType);
    const filePath = `${templatePath}/${fileName}`;

    try {
      // 检查文件是否存在
      const fileCheckResult = await authService.executeCommand(sessionId, `test -f "${filePath}" && echo "exists"`);
      if (fileCheckResult.exitCode !== 0 || !fileCheckResult.stdout.includes('exists')) {
        throw new Error(`文件不存在: ${fileName}`);
      }

      // 备份原文件
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await authService.executeCommand(sessionId, `cp "${filePath}" "${backupPath}"`);

      // 写入新内容
      await authService.writeRemoteFile(sessionId, filePath, content);

      console.log(`文件已更新: ${filePath}`);
    } catch (error: any) {
      throw new Error(`更新文件失败: ${error.message}`);
    }
  }
}
