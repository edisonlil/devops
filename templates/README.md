# DevOps 模板系统开发指南

本文档指导开发人员如何编写和维护DevOps模板系统中的模板配置。

## 📁 模板目录结构

```
templates/
├── k8s/                    # Kubernetes 模板
│   ├── app/               # 应用类模板
│   │   ├── spring-boot/   # Spring Boot 应用
│   │   ├── vue-nginx/     # Vue.js 前端应用
│   │   ├── nodejs/        # Node.js 应用
│   │   ├── python/        # Python 应用
│   │   └── nginx/         # Nginx 静态服务
│   └── middleware/        # 中间件模板
│       ├── mysql-standalone/      # MySQL 单实例
│       ├── redis-standalone/      # Redis 单实例
│       ├── redis-cluster/         # Redis 集群
│       └── elasticsearch-cluster/ # Elasticsearch 集群
├── compose/                # Docker Compose 模板
│   ├── app/               # 应用类模板
│   │   └── nodejs/        # Node.js 应用
│   └── middleware/        # 中间件模板
│       └── harbor-standalone/     # Harbor 镜像仓库
└── swarm/                 # Docker Swarm 模板
    ├── nodejs/            # Node.js 应用
    └── tomcat/            # Tomcat 应用
```

## 📋 标准文件说明

每个模板目录应包含以下标准文件：

### 必需文件

1. **`metadata.yaml`** - 模板元数据定义
   - 模板基本信息（名称、类型、描述、版本等）
   - 支持的变量列表及其类型、默认值、验证规则
   - 平台兼容性信息

2. **`deploy.yaml.j2`** (K8s) / **`docker-compose.yml.j2`** (Compose) / **`stack.yml.j2`** (Swarm)
   - 主要的部署配置文件模板
   - 使用Jinja2语法进行变量替换和条件渲染

### 可选文件

3. **`README.md`** - 模板使用说明
   - 模板功能描述
   - 部署步骤说明
   - 配置参数说明
   - 故障排除指南

4. **`install.sh`** - 安装脚本
   - 环境检查
   - 依赖安装
   - 配置初始化

5. **`prepare.sh`** - 准备脚本
   - 数据目录创建
   - 配置文件生成
   - 权限设置

6. **`run.sh`** - 运行脚本
   - 服务启动
   - 健康检查
   - 状态监控

## 🔧 模板编写规范

### 1. 元数据文件 (metadata.yaml)

```yaml
# 模板基本信息
name: "template-name"
type: "template-type"
description: "模板功能描述"
version: "1.0"
author: "devops-team"
platform: "kubernetes|docker-compose|docker-swarm"

# 支持的变量定义
variables:
  - name: "instance_name"
    type: "string"
    required: true
    description: "实例名称"
    example: "my-instance"
    validation: "^[a-z0-9-]+$"

  - name: "memory_limit"
    type: "string"
    default: "1Gi"
    description: "内存限制"
    example: "2Gi"
    validation: "^[0-9]+[MG]i$"

  - name: "replicas"
    type: "integer"
    default: 1
    description: "副本数量"
    validation: "value >= 1"
```

#### 变量类型说明

- **string**: 字符串类型，支持验证规则
- **integer**: 整数类型，支持范围验证
- **boolean**: 布尔类型，true/false
- **float**: 浮点数类型
- **array**: 数组类型
- **object**: 对象类型

#### 验证规则格式

- **正则表达式**: `^pattern$`
- **数值范围**: `value >= 1 and value <= 10`
- **枚举值**: `options: ["option1", "option2"]`

### 2. 部署模板文件

#### Kubernetes 模板 (deploy.yaml.j2)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ instance_name }}
  namespace: {{ namespace }}
  labels:
    app: {{ instance_name }}
    version: {{ version | default('latest') }}
spec:
  replicas: {{ replicas }}
  selector:
    matchLabels:
      app: {{ instance_name }}
  template:
    metadata:
      labels:
        app: {{ instance_name }}
    spec:
      {% if image_pull_secret %}
      imagePullSecrets:
      - name: {{ image_pull_secret }}
      {% endif %}
      containers:
      - name: {{ instance_name }}
        image: {{ image }}
        ports:
        {% for port in ports %}
        - containerPort: {{ port }}
          name: port-{{ port }}
        {% endfor %}
        resources:
          requests:
            memory: {{ memory_request }}
            cpu: {{ cpu_request }}
          limits:
            memory: {{ memory_limit }}
            cpu: {{ cpu_limit }}
        {% if health_check %}
        livenessProbe:
          httpGet:
            path: {{ health_check.path }}
            port: {{ health_check.port }}
          initialDelaySeconds: {{ health_check.initial_delay | default(30) }}
        {% endif %}
