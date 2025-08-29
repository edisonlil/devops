# Harbor Docker Compose 部署模板

这是一个用于在Docker Compose环境中部署Harbor企业级Docker镜像仓库的模板。

## 概述

Harbor是一个开源的企业级Docker镜像仓库，提供了以下主要功能：

- **镜像仓库管理**: 存储和管理Docker镜像
- **用户权限管理**: 基于角色的访问控制(RBAC)
- **项目管理**: 组织和管理镜像项目
- **镜像扫描**: 漏洞扫描和安全检查
- **镜像签名**: 内容信任和镜像签名验证
- **复制策略**: 镜像复制和同步
- **审计日志**: 完整的操作审计记录

## 系统要求

- **Docker**: >= 20.10
- **Docker Compose**: >= 2.0
- **内存**: >= 4GB
- **磁盘空间**: >= 20GB
- **CPU**: >= 2核心

## 快速开始

### 1. 基础部署

```bash
# 使用默认配置部署Harbor
devops run middleware harbor-standalone registry --hostname harbor.example.com

# 使用自定义参数部署
devops run middleware harbor-standalone registry \
  --hostname harbor.example.com \
  --harbor-admin-password MyPassword123 \
  --http-port 8080
```

### 2. 交互式部署

```bash
# 交互式配置部署
devops run middleware harbor-standalone registry -i
```

### 3. 配置文件部署

```bash
# 生成配置文件模板
devops middleware config generate harbor-standalone > harbor-config.yaml

# 编辑配置文件后部署
devops run middleware harbor-standalone registry --config harbor-config.yaml
```

## 配置参数

### 基础配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `instance_name` | string | - | 实例名称（必填） |
| `hostname` | string | - | Harbor访问域名或IP（必填） |
| `harbor_version` | string | v2.9.0 | Harbor版本 |
| `http_port` | string | 80 | HTTP访问端口 |
| `https_port` | string | 443 | HTTPS访问端口 |
| `https_enabled` | boolean | false | 是否启用HTTPS |

### 安全配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `harbor_admin_password` | string | auto-generate | Harbor管理员密码 |
| `database_password` | string | auto-generate | PostgreSQL数据库密码 |
| `self_registration` | boolean | true | 是否允许用户自注册 |
| `verify_remote_cert` | boolean | true | 是否验证远程证书 |

### 存储配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `data_path` | string | ./harbor-data | 数据存储路径 |
| `quota_per_project_enable` | boolean | true | 是否启用项目配额限制 |
| `storage_per_project` | string | -1 | 每个项目存储配额 |

### 高级配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `log_level` | string | info | 日志级别 |
| `max_job_workers` | integer | 10 | 最大作业工作线程数 |
| `token_expiration` | integer | 30 | Token过期时间（分钟） |
| `robot_token_duration` | integer | 30 | 机器人账户Token有效期（天） |

## 部署后操作

### 1. 访问Harbor Web界面

```bash
# 浏览器访问
http://your-hostname:port

# 默认管理员账户
用户名: admin
密码: 在部署时设置的密码
```

### 2. Docker客户端登录

```bash
# 登录Harbor
docker login your-hostname:port

# 推送镜像
docker tag your-image your-hostname:port/project/image:tag
docker push your-hostname:port/project/image:tag

# 拉取镜像
docker pull your-hostname:port/project/image:tag
```

### 3. 管理命令

```bash
# 查看状态
devops middleware status registry

# 查看日志
devops middleware logs registry --follow

# 备份数据
devops middleware backup registry

# 停止服务
devops middleware remove registry
```

## 目录结构

部署后会创建以下目录结构：

```
harbor-deployment/
├── docker-compose.yml          # Docker Compose配置文件
├── harbor.yml                  # Harbor主配置文件
├── prepare.sh                  # 环境准备脚本
├── common/                     # 公共配置目录
│   └── config/                 # 各服务配置文件
│       ├── core/
│       ├── db/
│       ├── jobservice/
│       ├── nginx/
│       └── ...
└── harbor-data/               # 数据存储目录
    ├── database/              # PostgreSQL数据
    ├── registry/              # 镜像存储
    ├── redis/                 # Redis数据
    └── ...
```

## 故障排除

### 1. 端口冲突

如果默认端口被占用，可以修改端口配置：

```bash
devops run middleware harbor-standalone registry \
  --hostname harbor.example.com \
  --http-port 8080 \
  --https-port 8443
```

### 2. 内存不足

Harbor需要至少4GB内存，如果内存不足可能导致服务启动失败。

### 3. 磁盘空间不足

确保有足够的磁盘空间存储镜像数据，建议至少20GB。

### 4. 网络问题

确保防火墙允许Harbor端口的访问。

## 安全建议

1. **修改默认密码**: 部署后立即修改admin用户密码
2. **启用HTTPS**: 生产环境建议启用HTTPS
3. **定期备份**: 定期备份Harbor数据
4. **更新版本**: 及时更新到最新版本
5. **访问控制**: 配置适当的网络访问控制

## 高级功能

### 1. LDAP集成

在harbor.yml中配置LDAP认证：

```yaml
auth_mode: ldap_auth
ldap:
  url: ldaps://ldap.example.com
  searchdn: uid=searchuser,ou=people,dc=example,dc=com
  # ... 其他LDAP配置
```

### 2. 邮件通知

配置SMTP服务器用于邮件通知：

```yaml
email:
  host: smtp.example.com
  port: 587
  username: harbor@example.com
  password: your-password
  ssl: true
```

### 3. 镜像复制

配置镜像复制策略实现多Harbor实例间的镜像同步。

## 支持

如有问题，请查看：

1. Harbor官方文档: https://goharbor.io/docs/
2. 项目Issue页面
3. 联系运维团队
