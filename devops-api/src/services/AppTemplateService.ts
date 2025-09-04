import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { authService } from './AuthService';

export interface AppTemplate {
  name: string;
  displayName?: string;
  description?: string;
  type?: string;
  platform?: string;
  author?: string;
  version?: string;
  hasMetadata: boolean;
  source: 'global' | 'workspace';
  category: string;
  tags?: string[];
  variables?: Array<{
    name: string;
    type: string;
    required?: boolean;
    default?: any;
    description?: string;
    example?: string;
    validation?: string;
    options?: string[];
  }>;
}

export interface AppTemplateMetadata {
  name?: string;
  displayName?: string;
  type?: string;
  description?: string;
  version?: string;
  author?: string;
  platform?: string;
  tags?: string[];
  variables?: Array<{
    name: string;
    type: string;
    required?: boolean;
    default?: any;
    description?: string;
    example?: string;
    validation?: string;
    options?: string[];
  }>;
}

interface CacheEntry {
  data: AppTemplate[];
  timestamp: number;
  sessionId: string;
}

export class AppTemplateService {
  private remoteBasePath: string;
  private globalTemplatesCache: Map<string, CacheEntry> = new Map();
  private workspaceTemplatesCache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  constructor() {
    // 远程主机的devops根目录
    this.remoteBasePath = '/root/devops';

    // 定时清理过期缓存
    setInterval(() => {
      this.cleanExpiredCache();
    }, 60 * 1000); // 每分钟清理一次
  }

  // 清理过期缓存
  private cleanExpiredCache(): void {
    const now = Date.now();

    // 清理全局模板缓存
    for (const [key, entry] of this.globalTemplatesCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.globalTemplatesCache.delete(key);
        console.log(`清理过期的全局模板缓存: ${key}`);
      }
    }

