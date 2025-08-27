# Python 项目部署

DevOps 支持 Python 项目的自动化部署，包括 Flask、Django、FastAPI 等各种 Python Web 框架。

## 🎯 核心特性

- **多框架支持**: 支持 Flask、Django、FastAPI、Tornado 等主流框架
- **智能检测**: 自动检测项目结构和主程序文件
- **版本管理**: 支持 conda 和 pyenv 进行 Python 版本管理
- **依赖管理**: 自动处理 requirements.txt 和 setup.py
- **容器优化**: 使用多阶段构建和非 root 用户运行
- **健康检查**: 内置健康检查和探针配置

## 📋 支持的项目类型

| 框架 | 主程序文件 | 默认端口 | 说明 |
|------|------------|----------|------|
| Flask | app.py | 5000 | 轻量级 Web 框架 |
| Django | manage.py | 8000 | 全功能 Web 框架 |
| FastAPI | main.py | 8000 | 现代异步 API 框架 |
| Tornado | server.py | 8888 | 异步网络库 |
| 通用 | app.py | 8000 | 通用 Python 应用 |

## 🚀 快速开始

### 基础部署

```bash
# 最简单的部署方式
devops run python my-api

# 指定 Git 仓库
devops run python my-api --git-url https://github.com/user/my-api.git
```

### 交互式部署（推荐）

```bash
# 交互式配置，适合新手
devops run python my-api -i
```

### 高级配置

```bash
# 完整配置示例
devops run python my-api \
  --git-url https://github.com/user/my-api.git \
  --python-main server.py \
  --service-port "api:5000" \
  --export-port "30050" \
  --python-requirements requirements/prod.txt \
  --build-version "python:3.11" \
  --build-env prod \
  --namespace production
```

## 🔧 Python 特定参数

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--python-main` | 主程序文件路径 | app.py | `--python-main server.py` |
| `--python-requirements` | requirements 文件路径 | requirements.txt | `--python-requirements requirements/prod.txt` |
| `--service-port` | 服务端口配置 | 自动检测 | `--service-port "http:5000"` |
| `--app-port` | 传统单端口配置 | 自动检测 | `--app-port 5000` |

## 📁 项目结构要求

### 基本结构

```
my-python-project/
├── app.py              # 主程序文件
├── requirements.txt    # 依赖文件
├── config.py          # 配置文件（可选）
└── static/            # 静态文件（可选）
    └── ...
```

### Flask 项目示例

```
flask-app/
├── app.py
├── requirements.txt
├── config.py
├── models/
│   └── __init__.py
├── views/
│   └── __init__.py
└── templates/
    └── index.html
```

### Django 项目示例

```
django-app/
├── manage.py
├── requirements.txt
├── myproject/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── myapp/
    ├── __init__.py
    ├── models.py
    ├── views.py
    └── urls.py
```

## 🐍 Python 版本管理

### 使用 conda

```bash
# 指定 Python 版本（推荐）
devops run python my-api --build-version "python:3.11"

# conda 会自动创建环境
# 环境名称格式：python-{version}
```

### 使用 pyenv

```bash
# 如果系统安装了 pyenv
devops run python my-api --build-version "py:3.10"

# pyenv 会自动安装和切换版本
```

### 版本选择建议

| Python 版本 | 适用场景 | 说明 |
|-------------|----------|------|
| 3.11 | 新项目 | 最新稳定版，性能最佳 |
| 3.10 | 生产环境 | 稳定可靠，广泛支持 |
| 3.9 | 兼容性 | 良好的库兼容性 |
| 3.8 | 遗留项目 | 长期支持版本 |

## 🔧 构建配置

### 自动检测逻辑

1. **主程序文件检测顺序**:
   - 用户指定的 `--python-main`
   - app.py
   - main.py
   - server.py
   - run.py

2. **依赖文件检测**:
   - 用户指定的 `--python-requirements`
   - requirements.txt
   - 如果不存在，创建空文件

3. **端口配置**:
   - 用户指定的 `--service-port` 或 `--app-port`
   - 框架默认端口
   - 通用默认端口 8000

### 自定义构建命令

```bash
# 使用自定义构建命令
devops run python my-api \
  --build-cmds "pip install -e . && python setup.py build"
```

## 🐳 Docker 配置

### 基础镜像

- **基础镜像**: python:3.9-slim
- **工作目录**: /app
- **运行用户**: appuser (非 root)
- **健康检查**: 内置 /health 端点检查

### 构建优化

1. **多阶段构建**: 减小镜像体积
2. **依赖缓存**: 优化构建速度
3. **安全配置**: 非 root 用户运行
4. **环境变量**: 合理的默认配置

## 🔍 常见问题

### 依赖安装失败

```bash
# 问题：某些包需要编译
ERROR: Failed building wheel for some-package

# 解决：使用包含编译工具的基础镜像
# 或在 requirements.txt 中指定预编译版本
```

### 端口配置问题

```bash
# 问题：应用无法访问
# 检查应用是否监听正确的端口和地址

# Flask 示例
app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))

# FastAPI 示例
uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get('PORT', 8000)))
```

### 健康检查失败

```bash
# 问题：健康检查端点不存在
# 解决：在应用中添加健康检查端点

# Flask 示例
@app.route('/health')
def health():
    return {'status': 'healthy'}

# FastAPI 示例
@app.get('/health')
def health():
    return {'status': 'healthy'}
```

## 📝 最佳实践

### 1. 项目结构

```bash
# 推荐的项目结构
my-python-app/
├── app.py                 # 主程序
├── requirements.txt       # 生产依赖
├── requirements-dev.txt   # 开发依赖
├── config.py             # 配置管理
├── Dockerfile            # 自定义 Docker 配置（可选）
└── tests/                # 测试代码
    └── test_app.py
```

### 2. 依赖管理

```bash
# requirements.txt 示例
Flask==2.3.3
gunicorn==21.2.0
python-dotenv==1.0.0

# 固定版本号，确保构建一致性
```

### 3. 配置管理

```python
# config.py 示例
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret')
    DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    PORT = int(os.environ.get('PORT', 8000))
```

### 4. 生产部署

```bash
# 生产环境部署
devops run python my-api \
  --build-env prod \
  --build-version "python:3.11" \
  --namespace production \
  --service-port "http:8000" \
  --export-port "8000:30080"
```

## 🔗 相关文档

- [版本管理](../04-配置指南/01-版本管理.md) - Python 版本管理详解
- [多端口配置](../04-配置指南/02-多端口配置.md) - 端口配置指南
- [交互式部署](../04-配置指南/03-交互式部署.md) - 交互式部署使用
- [故障排除](../11-故障排除/故障排除.md) - 常见问题解决
