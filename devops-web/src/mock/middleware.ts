import type { MiddlewareInstance, MiddlewareStats } from '@/types/middleware'

// 模拟中间件实例数据 - 基于实际 DevOps 中间件类型
export const mockMiddlewareInstances: MiddlewareInstance[] = [
  {
    name: 'redis-cache-01',
    template: 'redis-standalone',
    workspace: 'default',
    namespace: 'middleware',
    status: 'running',
    resources: {
      cpu: {
        request: '500m',
        limit: '1000m',
        usage: 0.45
      },
      memory: {
        request: '1Gi',
        limit: '2Gi',
        usage: 0.62
      },
      storage: {
        size: '10Gi',
        used: 0.35
      }
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:22:00Z',
    lastActivity: '2024-01-20T16:45:00Z',
    connectionInfo: {
      internal: 'redis-cache-01.middleware.svc.cluster.local:6379',
      external: 'redis-cache-01.example.com:6379',
      port: 6379
    },
    ports: [
      {
        name: 'redis',
        port: 6379,
        targetPort: 6379,
        protocol: 'TCP'
      }
    ],
    monthlyCost: 45.60,
    config: {
      maxmemory: '1gb',
      maxmemory_policy: 'allkeys-lru',
      save: '900 1 300 10 60 10000'
    },
    health: {
      status: 'healthy',
      message: 'Redis is running normally',
      lastCheck: '2024-01-20T16:45:00Z'
    },
    backups: {
      enabled: true,
      lastBackup: '2024-01-20T02:00:00Z',
      schedule: '0 2 * * *'
    },
    supportedOperations: {
      scale: false,
      backup: true,
      restart: true,
      update: true
    }
  },
  {
    name: 'mysql-primary',
    template: 'mysql-ha',
    workspace: 'default',
    namespace: 'middleware',
    status: 'running',
    resources: {
      cpu: {
        request: '1000m',
        limit: '2000m',
        usage: 0.68
      },
      memory: {
        request: '2Gi',
        limit: '4Gi',
        usage: 0.75
      },
      storage: {
        size: '50Gi',
        used: 0.42
      }
    },
    createdAt: '2024-01-10T09:15:00Z',
    updatedAt: '2024-01-18T11:30:00Z',
    lastActivity: '2024-01-20T16:40:00Z',
    connectionInfo: {
      internal: 'mysql-primary.middleware.svc.cluster.local:3306',
      port: 3306,
      username: 'root',
      database: 'mysql'
    },
    ports: [
      {
        name: 'mysql',
        port: 3306,
        targetPort: 3306,
        protocol: 'TCP'
      }
    ],
    replicas: 3,
    monthlyCost: 128.50,
    config: {
      innodb_buffer_pool_size: '2G',
      max_connections: 200,
      binlog_format: 'ROW'
    },
    health: {
      status: 'healthy',
      message: 'MySQL cluster is healthy',
      lastCheck: '2024-01-20T16:40:00Z'
    },
    backups: {
      enabled: true,
      lastBackup: '2024-01-20T01:00:00Z',
      schedule: '0 1 * * *'
    },
    supportedOperations: {
      scale: true,
      backup: true,
      restart: true,
      update: true
    }
  },
  {
    name: 'elasticsearch-search',
    template: 'elasticsearch-cluster',
    workspace: 'default',
    namespace: 'middleware',
    status: 'running',
    resources: {
      cpu: {
        request: '2000m',
        limit: '4000m',
        usage: 0.55
      },
      memory: {
        request: '4Gi',
        limit: '8Gi',
        usage: 0.72
      },
      storage: {
        size: '100Gi',
        used: 0.28
      }
    },
    createdAt: '2024-01-12T14:20:00Z',
    updatedAt: '2024-01-19T09:45:00Z',
    lastActivity: '2024-01-20T16:35:00Z',
    connectionInfo: {
      internal: 'elasticsearch-search.middleware.svc.cluster.local:9200',
      port: 9200
    },
    ports: [
      {
        name: 'http',
        port: 9200,
        targetPort: 9200,
        protocol: 'TCP'
      },
      {
        name: 'transport',
        port: 9300,
        targetPort: 9300,
        protocol: 'TCP'
      }
    ],
    replicas: 3,
    monthlyCost: 256.80,
    config: {
      'cluster.name': 'elasticsearch-search',
      'discovery.type': 'zen',
      'xpack.security.enabled': false
    },
    health: {
      status: 'healthy',
      message: 'Elasticsearch cluster is green',
      lastCheck: '2024-01-20T16:35:00Z'
    },
    backups: {
      enabled: true,
      lastBackup: '2024-01-19T23:00:00Z',
      schedule: '0 23 * * *'
    },
    supportedOperations: {
      scale: true,
      backup: true,
      restart: true,
      update: true
    }
  },
  {
    name: 'kafka-message-queue',
    template: 'kafka-cluster',
    workspace: 'default',
    namespace: 'middleware',
    status: 'error',
    resources: {
      cpu: {
        request: '1500m',
        limit: '3000m',
        usage: 0.85
      },
      memory: {
        request: '3Gi',
        limit: '6Gi',
        usage: 0.92
      },
      storage: {
        size: '80Gi',
        used: 0.65
      }
    },
    createdAt: '2024-01-08T16:45:00Z',
    updatedAt: '2024-01-20T15:20:00Z',
    lastActivity: '2024-01-20T15:20:00Z',
    connectionInfo: {
      internal: 'kafka-message-queue.middleware.svc.cluster.local:9092',
      port: 9092
    },
    ports: [
      {
        name: 'kafka',
        port: 9092,
        targetPort: 9092,
        protocol: 'TCP'
      }
    ],
    replicas: 3,
    monthlyCost: 189.20,
    config: {
      'num.network.threads': 8,
      'num.io.threads': 8,
      'log.retention.hours': 168
    },
    health: {
      status: 'unhealthy',
      message: 'One broker is down',
      lastCheck: '2024-01-20T15:20:00Z'
    },
    backups: {
      enabled: false
    },
    supportedOperations: {
      scale: true,
      backup: false,
      restart: true,
      update: true
    }
  },
  {
    name: 'mongodb-document',
    template: 'mongodb-replicaset',
    workspace: 'default',
    namespace: 'middleware',
    status: 'pending',
    resources: {
      cpu: {
        request: '1000m',
        limit: '2000m',
        usage: 0.0
      },
      memory: {
        request: '2Gi',
        limit: '4Gi',
        usage: 0.0
      },
      storage: {
        size: '60Gi',
        used: 0.0
      }
    },
    createdAt: '2024-01-20T16:00:00Z',
    lastActivity: '2024-01-20T16:00:00Z',
    connectionInfo: {
      internal: 'mongodb-document.middleware.svc.cluster.local:27017',
      port: 27017,
      username: 'admin',
      database: 'admin'
    },
    ports: [
      {
        name: 'mongodb',
        port: 27017,
        targetPort: 27017,
        protocol: 'TCP'
      }
    ],
    replicas: 3,
    monthlyCost: 95.40,
    config: {
      replication: {
        replSetName: 'rs0'
      },
      storage: {
        wiredTiger: {
          engineConfig: {
            cacheSizeGB: 1
          }
        }
      }
    },
    health: {
      status: 'unknown',
      message: 'Starting up...',
      lastCheck: '2024-01-20T16:00:00Z'
    },
    backups: {
      enabled: true,
      schedule: '0 3 * * *'
    },
    supportedOperations: {
      scale: true,
      backup: true,
      restart: true,
      update: true
    }
  }
]

// 模拟统计数据
export const mockMiddlewareStats: MiddlewareStats = {
  total: 5,
  running: 3,
  error: 1,
  pending: 1,
  totalCost: 715.50,
  byType: {
    'redis-standalone': 1,
    'mysql-ha': 1,
    'elasticsearch-cluster': 1,
    'kafka-cluster': 1,
    'mongodb-replicaset': 1
  },
  byStatus: {
    'running': 3,
    'error': 1,
    'pending': 1,
    'stopped': 0
  }
}
