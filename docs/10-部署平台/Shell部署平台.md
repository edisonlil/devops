# Shell 部署平台

本平台用于通过执行模板目录中的启动脚本来完成部署，适合如 Harbor Standalone 等通过脚本编排/安装的场景。

## 启用方式

- 在工作空间 `config` 中设置：

```bash
BUILD_PLATFORM="SHELL"
```

- 模板目录位置优先顺序：
  - `templates/shell/middleware/<template>`
  - 回退：`templates/compose/middleware/<template>`

## 启动脚本

- 默认脚本名：`install.sh`
- 可通过命令行指定：

```bash
devops run middleware <template> <instance> --start-script <script.sh>
```

脚本在执行前会注入以下环境变量：
- `INSTANCE_NAME`：实例名称（等于命令的 `<instance>`）
- 将所有 `middleware_*` 变量导出为环境变量，规则：
  - 去掉前缀 `middleware_`
  - 将中划线 `-` 转为下划线 `_`
  - 转为大写

示例：`middleware_harbor_admin_password=xxx` 将导出为 `HARBOR_ADMIN_PASSWORD=xxx`

## 使用示例

```bash
# 交互式
devops run middleware harbor-standalone harbor -i

# 非交互式，指定启动脚本
devops run middleware harbor-standalone harbor --start-script install.sh
```

## 注意事项

- 请确保启动脚本具有可执行权限，或使用 `bash script.sh` 方式执行（系统已采用 `bash` 调用）。
- 若 `templates/shell/...` 不存在，将自动回退到 `templates/compose/...`。
- Windows 下无法执行脚本；请在 Linux 服务器上执行验证。


