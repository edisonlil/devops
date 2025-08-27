# DevOps 离线安装指南

## 概述

DevOps 工具现在支持离线安装模式，适用于以下场景：
- 服务器无法访问外网
- 已经下载了DevOps代码到服务器
- 需要在内网环境中部署
- 对安全性有特殊要求的环境

## 安装方式对比

| 安装方式 | 适用场景 | 网络要求 | 安装时间 |
|---------|---------|---------|---------|
| 在线安装 | 有网络连接的环境 | 需要访问GitHub | ~5-10分钟 |
| 离线安装 | 无网络或内网环境 | 无需网络连接 | ~3-5分钟 |

## 离线安装步骤

### 方法一：使用 --offline 参数

1. **下载代码到本地**
   ```bash
   # 在有网络的机器上下载
   git clone -b dev https://github.com/edisonlil/devops.git
   ```

2. **上传到目标服务器**
   ```bash
   # 使用scp、rsync或其他方式上传到服务器
   scp -r devops/ user@server:/home/user/
   ```

3. **在服务器上执行安装**
   ```bash
   cd devops
   chmod +x install.sh
   ./install.sh --offline
   ```

### 方法二：自动检测离线模式

如果您在DevOps项目目录中运行安装脚本，系统会自动检测并使用离线模式：

```bash
cd devops
./install.sh          # 自动检测为离线模式
./install.sh --full   # 离线完整安装
```

## 安装模式说明

### 1. 离线脚本安装（推荐）
```bash
./install.sh --offline
```
- 仅安装DevOps脚本和基础工具
- 安装时间：~3分钟
- 后续可使用 `devops install-tools` 按需安装开发工具

### 2. 离线完整安装
```bash
./install.sh --offline --full
```
- 安装所有开发环境和工具
- 包含：Java、Docker、Maven、Gradle、Node.js、Go
- 安装时间：~15-20分钟

## 离线安装特性

### ✅ 支持的功能
- DevOps脚本安装
- 基础工具安装（curl、wget、git、unzip）
- Python依赖安装
- 环境变量配置
- 目录结构创建
- 安装验证

### ⚠️ 注意事项
- 开发工具（Java、Docker等）的安装仍需要网络连接
- 建议先使用 `--offline` 安装脚本，再使用 `devops install-tools` 按需安装工具
- 确保服务器有足够的磁盘空间

## 验证安装

安装完成后，可以通过以下命令验证：

```bash
# 检查DevOps命令是否可用
devops --help

# 检查环境变量
echo $DEVOPS_HOME

# 检查已安装的工具
devops install-tools --check
```

## 故障排除

### 1. 权限问题
```bash
chmod +x install.sh
chmod +x bin/*
```

### 2. 环境变量未生效
```bash
source ~/.bashrc
# 或重新登录终端
```

### 3. Python依赖安装失败
```bash
# 手动安装核心依赖
pip3 install PyYAML Jinja2
```

### 4. 检查安装状态
```bash
# 运行安装验证
cd ~/devops
bash install.sh --help
```

## 完整示例

以下是一个完整的离线安装示例：

```bash
# 1. 在有网络的机器上准备代码
git clone -b dev https://github.com/edisonlil/devops.git
tar -czf devops.tar.gz devops/

# 2. 上传到目标服务器
scp devops.tar.gz user@target-server:/tmp/

# 3. 在目标服务器上安装
ssh user@target-server
cd /tmp
tar -xzf devops.tar.gz
cd devops
chmod +x install.sh
./install.sh --offline

# 4. 验证安装
source ~/.bashrc
devops --help
devops install-tools --check
```

## 技术实现

离线安装通过以下机制实现：

1. **项目检测**：检查当前目录是否包含必要的DevOps文件
2. **文件复制**：将项目文件复制到 `$HOME/devops` 目录
3. **跳过下载**：绕过GitHub下载步骤
4. **本地安装**：使用本地文件进行安装配置

## 更新日志

- **v1.1.0**: 新增离线安装支持
- **v1.0.0**: 初始版本，仅支持在线安装
