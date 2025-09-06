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
  private readonly GLOBAL_CACHE_TTL = 30 * 60 * 1000; // 全局模板30分钟缓存
  private readonly WORKSPACE_CACHE_TTL = 10 * 60 * 1000; // 工作空间模板10分钟缓存

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

    // 清理全局模板缓存（较长TTL）
    for (const [key, entry] of this.globalTemplatesCache.entries()) {
      if (now - entry.timestamp > this.GLOBAL_CACHE_TTL) {
        this.globalTemplatesCache.delete(key);
        console.log(`清理过期的全局模板缓存: ${key}`);
      }
    }

    // 清理工作空间模板缓存（较短TTL）
    for (const [key, entry] of this.workspaceTemplatesCache.entries()) {
      if (now - entry.timestamp > this.WORKSPACE_CACHE_TTL) {
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

  // 检查全局缓存是否有效
  private isGlobalCacheValid(entry: CacheEntry, sessionId: string): boolean {
    const now = Date.now();
    return (
      entry.sessionId === sessionId &&
      (now - entry.timestamp) < this.GLOBAL_CACHE_TTL
    );
  }

  // 检查工作空间缓存是否有效
  private isWorkspaceCacheValid(entry: CacheEntry, sessionId: string): boolean {
    const now = Date.now();
    return (
      entry.sessionId === sessionId &&
      (now - entry.timestamp) < this.WORKSPACE_CACHE_TTL
    );
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

  // 扫描远程指定目录下的模板（优化版本）
  private async scanRemoteTemplates(sessionId: string, templatesPath: string, source: 'global' | 'workspace'): Promise<AppTemplate[]> {
    const templates: AppTemplate[] = [];

    try {
      console.log(`正在扫描远程模板目录: ${templatesPath}`);

      // 创建批量脚本，一次性获取所有模板信息
      const batchScript = `#!/bin/bash
# 检查目录是否存在
if [ ! -d "${templatesPath}" ]; then
  echo "DIRECTORY_NOT_EXISTS"
  exit 0
fi

# 获取所有模板目录
echo "=== TEMPLATE_DIRS ==="
ls -1 "${templatesPath}" 2>/dev/null | head -20 || echo "NO_TEMPLATES"

echo "=== TEMPLATE_METADATA ==="
# 遍历每个模板目录，读取metadata.yaml
for dir in "${templatesPath}"/*; do
  if [ -d "$dir" ]; then
    template_name=$(basename "$dir")
    metadata_file="$dir/metadata.yaml"
    echo "--- TEMPLATE: $template_name ---"
    if [ -f "$metadata_file" ]; then
      echo "HAS_METADATA: true"
      cat "$metadata_file" 2>/dev/null || echo "METADATA_READ_ERROR"
    else
      echo "HAS_METADATA: false"
    fi
    echo "--- END: $template_name ---"
  fi
done

echo "=== SCAN_COMPLETE ==="
`;

      const result = await authService.executeCommand(sessionId, batchScript);
      
      if (result.exitCode !== 0) {
        console.warn(`批量扫描模板脚本警告: ${result.stderr}`);
        return templates;
      }

      const output = result.stdout;
      if (output.includes('DIRECTORY_NOT_EXISTS')) {
        console.warn(`模板目录不存在: ${templatesPath}`);
        return templates;
      }

      // 解析输出
      const lines = output.split('\n');
      const templateDirs: string[] = [];
      const templateMetadata: Map<string, AppTemplateMetadata | null> = new Map();

      let currentSection = '';
      let currentTemplate = '';
      let currentMetadataLines: string[] = [];
      let hasMetadata = false;

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === '=== TEMPLATE_DIRS ===') {
          currentSection = 'dirs';
        } else if (trimmedLine === '=== TEMPLATE_METADATA ===') {
          currentSection = 'metadata';
        } else if (trimmedLine === '=== SCAN_COMPLETE ===') {
          // 处理最后一个模板的metadata
          if (currentTemplate && hasMetadata && currentMetadataLines.length > 0) {
            try {
              const metadataYaml = currentMetadataLines.join('\n');
              const metadata = yaml.load(metadataYaml) as AppTemplateMetadata;
              templateMetadata.set(currentTemplate, metadata);
            } catch (error) {
              console.warn(`解析模板metadata失败: ${currentTemplate}`, error);
              templateMetadata.set(currentTemplate, null);
            }
          }
          break;
        } else if (currentSection === 'dirs' && trimmedLine !== 'NO_TEMPLATES' && trimmedLine) {
          templateDirs.push(trimmedLine);
        } else if (currentSection === 'metadata') {
          if (trimmedLine.startsWith('--- TEMPLATE:') && trimmedLine.endsWith('---')) {
            // 处理上一个模板的metadata
            if (currentTemplate && hasMetadata && currentMetadataLines.length > 0) {
              try {
                const metadataYaml = currentMetadataLines.join('\n');
                const metadata = yaml.load(metadataYaml) as AppTemplateMetadata;
                templateMetadata.set(currentTemplate, metadata);
              } catch (error) {
                console.warn(`解析模板metadata失败: ${currentTemplate}`, error);
                templateMetadata.set(currentTemplate, null);
              }
            } else if (currentTemplate) {
              templateMetadata.set(currentTemplate, null);
            }

            // 开始新模板
            currentTemplate = trimmedLine.replace('--- TEMPLATE:', '').replace('---', '').trim();
            currentMetadataLines = [];
            hasMetadata = false;
          } else if (trimmedLine.startsWith('HAS_METADATA:')) {
            hasMetadata = trimmedLine.includes('true');
            if (!hasMetadata) {
              templateMetadata.set(currentTemplate, null);
            }
          } else if (trimmedLine.startsWith('--- END:')) {
            // 模板结束标记，不需要特殊处理
          } else if (hasMetadata && currentTemplate && 
                    !trimmedLine.startsWith('METADATA_READ_ERROR') && 
                    trimmedLine) {
            currentMetadataLines.push(line); // 保持原始缩进
          }
        }
      }

      console.log(`找到模板目录: ${templateDirs.length} 个`, templateDirs);
      console.log(`解析metadata: ${templateMetadata.size} 个`);

      // 构建模板对象
      for (const templateName of templateDirs) {
        const metadata = templateMetadata.get(templateName);
        
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
          category: '', // 不推断分类
          tags: metadata?.tags,
          variables: metadata?.variables
        };

        templates.push(template);
        console.log(`成功添加模板: ${templateName} (${template.hasMetadata ? '有metadata' : '无metadata'})`);
      }

    } catch (error) {
      console.error(`批量扫描远程模板失败: ${templatesPath}`, error);
    }

    console.log(`扫描完成，共找到 ${templates.length} 个模板`);
    return templates;
  }

  // 获取全局app模板
  async getGlobalAppTemplates(sessionId: string, buildPlatform: string = 'KUBERNETES'): Promise<AppTemplate[]> {
    const platformDir = this.getPlatformDir(buildPlatform);
    const cacheKey = this.getCacheKey(sessionId, `global:${platformDir}`);

    // 检查缓存
    const cached = this.globalTemplatesCache.get(cacheKey);
    if (cached && this.isGlobalCacheValid(cached, sessionId)) {
      console.log(`使用缓存的全局App模板数据 (${platformDir})`);
      return cached.data;
    }

    console.log(`缓存未命中，重新扫描全局App模板 (${platformDir})`);
    const globalTemplatesPath = `${this.remoteBasePath}/templates/${platformDir}/app`;
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
  async getWorkspaceAppTemplates(sessionId: string, workspace: string, buildPlatform: string = 'KUBERNETES'): Promise<AppTemplate[]> {
    const platformDir = this.getPlatformDir(buildPlatform);
    const cacheKey = this.getCacheKey(sessionId, `workspace:${workspace}:${platformDir}`);

    // 检查缓存
    const cached = this.workspaceTemplatesCache.get(cacheKey);
    if (cached && this.isWorkspaceCacheValid(cached, sessionId)) {
      console.log(`使用缓存的工作空间App模板数据: ${workspace} (${platformDir})`);
      return cached.data;
    }

    console.log(`缓存未命中，重新扫描工作空间App模板: ${workspace} (${platformDir})`);
    // 工作空间模板路径：/root/devops/workspace/{workspace}/templates/{platform}/app
    const workspaceTemplatesPath = `${this.remoteBasePath}/workspace/${workspace}/templates/${platformDir}/app`;
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

  // 获取工作空间配置
  private async getWorkspaceConfig(sessionId: string, workspace: string): Promise<Record<string, string> | null> {
    try {
      const configPath = `${this.remoteBasePath}/workspace/${workspace}/config`;
      const configContent = await authService.readRemoteFile(sessionId, configPath);

      // 解析配置文件
      const config: Record<string, string> = {};
      const lines = configContent.split('\n');

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
    } catch (error) {
      console.warn(`无法读取工作空间配置: ${workspace}`, error);
      return null;
    }
  }

  // 根据BUILD_PLATFORM获取平台目录名
  private getPlatformDir(buildPlatform: string): string {
    switch (buildPlatform) {
      case 'KUBERNETES':
        return 'k8s';
      case 'DOCKER_SWARM':
        return 'swarm';
      case 'DOCKER_COMPOSE':
        return 'compose';
      case 'SHELL':
        return 'shell';
      default:
        console.warn(`不支持的平台: ${buildPlatform}，使用默认k8s`);
        return 'k8s';
    }
  }

  // 根据构建平台获取模板过滤器
  private getPlatformFilter(buildPlatform: string): (template: AppTemplate) => boolean {
    return (template: AppTemplate) => {
      // 如果模板没有指定平台，默认支持所有平台
      if (!template.platform) {
        return true;
      }

      // 平台映射
      const platformMap: Record<string, string[]> = {
        'KUBERNETES': ['kubernetes', 'k8s'],
        'DOCKER_SWARM': ['docker-swarm', 'swarm', 'docker'],
        'DOCKER_COMPOSE': ['docker-compose', 'compose', 'docker']
      };

      const supportedPlatforms = platformMap[buildPlatform] || [buildPlatform.toLowerCase()];
      return supportedPlatforms.includes(template.platform.toLowerCase());
    };
  }

  // 获取所有app模板（全局 + 工作空间）
  async getAllAppTemplates(sessionId: string, workspace: string) {
    console.log(`开始获取所有App模板，工作空间: ${workspace}`);

    // 读取工作空间配置
    const workspaceConfig = await this.getWorkspaceConfig(sessionId, workspace);
    const buildPlatform = workspaceConfig?.BUILD_PLATFORM || 'KUBERNETES';
    console.log(`工作空间构建平台: ${buildPlatform}`);

    console.log('正在获取全局App模板...');
    const globalTemplates = await this.getGlobalAppTemplates(sessionId, buildPlatform);
    console.log(`全局App模板数量: ${globalTemplates.length}`);

    console.log('正在获取工作空间App模板...');
    const workspaceTemplates = await this.getWorkspaceAppTemplates(sessionId, workspace, buildPlatform);
    console.log(`工作空间App模板数量: ${workspaceTemplates.length}`);

    // 根据BUILD_PLATFORM过滤模板
    const platformFilter = this.getPlatformFilter(buildPlatform);
    const filteredGlobalTemplates = globalTemplates.filter(platformFilter);
    const filteredWorkspaceTemplates = workspaceTemplates.filter(platformFilter);

    console.log(`平台过滤后 - 全局模板: ${filteredGlobalTemplates.length}, 工作空间模板: ${filteredWorkspaceTemplates.length}`);

    // 工作空间模板覆盖同名全局模板
    const workspaceTemplateNames = new Set(filteredWorkspaceTemplates.map(t => t.name));
    const finalGlobalTemplates = filteredGlobalTemplates.filter(t => !workspaceTemplateNames.has(t.name));

    if (workspaceTemplateNames.size > 0) {
      const overriddenTemplates = filteredGlobalTemplates.filter(t => workspaceTemplateNames.has(t.name));
      if (overriddenTemplates.length > 0) {
        console.log(`工作空间模板覆盖了 ${overriddenTemplates.length} 个全局模板:`, overriddenTemplates.map(t => t.name));
      }
    }

    console.log(`最终模板数量 - 全局: ${finalGlobalTemplates.length}, 工作空间: ${filteredWorkspaceTemplates.length}`);

    // 获取所有分类
    const allTemplates = [...finalGlobalTemplates, ...filteredWorkspaceTemplates];
    const categories = [...new Set(allTemplates.map(t => t.category))];
    const platforms = [...new Set(allTemplates.map(t => t.platform).filter(Boolean))];

    return {
      templates: {
        global: finalGlobalTemplates,
        workspace: filteredWorkspaceTemplates
      },
      categories,
      platforms,
      workspaceConfig: {
        BUILD_PLATFORM: buildPlatform,
        BUILD_K8S_NAMESPACE: workspaceConfig?.BUILD_K8S_NAMESPACE,
        BUILD_ENABEL_HARBOR: workspaceConfig?.BUILD_ENABEL_HARBOR
      },
      defaults: {
        platform: buildPlatform.toLowerCase(),
        replicas: 1,
        memory_limit: '512Mi',
        cpu_limit: '500m'
      }
    };
  }

  // 获取单个app模板详情
  async getAppTemplate(sessionId: string, templateName: string, workspace?: string): Promise<AppTemplate> {
    // 获取工作空间配置以确定平台
    let buildPlatform = 'KUBERNETES';
    if (workspace) {
      const workspaceConfig = await this.getWorkspaceConfig(sessionId, workspace);
      buildPlatform = workspaceConfig?.BUILD_PLATFORM || 'KUBERNETES';
    }

    // 先在全局模板中查找
    const globalTemplates = await this.getGlobalAppTemplates(sessionId, buildPlatform);
    let template = globalTemplates.find(t => t.name === templateName);

    if (!template && workspace) {
      // 在工作空间模板中查找
      const workspaceTemplates = await this.getWorkspaceAppTemplates(sessionId, workspace, buildPlatform);
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

  // 清除所有缓存
  clearAllCache(): void {
    this.globalTemplatesCache.clear();
    this.workspaceTemplatesCache.clear();
    console.log('所有App模板缓存已清除');
  }

  // 清除特定工作空间的缓存
  clearWorkspaceCache(workspace: string): void {
    const keys = Array.from(this.workspaceTemplatesCache.keys());
    const workspaceKeys = keys.filter(key => key.includes(`workspace:${workspace}`));

    workspaceKeys.forEach(key => {
      this.workspaceTemplatesCache.delete(key);
    });

    console.log(`工作空间 ${workspace} 的缓存已清除，清除了 ${workspaceKeys.length} 个缓存项`);
  }

  // 清除全局模板缓存
  clearGlobalCache(): void {
    this.globalTemplatesCache.clear();
    console.log('全局App模板缓存已清除');
  }

  // 获取缓存状态
  getCacheStatus() {
    return {
      globalCacheSize: this.globalTemplatesCache.size,
      workspaceCacheSize: this.workspaceTemplatesCache.size,
      totalCacheSize: this.globalTemplatesCache.size + this.workspaceTemplatesCache.size
    };
  }
}

export const appTemplateService = new AppTemplateService();
