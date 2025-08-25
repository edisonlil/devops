# Python模板渲染器使用说明

## 概述

本项目已将原来的shell脚本sed模板渲染替换为Python模板渲染器，提供更精确、安全和强大的YAML模板处理能力。

## 优势对比

### 原sed渲染的问题
- ❌ YAML结构容易被破坏
- ❌ 特殊字符处理困难
- ❌ 多行处理复杂
- ❌ 错误处理不足
- ❌ 维护困难

### Python渲染器的优势
- ✅ 精确的YAML结构保持
- ✅ 安全的特殊字符处理
- ✅ 强大的条件逻辑支持
- ✅ 完善的错误处理和日志
- ✅ 易于维护和扩展
- ✅ YAML语法验证

## 文件结构

```
bin/
├── template_renderer.py          # 基础模板渲染器
├── advanced_template_renderer.py # 高级模板渲染器（Jinja2）
├── port_config_handler.py        # 端口配置处理器
├── requirements.txt              # Python依赖
├── install_python_deps.sh        # 依赖安装脚本
└── TEMPLATE_RENDERER_README.md   # 本说明文档
```

## 安装依赖

### 自动安装
```bash
# 在项目根目录执行
./bin/install_python_deps.sh
```

### 手动安装
```bash
# 安装核心依赖
pip3 install PyYAML Jinja2

# 或使用requirements.txt
pip3 install -r bin/requirements.txt
```

## 使用方法

### 1. 基础模板渲染器

适用于简单的占位符替换：

```bash
python3 bin/template_renderer.py \
  --template templates/k8s/spring-boot/deploy.yaml \
  --output output/deploy.yaml \
  --module-name my-app \
  --image-path harbor.example.com/my-app:latest \
  --namespace default \
  --app-port 8080 \
  --enable-harbor \
  --harbor-secret-name harbor-secret \
  --validate
```

### 2. 高级模板渲染器

支持Jinja2语法，功能更强大：

```bash
python3 bin/advanced_template_renderer.py \
  --template templates/k8s/spring-boot/deploy.yaml \
  --output output/deploy.yaml \
  --module-name my-app \
  --image-path harbor.example.com/my-app:latest \
  --namespace default \
  --app-port 8080 \
  --service-port 80 \
  --service-type ClusterIP \
  --replicas 2 \
  --enable-harbor \
  --harbor-secret-name harbor-secret \
  --memory-request 512Mi \
  --memory-limit 1Gi \
  --cpu-request 250m \
  --cpu-limit 500m \
  --validate
```

### 3. 端口配置处理器

处理Kubernetes Service的NodePort配置：

```bash
# 添加NodePort
python3 bin/port_config_handler.py \
  --yaml-file output/deploy.yaml \
  --expose-port 30001

# 强制覆盖NodePort
python3 bin/port_config_handler.py \
  --yaml-file output/deploy.yaml \
  --expose-port 30002 \
  --force-port

# 验证端口配置
python3 bin/port_config_handler.py \
  --yaml-file output/deploy.yaml \
  --validate

# 显示端口信息
python3 bin/port_config_handler.py \
  --yaml-file output/deploy.yaml \
  --info
```

## 模板语法

### 基础模板（占位符方式）
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ?module_name
  namespace: ?namespace
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: ?module_name
        image: ?image_path
        ports:
        - containerPort: ?app_port
```

### 高级模板（Jinja2语法）
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ module_name }}
  namespace: {{ namespace }}
spec:
  replicas: {{ replicas | default(1) }}
  template:
    spec:
      {% if enable_harbor and harbor_secret_name %}
      imagePullSecrets:
      - name: {{ harbor_secret_name }}
      {% endif %}
      containers:
      - name: {{ module_name }}
        image: {{ image_path }}
        ports:
        - containerPort: {{ app_port }}
        {% if java_opts %}
        env:
        - name: JAVA_OPTS
          value: "{{ java_opts }}"
        {% endif %}
```

## 支持的变量

### 基础变量
- `module_name`: 模块名称
- `image_path`: 镜像路径
- `namespace`: 命名空间
- `app_port`: 应用端口
- `network`: 网络名称（Docker Swarm）
- `harbor_secret_name`: Harbor Secret名称
- `enable_harbor`: 是否启用Harbor
- `build_platform`: 构建平台
- `java_opts`: Java选项

### 高级变量
- `service_port`: 服务端口
- `service_type`: 服务类型
- `replicas`: 副本数
- `version`: 版本号
- `memory_request`: 内存请求
- `memory_limit`: 内存限制
- `cpu_request`: CPU请求
- `cpu_limit`: CPU限制
- `health_check_path`: 健康检查路径
- `ingress_enabled`: 是否启用Ingress
- `ingress_host`: Ingress主机名

## 测试

运行测试脚本验证功能：

```bash
python3 test_template_renderer.py
```

## 集成到DevOps工具链

Python脚本已集成到`build.sh`脚本中，会自动：

1. 检查Python环境
2. 安装必要的依赖
3. 调用Python模板渲染器
4. 验证生成的YAML
5. 处理特殊逻辑（如Harbor Secret）
6. 调用Python端口配置处理器
7. 处理NodePort配置

## 故障排除

### 常见问题

1. **Python3未安装**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install python3 python3-pip
   
   # CentOS/RHEL
   sudo yum install python3 python3-pip
   ```

2. **依赖安装失败**
   ```bash
   # 升级pip
   pip3 install --upgrade pip
   
   # 重新安装依赖
   pip3 install -r bin/requirements.txt
   ```

3. **权限问题**
   ```bash
   # 确保脚本有执行权限
   chmod +x bin/*.py bin/*.sh
   ```

### 调试模式

启用详细日志：
```bash
export PYTHONPATH=bin:$PYTHONPATH
python3 -u bin/template_renderer.py --template test.yaml --output out.yaml --module-name test --image-path test:latest --namespace default --app-port 80
```

## 迁移指南

### 从sed渲染迁移

1. **保持模板兼容性**
   - 基础模板渲染器支持原有的`?placeholder`语法
   - 无需修改现有模板

2. **逐步升级**
   - 可以先使用基础渲染器
   - 后续升级到Jinja2语法获得更多功能

3. **验证输出**
   - 使用`--validate`参数验证YAML语法
   - 对比新旧输出确保一致性

## 贡献

欢迎提交Issue和Pull Request来改进模板渲染器！

## 许可证

本项目采用MIT许可证。