    // 清理工作空间模板缓存
    for (const [key, entry] of this.workspaceTemplatesCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.workspaceTemplatesCache.delete(key);
        console.log(`清理过期的工作空间模板缓存: ${key}`);
      }
    }
  }

  // 获取缓存键
  private getCacheKey(sessionId: string, path?: string): string {
    const session = authService.getSession(sessionId);
    if (!session) return '';
    return `${session.host}:${session.username}${path ? ':' + path : ''}`;
  }

  // 检查缓存是否有效
  private isCacheValid(entry: CacheEntry, sessionId: string): boolean {
    const now = Date.now();
    return (
      entry.sessionId === sessionId &&
      (now - entry.timestamp) < this.CACHE_TTL
    );
  }

  // 从模板名称推断分类
  private inferCategoryFromName(name: string): string {
    if (name.includes('spring') || name.includes('java')) return 'java';
    if (name.includes('vue') || name.includes('react') || name.includes('angular')) return 'vue';
    if (name.includes('python') || name.includes('django') || name.includes('flask')) return 'python';
    if (name.includes('golang') || name.includes('gin') || name.includes('go')) return 'golang';
    if (name.includes('nginx')) return 'nginx';
    return 'other';
  }

  // 读取远程模板的metadata.yaml文件
  private async readRemoteTemplateMetadata(sessionId: string, templatePath: string): Promise<AppTemplateMetadata | null> {
    const metadataPath = `${templatePath}/metadata.yaml`;

    try {
      const metadataContent = await authService.readRemoteFile(sessionId, metadataPath);
      if (metadataContent) {
        return yaml.load(metadataContent) as AppTemplateMetadata;
      }
    } catch (error) {
      console.warn(`Failed to read remote metadata for template at ${templatePath}:`, error);
    }

    return null;
  }

  // 扫描远程指定目录下的模板
  private async scanRemoteTemplates(sessionId: string, templatesPath: string, source: 'global' | 'workspace'): Promise<AppTemplate[]> {
    const templates: AppTemplate[] = [];

    try {
      console.log(`正在扫描远程模板目录: ${templatesPath}`);

      const templateDirs = await authService.listRemoteDirectory(sessionId, templatesPath);
      console.log(`找到模板目录: ${templateDirs.length} 个`, templateDirs);

      if (!templateDirs || templateDirs.length === 0) {
        console.warn(`No templates found in remote directory: ${templatesPath}`);
        return templates;
      }

      for (const templateName of templateDirs) {
        console.log(`处理模板: ${templateName}`);
        const templatePath = `${templatesPath}/${templateName}`;
        const metadata = await this.readRemoteTemplateMetadata(sessionId, templatePath);

        const template: AppTemplate = {
          name: templateName,
          displayName: metadata?.displayName || metadata?.name || templateName,
          description: metadata?.description,
          type: metadata?.type,
          platform: metadata?.platform || 'kubernetes',
          author: metadata?.author,
          version: metadata?.version,
          hasMetadata: metadata !== null,
          source,
          category: metadata?.type || this.inferCategoryFromName(templateName),
          tags: metadata?.tags,
          variables: metadata?.variables
        };

        templates.push(template);
        console.log(`成功添加模板: ${templateName}`);
      }
    } catch (error) {
      console.error(`Error scanning remote templates in ${templatesPath}:`, error);
    }

    console.log(`扫描完成，共找到 ${templates.length} 个模板`);
    return templates;
  }

  // 获取全局app模板
  async getGlobalAppTemplates(sessionId: string): Promise<AppTemplate[]> {
    const cacheKey = this.getCacheKey(sessionId, 'global');

    // 检查缓存
    const cached = this.globalTemplatesCache.get(cacheKey);
    if (cached && this.isCacheValid(cached, sessionId)) {
      console.log('使用缓存的全局App模板数据');
      return cached.data;
    }

    console.log('缓存未命中，重新扫描全局App模板');
    const globalTemplatesPath = `${this.remoteBasePath}/templates/k8s/app`;
    const templates = await this.scanRemoteTemplates(sessionId, globalTemplatesPath, 'global');

    // 更新缓存
    this.globalTemplatesCache.set(cacheKey, {
      data: templates,
      timestamp: Date.now(),
      sessionId
    });

    return templates;
  }

  // 获取工作空间app模板
  async getWorkspaceAppTemplates(sessionId: string, workspace: string): Promise<AppTemplate[]> {
    const cacheKey = this.getCacheKey(sessionId, `workspace:${workspace}`);

    // 检查缓存
    const cached = this.workspaceTemplatesCache.get(cacheKey);
    if (cached && this.isCacheValid(cached, sessionId)) {
      console.log(`使用缓存的工作空间App模板数据: ${workspace}`);
      return cached.data;
    }

    console.log(`缓存未命中，重新扫描工作空间App模板: ${workspace}`);
    // 工作空间模板路径：/root/devops/workspace/{workspace}/templates/k8s/app
    const workspaceTemplatesPath = `${this.remoteBasePath}/workspace/${workspace}/templates/k8s/app`;
    const templates = await this.scanRemoteTemplates(sessionId, workspaceTemplatesPath, 'workspace');

    // 更新缓存
    this.workspaceTemplatesCache.set(cacheKey, {
      data: templates,
      timestamp: Date.now(),
      sessionId
    });

    return templates;
  }

  // 清除指定会话的缓存
  clearCache(sessionId: string): void {
    const session = authService.getSession(sessionId);
    if (!session) return;

    const hostPrefix = `${session.host}:${session.username}`;

    // 清除全局模板缓存
    for (const [key] of this.globalTemplatesCache.entries()) {
      if (key.startsWith(hostPrefix)) {
        this.globalTemplatesCache.delete(key);
        console.log(`清除全局模板缓存: ${key}`);
      }
    }

    // 清除工作空间模板缓存
    for (const [key] of this.workspaceTemplatesCache.entries()) {
      if (key.startsWith(hostPrefix)) {
        this.workspaceTemplatesCache.delete(key);
        console.log(`清除工作空间模板缓存: ${key}`);
      }
    }
  }

  // 获取所有app模板（全局 + 工作空间）
  async getAllAppTemplates(sessionId: string, workspace: string) {
    console.log(`开始获取所有App模板，工作空间: ${workspace}`);

    console.log('正在获取全局App模板...');
    const globalTemplates = await this.getGlobalAppTemplates(sessionId);
    console.log(`全局App模板数量: ${globalTemplates.length}`);

    console.log('正在获取工作空间App模板...');
    const workspaceTemplates = await this.getWorkspaceAppTemplates(sessionId, workspace);
    console.log(`工作空间App模板数量: ${workspaceTemplates.length}`);

    // 获取所有分类
    const allTemplates = [...globalTemplates, ...workspaceTemplates];
    const categories = [...new Set(allTemplates.map(t => t.category))];
    const platforms = [...new Set(allTemplates.map(t => t.platform).filter(Boolean))];

    return {
      templates: {
        global: globalTemplates,
        workspace: workspaceTemplates
      },
      categories,
      platforms,
      defaults: {
        platform: 'kubernetes',
        replicas: 1,
        memory_limit: '512Mi',
        cpu_limit: '500m'
      }
    };
  }

  // 获取单个app模板详情
  async getAppTemplate(sessionId: string, templateName: string, workspace?: string): Promise<AppTemplate> {
    // 先在全局模板中查找
    const globalTemplates = await this.getGlobalAppTemplates(sessionId);
    let template = globalTemplates.find(t => t.name === templateName);

    if (!template && workspace) {
      // 在工作空间模板中查找
      const workspaceTemplates = await this.getWorkspaceAppTemplates(sessionId, workspace);
      template = workspaceTemplates.find(t => t.name === templateName);
    }

    if (!template) {
      throw new Error(`App template '${templateName}' not found`);
    }

    return template;
  }

  // 获取模板的变量定义
  async getAppTemplateVariables(sessionId: string, templateName: string, workspace?: string) {
    const template = await this.getAppTemplate(sessionId, templateName, workspace);

    return {
      variables: template.variables || [],
      defaults: {
        replicas: 1,
        memory_limit: '512Mi',
        cpu_limit: '500m',
        port: 8080
      }
    };
  }
}
