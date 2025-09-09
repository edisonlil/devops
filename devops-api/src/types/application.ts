// 应用管理相关类型定义

export type DeploymentPlatform = 'KUBERNETES' | 'DOCKER_SWARM' | 'DOCKER_COMPOSE';

export type ApplicationStatus = 'running' | 'stopped' | 'error' | 'pending' | 'unknown';

export interface ApplicationPort {
  name?: string;
  port: number;
  targetPort?: number;
  nodePort?: number;
  protocol?: 'TCP' | 'UDP';
}

export interface ApplicationReplicas {
  desired: number;
  ready: number;
  available: number;
}

export interface ApplicationResources {
  cpu?: string;
  memory?: string;
  limits?: {
    cpu?: string;
    memory?: string;
  };
}

// 统一的应用实例数据模型
export interface ApplicationInstance {
  // 基本信息
  name: string;
  namespace?: string;
  workspace: string;
  platform: DeploymentPlatform;
  
  // 状态信息
  status: ApplicationStatus;
  replicas?: ApplicationReplicas;
  
  // 资源信息
  image?: string;
  version?: string;
  ports?: ApplicationPort[];
  
  // 环境和配置
  environment?: Record<string, string>;
  resources?: ApplicationResources;
  
  // 时间信息
  createdAt?: Date;
  updatedAt?: Date;
  
  // 原始文件信息
  deploymentFile: string;
  rawConfig?: any;
  
  // 平台特定信息
  platformSpecific?: {
    namespace?: string;      // K8s only
    stackName?: string;      // Swarm only
    composeProject?: string; // Compose only
  };

  // 扩展信息
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

// 部署文件解析适配器接口
export interface DeploymentAdapter {
  // 检查是否支持该文件
  canHandle(filePath: string, content: string): boolean;
  
  // 解析部署文件
  parseDeploymentFile(filePath: string, content: string, workspace: string): Promise<ApplicationInstance>;
  
  // 获取应用实时状态
  getApplicationStatus(instance: ApplicationInstance): Promise<ApplicationStatus>;
  
  // 获取应用详细信息
  getApplicationDetails(instance: ApplicationInstance): Promise<Partial<ApplicationInstance>>;
}

// 部署文件信息
export interface DeploymentFileInfo {
  filePath: string;
  fileName: string;
  content: string;
  platform: DeploymentPlatform;
  lastModified: Date;
}

// 应用操作结果
export interface ApplicationOperationResult {
  success: boolean;
  message: string;
  data?: any;
}

// 应用列表查询参数
export interface ApplicationListQuery {
  workspace?: string;
  platform?: DeploymentPlatform;
  status?: ApplicationStatus;
  namespace?: string;
  page?: number;
  size?: number;
}

// 应用列表响应
export interface ApplicationListResponse {
  applications: ApplicationInstance[];
  total: number;
  page: number;
  size: number;
}

// 工作空间配置
export interface WorkspaceConfig {
  BUILD_PLATFORM: DeploymentPlatform;
  BUILD_K8S_NAMESPACE?: string;
  BUILD_DOCKER_NETWORK?: string;
  [key: string]: any;
}

// 工作空间配置缓存项
export interface WorkspaceConfigCache {
  config: WorkspaceConfig;
  lastUpdated: Date;
  ttl: number; // 缓存时间（秒）
}

// 平台处理器接口
export interface PlatformHandler {
  parseApplications(deployDir: string, config: WorkspaceConfig, sessionId?: string): Promise<ApplicationInstance[]>;
  getApplicationStatus(nameOrApp: string | ApplicationInstance, config: WorkspaceConfig, sessionId: string): Promise<Partial<ApplicationInstance>>;
  executeOperation(name: string, operation: string, params?: any, config?: WorkspaceConfig, sessionId?: string): Promise<boolean>;
}

// 应用操作类型
export type ApplicationOperation = 'start' | 'stop' | 'restart' | 'scale' | 'logs' | 'redeploy';

// 操作参数
export interface OperationParams {
  replicas?: number;
  lines?: number; // for logs
  follow?: boolean; // for logs
}
