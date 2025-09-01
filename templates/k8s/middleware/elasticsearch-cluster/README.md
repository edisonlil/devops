# Elasticsearch集群部署模板

## 概述

这是一个用于在Kubernetes集群中部署Elasticsearch集群的模板。该模板支持高可用部署，包含主节点和数据节点的角色分离。

## 特性

- **集群部署**: 支持多节点Elasticsearch集群
- **角色分离**: 自动区分主节点和数据节点
- **持久化存储**: 使用StatefulSet确保数据持久化
- **资源管理**: 可配置CPU和内存资源限制
- **版本兼容**: 自动适配Elasticsearch 6.x和7.x版本
- **插件支持**: 根据版本自动安装相应插件
- **安全配置**: 包含JVM安全策略配置

## 模板变量

| 变量名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `instance_name` | string | - | 实例名称（必需） |
| `namespace` | string | default | Kubernetes命名空间 |
| `memory_limit` | string | 2Gi | 每个节点内存限制 |
| `memory_request` | string | 1Gi | 每个节点内存请求 |
| `cpu_limit` | string | 1000m | 每个节点CPU限制 |
| `cpu_request` | string | 500m | 每个节点CPU请求 |
| `storage_size` | string | 10Gi | 每个节点存储大小 |
| `replicas` | integer | 3 | 集群节点数量 |
| `elasticsearch_version` | string | 7.10.0 | Elasticsearch版本（支持6.x和7.x） |
| `cluster_name` | string | elastic-cluster | 集群名称 |
| `jvm_heap_size` | string | 1g | JVM堆内存大小 |
| `node_port` | string | - | 外部访问端口（可选） |
| `storage_class` | string | nfs-cbk8s | 存储类名称 |

## 使用方法

### 基本部署

```bash
devops run middleware elasticsearch-cluster elasticsearch
```

### 自定义参数部署

```bash
# 部署7.x版本
devops run middleware elasticsearch-cluster elasticsearch \
  --memory-limit 4Gi \
  --storage-size 50Gi \
  --replicas 3 \
  --elasticsearch-version 7.10.0 \
  --node-port 30002

# 部署6.x版本
devops run middleware elasticsearch-cluster elasticsearch \
  --memory-limit 4Gi \
  --storage-size 50Gi \
  --replicas 3 \
  --elasticsearch-version 6.8.6 \
  --node-port 30003
```

### 交互式部署

```bash
devops run middleware elasticsearch-cluster elasticsearch -i
```

## 集群架构

该模板创建的Elasticsearch集群具有以下特点：

1. **主节点**: 第一个节点（elasticsearch-0）作为主节点
2. **数据节点**: 其余节点作为数据节点
3. **服务发现**: 使用Headless Service进行节点间通信
4. **外部访问**: 通过NodePort Service提供外部访问

## 连接信息

### 内部访问
```
elasticsearch.<namespace>.svc.cluster.local:9200
```

### 外部访问（如果配置了node_port）
```
<node-ip>:<node_port>
```

## 管理命令

### 查看集群状态
```bash
devops middleware status elasticsearch
```

### 查看日志
```bash
devops middleware logs elasticsearch --follow
```

### 扩展集群
```bash
devops middleware scale elasticsearch --replicas 5
```

### 检查集群健康状态
```bash
curl -X GET 'elasticsearch.default.svc.cluster.local:9200/_cluster/health?pretty'
```

### 查看索引
```bash
curl -X GET 'elasticsearch.default.svc.cluster.local:9200/_cat/indices?v'
```

## 版本兼容性

该模板支持Elasticsearch 6.x和7.x版本，主要差异如下：

### 6.x版本特性
- 使用 `discovery.zen.ping.unicast.hosts` 进行服务发现
- 使用 `discovery.zen.minimum_master_nodes` 配置主节点选举
- 包含JVM安全策略配置
- 自动安装ICU分词器插件

### 7.x版本特性
- 使用 `discovery.seed_hosts` 进行服务发现
- 使用 `cluster.initial_master_nodes` 配置主节点选举
- 简化JVM配置
- 不自动安装插件（可根据需要手动安装）

### 版本选择建议
- **生产环境**: 推荐使用7.10.0或更高版本
- **兼容性要求**: 如果现有系统使用6.x，可选择6.8.6
- **新项目**: 建议直接使用7.x版本

## 注意事项

1. **存储要求**: 确保集群中有可用的存储类
2. **资源限制**: 根据实际需求调整CPU和内存配置
3. **版本兼容性**: 注意Elasticsearch版本与插件的兼容性
4. **网络策略**: 确保节点间通信端口（9300）可访问
5. **安全配置**: 生产环境建议启用X-Pack安全功能
6. **版本升级**: 不同大版本间升级需要遵循官方升级指南

## 故障排除

### 常见问题

1. **节点无法加入集群**
   - 检查网络连接
   - 验证discovery.zen.ping.unicast.hosts配置

2. **存储问题**
   - 确认存储类可用
   - 检查PVC状态

3. **资源不足**
   - 调整CPU和内存配置
   - 检查节点资源使用情况

### 日志查看

```bash
# 查看特定节点的日志
kubectl logs -f elasticsearch-0 -n <namespace>

# 查看所有节点的日志
kubectl logs -f -l app=elasticsearch -n <namespace>
```

## 升级说明

升级Elasticsearch版本时，建议：

1. 先备份数据
2. 逐个升级节点
3. 验证集群健康状态
4. 更新客户端连接配置

## 相关文档

- [Elasticsearch官方文档](https://www.elastic.co/guide/index.html)
- [Kubernetes StatefulSet文档](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [DevOps工具文档](../README.md)
