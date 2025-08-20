# DevOps 新架构设计

## 🎯 **核心理念**

**全局模板库 + 工作空间作业配置**

- **全局模板**：统一管理，所有工作空间共享
- **作业配置**：基于模板生成，保存在工作空间内
- **参数化部署**：模板 + 参数 = 具体配置文件

## 🏗️ **目录结构**

```
devops/
├── templates/                    # 全局模板库
│   ├── spring-boot/             # Spring Boot 模板
│   │   ├── meta.json           # 模板元数据
│   │   ├── dockerfile          # Dockerfile 模板
│   │   ├── deploy.yaml         # K8s 部署模板
│   │   └── nginx.conf          # 配置文件模板（可选）
│   └── vue-nginx/              # Vue.js + Nginx 模板
│       ├── meta.json
│       ├── dockerfile
│       ├── deploy.yaml
│       └── nginx.conf
│
├── workspace/                   # 工作空间
│   └── youshen/                # 具体工作空间
│       ├── config              # 工作空间配置
│       └── jobs/               # 作业目录
│           ├── demo-app/       # 具体作业
│           │   ├── job.json    # 作业配置
│           │   ├── dockerfile  # 生成的 Dockerfile
│           │   └── deploy.yaml # 生成的部署文件
│           └── frontend-app/
│               ├── job.json
│               ├── dockerfile
│               ├── deploy.yaml
│               └── nginx.conf
│
├── bin/
│   ├── devops                  # 主命令
│   └── devops_template         # 模板管理命令
│
└── devops-web/                 # Web 管理界面
    ├── backend/                # 后端 API
    └── frontend/               # 前端界面
```

## 🔄 **工作流程**

### 1. 模板管理
```bash
# 列出所有全局模板
devops template list

# 查看模板详情
devops template show spring-boot

# 验证模板
devops template validate spring-boot
```

### 2. 创建作业
```bash
# 基于模板创建作业配置
devops template create spring-boot demo-app --workspace youshen \
    --param module_name=demo-app \
    --param git_url=https://github.com/example/demo.git \
    --param image_path=harbor.com/project/demo-app \
    --param namespace=youshen

# 预览生成的配置（不保存）
devops template create spring-boot demo-app --workspace youshen \
    --param module_name=demo-app \
    --dry-run
```

### 3. 部署作业
```bash
# 部署作业（使用生成的配置文件）
devops run demo-app --workspace youshen

# 查看作业状态
devops status demo-app --workspace youshen
```

## 📋 **模板元数据格式**

每个模板的 `meta.json` 包含：

```json
{
  "id": "spring-boot",
  "name": "Spring Boot 标准部署",
  "description": "适用于 Spring Boot 应用的标准 K8s 部署模板",
  "version": "1.0.0",
  "category": "backend",
  "author": "DevOps Team",
  "icon": "CoffeeCup",
  "iconColor": "#10b981",
  "tags": ["spring-boot", "java", "microservice"],
  "platformTypes": ["KUBERNETES"],
  "scope": "global",
  
  "parameters": [
    {
      "name": "module_name",
      "label": "应用名称",
      "type": "string",
      "required": true,
      "placeholder": "demo-app",
      "description": "应用的名称，用于 K8s 资源命名"
    }
  ],
  
  "buildCommands": [
    "mvn clean package -DskipTests",
    "docker build -t ${image_path} .",
    "docker push ${image_path}"
  ],
  
  "files": [
    {"name": "dockerfile", "description": "Docker 构建文件"},
    {"name": "deploy.yaml", "description": "K8s 部署文件"}
  ]
}
```

## 🔧 **占位符系统**

模板文件中使用 `${parameter_name}` 格式的占位符：

### Dockerfile 示例
```dockerfile
FROM openjdk:11-jre-slim
ENV JAVA_OPTS=${java_opts}
WORKDIR /opt
COPY ./$JAR_NAME /opt/$JAR_NAME
EXPOSE ${app_port}
CMD java $JAVA_OPTS -jar $JAR_NAME
```

### K8s 部署文件示例
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${module_name}
  namespace: ${namespace}
spec:
  replicas: ${replicas}
  template:
    spec:
      containers:
      - name: ${module_name}
        image: ${image_path}
        ports:
        - containerPort: ${app_port}
```

## 🌐 **Web 界面集成**

### 后端 API 更新

1. **模板 API** (`/api/templates`)
   - 从文件系统读取全局模板
   - 支持基于模板创建作业配置
   - `POST /api/templates/:templateId/create-job`

2. **作业 API** (`/api/jobs`)
   - 管理工作空间内的作业配置
   - `GET /api/jobs?workspace=youshen`
   - `GET /api/jobs/:jobName?workspace=youshen`
   - `DELETE /api/jobs/:jobName?workspace=youshen`

### 前端界面更新

1. **模板管理页面**
   - 展示全局模板库
   - 支持选择模板创建作业

2. **作业管理页面**（新增）
   - 展示工作空间内的作业列表
   - 支持查看、编辑、删除作业配置

## 🚀 **部署命令更新**

### 新的 `devops run` 逻辑

```bash
devops run <job-name> --workspace <workspace>
```

1. 读取 `workspace/<workspace>/jobs/<job-name>/job.json`
2. 使用作业目录中的 `dockerfile` 和 `deploy.yaml`
3. 执行构建和部署流程

### 构建流程
1. **Git Clone**: 克隆代码到临时目录
2. **Build**: 执行构建命令（如 `mvn package`）
3. **Docker Build**: 使用生成的 Dockerfile 构建镜像
4. **Docker Push**: 推送镜像到仓库
5. **Deploy**: 使用生成的 deploy.yaml 部署到 K8s

## 📊 **优势对比**

### 旧架构问题
- ❌ 模板分散在各个工作空间
- ❌ 模板重复，维护困难
- ❌ 无法统一管理和更新

### 新架构优势
- ✅ 全局模板库，统一管理
- ✅ 参数化配置，灵活定制
- ✅ 工作空间只保存生成的配置
- ✅ 模板更新自动影响新作业
- ✅ Web 界面友好，操作简单

## 🔄 **迁移计划**

1. **Phase 1**: 创建全局模板库
   - 创建 `templates/` 目录
   - 迁移现有模板到全局库
   - 更新模板格式和元数据

2. **Phase 2**: 更新命令行工具
   - 实现 `devops template` 命令
   - 更新 `devops run` 逻辑
   - 支持从作业配置部署

3. **Phase 3**: 更新 Web 界面
   - 后端 API 支持新架构
   - 前端界面支持模板选择
   - 作业管理界面

4. **Phase 4**: 数据迁移
   - 将现有工作空间模板转换为作业配置
   - 清理旧的模板文件
   - 验证新架构功能

## 🧪 **测试验证**

```bash
# 1. 测试模板管理
devops template list
devops template show spring-boot

# 2. 测试作业创建
devops template create spring-boot test-app --workspace youshen \
    --param module_name=test-app \
    --param git_url=https://github.com/example/test.git

# 3. 测试部署
devops run test-app --workspace youshen

# 4. 测试 Web 界面
# 访问 http://localhost:5173
# 测试模板选择和作业创建功能
```

---

**新架构已准备就绪，等待你的验证和反馈！** 🎉
