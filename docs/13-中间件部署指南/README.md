# 13-中间件部署指南

## 概述

DevOps中间件部署功能提供开箱即用的数据库、缓存、消息队列等基础设施服务部署能力。通过模板驱动的方式，用户可以快速部署和管理各种中间件服务。

## 环境要求

### Python版本要求
- **Python 3.6+**: 支持基本功能
- **Python 3.7+**: 推荐版本，支持所有功能

### 依赖包安装
```bash
# 对于Python 3.6
pip3 install "PyYAML>=5.1,<7.0" "Jinja2>=2.10,<3.1"

# 对于Python 3.7+
pip3 install "PyYAML>=5.4.1" "Jinja2>=2.11.0"

# 或者使用用户模式安装
pip3 install --user PyYAML Jinja2
```

## 📚 文档目录

- [01-交互式部署升级](01-交互式部署升级.md) - 中间件交互式部署功能升级说明
- [02-实现总结](02-实现总结.md) - 交互式部署功能实现总结和技术细节
- [03-模板后缀名规范](03-模板后缀名规范.md) - 模板文件后缀名规范和类型识别
- [04-模板管理](04-模板管理.md) - 中间件模板管理和自定义（待完善）
- [05-部署示例](05-部署示例.md) - 各种中间件的部署示例（待完善）

## 核心特性

- **模板驱动**: 基于YAML模板的声明式部署
- **多平台支持**: 支持Kubernetes、Docker Swarm、Docker Compose
- **统一管理**: 提供统一的管理命令接口
- **自动配置**: 智能生成配置文件和连接信息
- **生命周期管理**: 支持部署、扩缩容、备份、删除等操作

## 支持的中间件类型

### 缓存服务
- `redis-standalone`: Redis单实例部署
- `redis-cluster`: Redis集群部署
- `redis-sentinel`: Redis哨兵模式

### 数据库服务
- `mysql-standalone`: MySQL单实例部署
- `mysql-ha`: MySQL高可用部署（主从）
- `postgresql-standalone`: PostgreSQL单实例
- `postgresql-ha`: PostgreSQL高可用

### 消息队列
- `kafka-standalone`: Kafka单节点
- `kafka-cluster`: Kafka集群
- `rabbitmq-standalone`: RabbitMQ单实例
- `rabbitmq-cluster`: RabbitMQ集群

### 搜索引擎
- `elasticsearch-standalone`: Elasticsearch单节点
- `elasticsearch-cluster`: Elasticsearch集群

### 文档数据库
- `mongodb-standalone`: MongoDB单实例
- `mongodb-replicaset`: MongoDB副本集

### 对象存储
- `minio-standalone`: MinIO单实例
- `minio-distributed`: MinIO分布式

## 快速开始

### 1. 部署Redis缓存服务

```bash
# 交互式部署（推荐）
devops run middleware redis-standalone cache-server -i

# 命令行部署
devops run middleware redis-standalone cache-server \
  --memory-limit 2Gi \
  --storage-size 5Gi \
  --redis-password mypassword
```

### 2. 部署MySQL数据库

```bash
# 交互式部署
devops run middleware mysql-standalone main-db -i

# 命令行部署
devops run middleware mysql-standalone main-db \
  --memory-limit 4Gi \
  --storage-size 100Gi \
  --mysql-database app_db \
  --mysql-user app_user
```

### 3. 部署Redis集群

```bash
# 部署6节点Redis集群
devops run middleware redis-cluster cache-cluster \
  --replicas 6 \
  --memory-limit 2Gi \
  --storage-size 10Gi
```

## 命令参考

### 部署命令

```bash
devops run middleware <template-name> <instance-name> [OPTIONS]
```

**通用参数:**
- `--memory-limit SIZE`: 内存限制 (如: 2Gi, 512Mi)
- `--storage-size SIZE`: 存储大小 (如: 10Gi, 100Gi)
- `--replicas COUNT`: 副本数量
- `--service-port PORT`: 服务端口
- `--export-port PORT`: 外部访问端口 (NodePort)
- `--namespace NAMESPACE`: Kubernetes命名空间
- `--workspace WORKSPACE`: 工作空间
- `-i, --interactive`: 交互式配置模式
- `--dry-run`: 预览配置，不执行部署

**Redis特定参数:**
- `--redis-password PASSWORD`: Redis访问密码
- `--redis-persistence TYPE`: 持久化类型 (rdb|aof|both|none)
- `--max-memory-policy POLICY`: 内存淘汰策略

**MySQL特定参数:**
- `--mysql-root-password PASSWORD`: root密码
- `--mysql-database DBNAME`: 初始数据库名
- `--mysql-user USERNAME`: 应用用户名
- `--mysql-password PASSWORD`: 应用用户密码
- `--mysql-charset CHARSET`: 字符集 (utf8mb4|utf8|latin1)

### 管理命令

