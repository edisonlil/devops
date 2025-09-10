# DevOps Deploy 目录结构迁移指南

## 📁 新的目录结构

为了更好地组织部署文件，我们将 deploy 目录调整为以下结构：

### 🎯 调整前
```bash
workspace/{工作空间}/deploy/
├── admin.yml           # 应用部署文件
├── authorization.yml   # 应用部署文件
├── crm.yml            # 应用部署文件
├── redis.yml          # 中间件部署文件
└── mysql.yml          # 中间件部署文件
```

### ✨ 调整后
```bash
workspace/{工作空间}/deploy/
├── app/                # 应用部署目录
│   ├── admin.yml
│   ├── authorization.yml
│   ├── crm.yml
│   └── frontend.yml
└── middleware/         # 中间件部署目录
    ├── redis.yml
    ├── mysql.yml
    ├── harbor.yml
    └── nginx.yml
```

## 🔧 代码修改说明

### 1. 应用部署文件路径
- **修改位置**: `bin/build.sh` 中的 `render_template` 函数
- **新路径**: `${cfg_deploy_gen_location}/app/${cmd_job_name}.yml`
- **影响命令**: `devops run java|vue|go|nginx|tomcat|python`

### 2. 中间件部署文件路径
- **修改位置**: `bin/build.sh` 中的 `render_middleware_template` 函数
- **新路径**: `${cfg_deploy_gen_location}/middleware/${cmd_job_name}.yml`
- **影响命令**: `devops run middleware`

### 3. 部署路径自动识别
- **新增函数**: `get_deploy_file_path()`
- **功能**: 根据命令类型自动选择正确的子目录
- **逻辑**: 
  - `cmd_2 == "middleware"` → `middleware/` 目录
  - 其他 → `app/` 目录

## 🚀 迁移步骤

### 1. 自动迁移（推荐）
使用提供的迁移脚本：

```bash
# 在 DevOps 根目录执行
./bin/migrate_deploy_structure.sh
```

脚本功能：
- ✅ 自动识别中间件和应用文件
- ✅ 创建 `app/` 和 `middleware/` 子目录
- ✅ 移动文件到正确位置
- ✅ 提供详细的迁移报告

### 2. 手动迁移
如果需要手动迁移：

```bash
cd workspace/{工作空间}/deploy/

# 创建子目录
mkdir -p app middleware

# 移动应用文件
mv admin.yml authorization.yml crm.yml frontend.yml app/

# 移动中间件文件
mv redis.yml mysql.yml harbor.yml nginx.yml middleware/
```

## 🎯 文件识别规则

### 中间件文件识别
脚本使用以下规则识别中间件文件：

1. **文件名模式匹配**：
   - `redis`, `mysql`, `postgres`, `mongodb`
   - `nginx`, `harbor`, `elasticsearch`, `kibana`
   - `kafka`, `zookeeper`, `rabbitmq`, `memcached`
   - `consul`, `etcd`, `prometheus`, `grafana`
   - `jaeger`, `zipkin`, `nacos`, `sentinel`

2. **Kubernetes 资源类型**：
   - `kind: StatefulSet`
   - `kind: DaemonSet`

3. **镜像名称检查**：
   - 包含中间件相关镜像名的文件

### 应用文件识别
不符合中间件识别规则的文件默认为应用文件。

## 📋 验证迁移结果

迁移完成后，验证目录结构：

```bash
# 检查目录结构
find workspace/*/deploy -type f -name "*.yml" | head -20

# 预期输出示例：
# workspace/default/deploy/app/my-app.yml
# workspace/default/deploy/middleware/redis.yml
# workspace/wukong-crm/deploy/app/admin.yml
# workspace/wukong-crm/deploy/middleware/mysql.yml
```

## ⚠️ 注意事项

1. **备份重要数据**：
   - 迁移前建议备份整个 `workspace` 目录

2. **检查自定义脚本**：
   - 如果有自定义脚本引用了旧的文件路径，需要更新

3. **CI/CD 流水线**：
   - 更新可能引用部署文件路径的 CI/CD 配置

4. **文档更新**：
   - 更新相关文档中的路径引用

## 🔄 回滚方案

如果需要回滚到旧结构：

```bash
cd workspace/{工作空间}/deploy/

# 移动所有文件回根目录
mv app/* ./
mv middleware/* ./

# 删除子目录
rmdir app middleware
```

## 📞 支持

如果在迁移过程中遇到问题：

1. 检查迁移脚本的输出日志
2. 验证文件权限和目录结构
3. 确认没有文件丢失或损坏
4. 必要时使用备份进行恢复

---

**迁移完成后，新的 devops 命令将自动使用新的目录结构！** 🎉
