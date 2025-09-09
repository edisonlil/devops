import { WorkspaceConfig, WorkspaceConfigCache } from '../types/application';
import { authService } from './AuthService';
import path from 'path';

/**
 * 工作空间配置缓存服务
 * 提供工作空间配置的缓存机制，减少频繁的远程读取
 */
class WorkspaceConfigService {
  private cache = new Map<string, WorkspaceConfigCache>();
  private readonly DEFAULT_TTL = 300; // 5分钟缓存

  /**
   * 获取工作空间配置（带缓存）
   */
  async getWorkspaceConfig(workspace: string, sessionId: string): Promise<WorkspaceConfig> {
    const cacheKey = `${workspace}:${sessionId}`;
    const cached = this.cache.get(cacheKey);
    
    // 检查缓存是否有效
    if (cached && this.isCacheValid(cached)) {
      console.log(`使用缓存的工作空间配置: ${workspace}`);
      return cached.config;
    }

    // 缓存失效或不存在，重新读取
    console.log(`读取工作空间配置: ${workspace}`);
    const config = await this.loadWorkspaceConfig(workspace, sessionId);
    
    // 更新缓存
    this.updateCache(cacheKey, config);
    
    return config;
  }

  /**
   * 从远程读取工作空间配置
   */
  private async loadWorkspaceConfig(workspace: string, sessionId: string): Promise<WorkspaceConfig> {
    try {
      const configPath = `workspace/${workspace}/config`;
      const command = `cat ${configPath}`;
      
      const result = await authService.executeCommand(sessionId, command);
      
      if (result.exitCode !== 0) {
        console.warn(`工作空间配置文件不存在: ${workspace}, 使用默认配置`);
        return this.getDefaultConfig();
      }

      const config = this.parseConfigContent(result.stdout);
      return config;
    } catch (error) {
      console.error(`读取工作空间配置失败: ${workspace}`, error);
      return this.getDefaultConfig();
    }
  }

  /**
   * 解析配置文件内容
   */
  private parseConfigContent(content: string): WorkspaceConfig {
    const config: WorkspaceConfig = {
      BUILD_PLATFORM: 'KUBERNETES' // 默认值
    };

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // 移除引号
        config[key.trim()] = value.trim();
      }
    }

    // 确保 BUILD_PLATFORM 是有效值
    if (!['KUBERNETES', 'DOCKER_SWARM', 'DOCKER_COMPOSE'].includes(config.BUILD_PLATFORM)) {
      config.BUILD_PLATFORM = 'KUBERNETES';
    }

    return config;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): WorkspaceConfig {
    return {
      BUILD_PLATFORM: 'KUBERNETES',
      BUILD_K8S_NAMESPACE: 'default'
    };
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(cached: WorkspaceConfigCache): boolean {
    const now = new Date();
    const expireTime = new Date(cached.lastUpdated.getTime() + cached.ttl * 1000);
    return now < expireTime;
  }

  /**
   * 更新缓存
   */
  private updateCache(cacheKey: string, config: WorkspaceConfig): void {
    this.cache.set(cacheKey, {
      config,
      lastUpdated: new Date(),
      ttl: this.DEFAULT_TTL
    });
  }

  /**
   * 清除指定工作空间的缓存
   */
  clearCache(workspace: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(`${workspace}:`));
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`清除工作空间缓存: ${workspace}`);
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    this.cache.clear();
    console.log('清除所有工作空间配置缓存');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { total: number; valid: number; expired: number } {
    const total = this.cache.size;
    let valid = 0;
    let expired = 0;

    for (const cached of this.cache.values()) {
      if (this.isCacheValid(cached)) {
        valid++;
      } else {
        expired++;
      }
    }

    return { total, valid, expired };
  }

  /**
   * 更新工作空间配置并刷新缓存
   */
  async updateWorkspaceConfig(workspace: string, sessionId: string, configUpdates: Partial<WorkspaceConfig>): Promise<WorkspaceConfig> {
    try {
      // 先获取当前配置
      const currentConfig = await this.getWorkspaceConfig(workspace, sessionId);

      // 合并更新
      const newConfig = { ...currentConfig, ...configUpdates };

      // 生成配置文件内容
      const configContent = this.generateConfigContent(newConfig);

      // 写入配置文件
      const configPath = `workspace/${workspace}/config`;
      const writeCommand = `cat > ${configPath} << 'EOF'\n${configContent}\nEOF`;

      const result = await authService.executeCommand(sessionId, writeCommand);

      if (result.exitCode !== 0) {
        throw new Error(`写入配置文件失败: ${result.stderr}`);
      }

      // 清除缓存，强制下次重新读取
      this.clearCache(workspace);

      console.log(`工作空间配置已更新: ${workspace}`);
      return newConfig;
    } catch (error) {
      console.error(`更新工作空间配置失败: ${workspace}`, error);
      throw error;
    }
  }

  /**
   * 生成配置文件内容
   */
  private generateConfigContent(config: WorkspaceConfig): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined && value !== null) {
        lines.push(`${key}="${value}"`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 监听配置文件变化并失效缓存
   */
  async watchConfigChanges(workspace: string, sessionId: string): Promise<void> {
    // 这里可以实现文件监听逻辑
    // 当检测到配置文件变化时，自动清除缓存
    console.log(`开始监听工作空间配置变化: ${workspace}`);
  }

  /**
   * 批量更新多个工作空间配置
   */
  async batchUpdateConfigs(updates: Array<{ workspace: string; config: Partial<WorkspaceConfig> }>, sessionId: string): Promise<void> {
    const promises = updates.map(({ workspace, config }) =>
      this.updateWorkspaceConfig(workspace, sessionId, config).catch(error => {
        console.error(`批量更新失败: ${workspace}`, error);
      })
    );

    await Promise.all(promises);
    console.log('批量配置更新完成');
  }

  /**
   * 预热缓存
   */
  async warmupCache(workspaces: string[], sessionId: string): Promise<void> {
    console.log(`预热工作空间配置缓存: ${workspaces.join(', ')}`);

    const promises = workspaces.map(workspace =>
      this.getWorkspaceConfig(workspace, sessionId).catch(error => {
        console.error(`预热缓存失败: ${workspace}`, error);
      })
    );

    await Promise.all(promises);
    console.log('工作空间配置缓存预热完成');
  }
}

export const workspaceConfigService = new WorkspaceConfigService();