```

#### Docker Compose 模板 (docker-compose.yml.j2)

```yaml
version: '3.8'
services:
  {{ instance_name }}:
    image: {{ image }}
    container_name: {{ instance_name }}
    restart: unless-stopped
    ports:
    {% for port in ports %}
    - "{{ port.host }}:{{ port.container }}"
    {% endfor %}
    environment:
    {% for key, value in environment.items() %}
    - {{ key }}={{ value }}
    {% endfor %}
    volumes:
    {% for volume in volumes %}
    - {{ volume.host }}:{{ volume.container }}
    {% endfor %}
    {% if networks %}
    networks:
    {% for network in networks %}
    - {{ network }}
    {% endfor %}
    {% endif %}

{% if networks %}
networks:
{% for network in networks %}
  {{ network }}:
    external: true
{% endfor %}
{% endif %}
```

### 3. Jinja2 模板语法

#### 变量引用
```yaml
# 基本变量
{{ variable_name }}

# 带默认值
{{ variable_name | default('default_value') }}

# 条件渲染
{% if variable_name %}
content
{% endif %}

# 循环渲染
{% for item in items %}
- {{ item }}
{% endfor %}
```

#### 条件逻辑
```yaml
{% if environment == 'production' %}
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
{% elif environment == 'development' %}
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
{% else %}
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
{% endif %}
```

#### 过滤器使用
```yaml
# 字符串处理
{{ instance_name | upper }}
{{ instance_name | lower }}
{{ instance_name | replace('-', '_') }}

# 数值处理
{{ replicas | int }}
{{ memory_size | float }}

# 列表处理
{{ ports | join(',') }}
{{ items | length }}
```

## 📝 模板开发最佳实践

### 1. 命名规范

- **模板名称**: 使用小写字母和连字符，如 `spring-boot-advanced`
- **变量名称**: 使用下划线分隔，如 `instance_name`, `memory_limit`
- **文件名称**: 使用描述性名称，如 `deploy.yaml.j2`, `config.yaml.j2`

### 2. 变量设计原则

- **必需变量**: 只将真正必需的参数设为必需
- **默认值**: 为常用配置提供合理的默认值
- **验证规则**: 为关键参数添加验证规则
- **文档化**: 为每个变量提供清晰的描述和示例

### 3. 模板结构优化

- **模块化**: 将复杂模板拆分为多个文件
- **复用性**: 提取公共配置为可复用的片段
- **可读性**: 使用注释说明复杂的逻辑部分
- **维护性**: 避免硬编码，使用变量和条件逻辑

### 4. 错误处理

```yaml
# 添加条件检查
{% if not instance_name %}
# 错误：instance_name 是必需的
{% endif %}

{% if replicas < 1 %}
# 错误：replicas 必须大于 0
{% endif %}
```

## 🧪 模板测试

### 1. 语法验证

```bash
# 验证 YAML 语法
yamllint templates/k8s/my-template/deploy.yaml.j2

# 验证 Jinja2 语法
python -c "from jinja2 import Template; Template(open('deploy.yaml.j2').read())"
```

### 2. 渲染测试

```bash
# 使用 Python 脚本测试渲染
python3 -c "
from jinja2 import Template
import yaml

# 读取模板
with open('deploy.yaml.j2', 'r') as f:
    template_content = f.read()

# 准备测试数据
test_vars = {
    'instance_name': 'test-app',
    'namespace': 'default',
    'replicas': 2,
    'image': 'nginx:latest'
}

# 渲染模板
template = Template(template_content)
rendered = template.render(**test_vars)

# 验证 YAML 格式
try:
    yaml.safe_load(rendered)
    print('✅ 模板渲染成功，YAML 格式正确')
except yaml.YAMLError as e:
    print(f'❌ YAML 格式错误: {e}')
"
```

### 3. 集成测试

```bash
# 使用 devops 命令测试
devops template render my-template \
  --var INSTANCE_NAME=test-app \
  --var NAMESPACE=test \
  --dry-run
```

## 🔍 故障排除

### 常见问题

1. **变量未替换**
   - 检查变量名拼写
   - 确认变量在 metadata.yaml 中定义
   - 验证变量值传递是否正确

2. **YAML 格式错误**
   - 检查缩进和语法
   - 验证 Jinja2 语法
   - 使用 yamllint 工具检查

3. **条件逻辑错误**
   - 检查条件表达式语法
   - 验证变量类型和值
   - 添加调试输出

4. **循环渲染问题**
   - 检查列表变量结构
   - 验证循环语法
   - 添加空值检查

### 调试技巧

```yaml
# 添加调试输出
{% if debug %}
# Debug: {{ variable_name }}
# Debug: {{ variable_name | type }}
{% endif %}

# 使用 safe 过滤器避免转义问题
{{ variable_name | safe }}
```

## 📚 参考资源

- [Jinja2 官方文档](https://jinja.palletsprojects.com/)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [Docker Compose 官方文档](https://docs.docker.com/compose/)
- [YAML 语法规范](https://yaml.org/spec/)

## 🤝 贡献指南

1. **创建分支**: 为新模板创建功能分支
2. **编写测试**: 为模板添加测试用例
3. **更新文档**: 更新相关的 README 和文档
4. **提交 PR**: 提交 Pull Request 进行代码审查

---

如有问题或建议，请联系 DevOps 团队或提交 Issue。