```bash
# 列出已部署的中间件
devops middleware list [--workspace WORKSPACE] [--format FORMAT]

# 查看中间件状态
devops middleware status <instance-name> [--detailed] [--watch]

# 查看中间件日志
devops middleware logs <instance-name> [--follow] [--lines COUNT]

# 删除中间件
devops middleware remove <instance-name> [--force] [--keep-data]

# 扩缩容中间件
devops middleware scale <instance-name> --replicas COUNT [--wait]

# 备份中间件数据
devops middleware backup <instance-name> [--output-path PATH]

# 恢复中间件数据
devops middleware restore <instance-name> --from PATH

# 查看连接信息
devops middleware info <instance-name> [--show-password]
```

### 模板管理

```bash
# 列出可用模板
devops middleware templates list [--platform PLATFORM] [--type TYPE]

# 查看模板详情
devops middleware templates show <template-name>

# 验证模板
devops middleware templates validate <template-name>

# 复制模板到工作空间
devops middleware templates copy <template-name> --workspace <name>
```

## 使用示例

### 示例1: 开发环境Redis缓存

```bash
# 部署开发环境Redis
devops run middleware redis-standalone dev-cache \
  --memory-limit 512Mi \
  --storage-size 1Gi \
  --namespace development

# 查看连接信息
devops middleware info dev-cache

# 查看状态
devops middleware status dev-cache
```

### 示例2: 生产环境MySQL数据库

```bash
# 部署生产环境MySQL
devops run middleware mysql-standalone prod-db \
  --memory-limit 8Gi \
  --storage-size 500Gi \
  --mysql-database app_production \
  --mysql-user app_user \
  --backup-enabled true \
  --namespace production

# 备份数据
devops middleware backup prod-db --output-path /backup/mysql

# 查看日志
devops middleware logs prod-db --follow
```

### 示例3: Redis集群部署

```bash
# 部署Redis集群
devops run middleware redis-cluster session-cluster \
  --replicas 6 \
  --memory-limit 2Gi \
  --storage-size 20Gi \
  --namespace middleware

# 扩容到8个节点
devops middleware scale session-cluster --replicas 8 --wait

# 查看集群状态
kubectl exec -it session-cluster-0 -- redis-cli cluster nodes
```

## 配置文件模式

### 生成配置文件模板

```bash
# 生成Redis配置文件模板
devops middleware config generate redis-standalone > redis-config.yaml

# 编辑配置文件
vim redis-config.yaml

# 使用配置文件部署
devops run middleware redis-standalone cache-server --config redis-config.yaml
```

### 配置文件示例

```yaml
# redis-config.yaml
instance_name: "my-redis"
memory_limit: "2Gi"
storage_size: "5Gi"
replicas: 1
backup_enabled: true
service_port: "6379"
export_port: "30379"

# Redis特定配置
redis_password: "mypassword123"
redis_persistence: "aof"
max_memory_policy: "allkeys-lru"
```

## 连接信息

部署完成后，系统会自动显示连接信息：

### Kubernetes环境
```
📋 连接信息：
- 内部访问: cache-server.default.svc.cluster.local:6379
- 外部访问端口: 30379
- 密码: 存储在 secret 'cache-server-redis-auth'

🔧 管理命令：
- 查看状态: devops middleware status cache-server
- 查看日志: devops middleware logs cache-server
- 删除服务: devops middleware remove cache-server
```

### 应用配置示例

**Spring Boot应用配置:**
```properties
# Redis配置
spring.redis.host=cache-server.default.svc.cluster.local
spring.redis.port=6379
spring.redis.password=${REDIS_PASSWORD}

# MySQL配置
spring.datasource.url=jdbc:mysql://main-db.default.svc.cluster.local:3306/app_db
spring.datasource.username=app_user
spring.datasource.password=${MYSQL_PASSWORD}
```

## 故障排除

### 常见问题

1. **模板不存在**
   ```bash
   # 列出可用模板
   devops middleware templates list
   
   # 检查模板详情
   devops middleware templates show redis-standalone
   ```

2. **部署失败**
   ```bash
   # 查看详细状态
   devops middleware status instance-name --detailed
   
   # 查看日志
   devops middleware logs instance-name
   ```

3. **存储问题**
   ```bash
   # 检查PVC状态
   kubectl get pvc -l app=instance-name
   
   # 检查存储类
   kubectl get storageclass
   ```

4. **网络连接问题**
   ```bash
   # 检查服务状态
   kubectl get svc -l app=instance-name
   
   # 测试连接
   kubectl exec -it test-pod -- telnet service-name port
   ```

## 最佳实践

1. **资源规划**: 根据实际负载合理配置内存和存储
2. **命名规范**: 使用有意义的实例名称
3. **环境隔离**: 使用不同的命名空间隔离环境
4. **备份策略**: 生产环境启用自动备份
5. **监控告警**: 配置监控和告警机制
6. **安全配置**: 设置强密码和访问控制

## 下一步

- [模板系统](../06-模板系统/README.md): 了解如何自定义中间件模板
- [Kubernetes](../08-Kubernetes/README.md): 深入了解Kubernetes部署
- [故障排除](../11-故障排除/README.md): 解决常见问题
