# DevOps-Web 可视化管理平台（轻量化架构）

## 背景与目标
- 背景：现有 devops 工具以 CLI/脚本为主，运维新手使用门槛较高，缺少统一可视化入口来创建/管理模板、管理工作空间、发起与回溯部署作业。
- 目标：提供一个轻量化、类 sealos 风格的 Web 控制台（devops-web）。界面仅做“可视化编排与引导”，实际执行仍由现有 devops 命令/脚本完成；数据直接读写 `workspace/`、`templates/` 等目录，最大化与现有体系兼容，降低学习与维护成本。

## 设计原则
- 可视化优先：向导式流程、所见即所得参数表单。
- 轻量落地：前端静态资源 + 极薄后端（仅做文件系统读写、进程调用、日志转发）。
- 与现有命令对齐：所有操作均映射到现有 `bin/*.sh`、`devops` 命令。
- 安全默认：最小权限执行、敏感变量脱敏展示、只读/可写分级。
- 渐进增强：小白最少配置即可运行，高阶用户可展开高级参数。

## 用户角色
- 运维新手：零命令行，点击创建/部署/回滚、查看日志。
- 进阶运维/开发：自定义模板参数、批量环境管理、灰度/分批发布（后续迭代）。
- 管理员：目录治理、权限与审计、外部平台集成参数维护。

## 信息架构
- 仪表盘：概览近期作业、成功率、平均耗时。
- 模板中心：索引 `templates/` 与 `workspace/*/templates/`，查看与一键创建。
- 工作空间：列出 `workspace/*`，查看/编辑 `config` 与 `deploy/*.yml`。
- 作业与日志：发起部署、实时日志、历史回滚。
- 设置：凭证/变量分组、集成配置（K8s/Harbor）。

## 关键功能
### 模板中心
- 模板列表：按类型（k8s、swarm、vue、spring-boot 等）与来源（全局/空间）过滤与搜索。
- 详情与参数：展示 `deploy.yaml`、`dockerfile`、`nginx.conf` 等关键结构，参数说明与默认值。
- 一键创建：向导式填写参数 → 渲染预览 → 选择工作空间 → 落盘到 `workspace/<name>/deploy/*.yml` 或相应模板路径。

### 工作空间管理
- 列表与分组：扫描 `workspace/` 目录；标签、环境（dev/test/prod）。
- 配置编辑：可视化编辑 `config` 与 `deploy/*.yml`，支持 YAML 校验、版本记录（简版：文件快照）。
- 变量/凭证：敏感值仅一次写入，后续脱敏显示；以工作空间目录下文件形式存储。

### 部署作业
- 发起作业：选择模板/工作空间与参数，调用 `devops` 或 `bin/*.sh` 执行（非交互、带日志）。
- 实时日志：WebSocket/SSE 转发子进程 stdout/stderr，支持下载与关键词高亮。
- 历史记录：记录在本地元数据文件中（轻量 JSON 索引）并可从目录结构反推。
- 回滚/重试：复用历史参数，调用相应命令执行。

### 集成能力
- Kubernetes：依据 `docs/08-Kubernetes/` 提供命名空间/服务暴露向导，字段直接映射 `deploy.yaml`。
- Harbor：展示镜像仓库与推送信息（从构建日志/配置中解析）。

## 轻量化技术架构
- 前端：
  - Vue 3 + TypeScript（与现有文档站风格一致），Ant Design Vue。
  - 内置 YAML 编辑器（monaco + yaml 语言服务）。
  - 纯静态资源，可由 `site/` 或任一静态服务器托管。
- 极薄后端：
  - Node.js（Fastify/NestJS 轻骨架）或 Python（FastAPI），二选一；仅提供：
    - 文件系统操作（读取/写入 `workspace/`、`templates/`）。
    - 进程执行器（调用 `devops` 与 `bin/*.sh`），统一非交互参数与超时控制。
    - 日志流转发（WebSocket/SSE）。
    - 轻量元数据索引（本地 JSON，避免额外数据库）。
- 存储：
  - 不新增外部数据库；所有配置与状态均写回现有目录。
  - 作业元数据：`workspace/.devops-web/jobs/*.json`（可选）。

## 与现有仓库的映射关系
- 模板索引：
  - 读取 `templates/` 与 `workspace/*/templates/` 目录树。
- 渲染与构建：
  - 调用 `bin/template_renderer.py`、`bin/advanced_template_renderer.py`。
  - 按模板类型调用 `bin/vue_build`、`bin/java_build`、`bin/golang_build`、`bin/nginx_build`、`bin/tomcat_build` 等。
- 部署执行：
  - 使用 `bin/workspace.sh`、`bin/tools.sh`、`bin/docker_helper.sh` 等脚本按既有约定执行。
- 版本管理：
  - 调用 `bin/version_manager.sh`；在 UI 暴露安全的版本变更操作。
- 文档联动：
  - 在 UI 内嵌 `docs/` 对应指南链接与关键提示。

## API（最小集合示例）
- GET `/api/templates` → 扫描并返回模板树
- GET `/api/templates/:id` → 返回模板详情与参数 Schema（若无 Schema，则基于示例生成）
- GET `/api/workspaces` → 列出工作空间与摘要
- GET `/api/workspaces/:name` → 读取 `config` 与 `deploy/*.yml`
- PUT `/api/workspaces/:name/files` → 批量写入/更新配置文件
- POST `/api/jobs/deploy` → 调用命令执行并返回作业 id
- GET `/api/jobs/:id` → 作业状态与元数据
- GET `/api/logs/:id/stream` → 实时日志流

## 权限与安全
- 进程执行以受控系统用户运行；限制工作目录为项目根。
- 敏感变量只写不读（后续读取为脱敏占位）。
- 审计：记录文件写入、命令执行、回滚等关键操作（本地 JSON 日志）。

## MVP 范围与里程碑
- M1（2-3 周）：
  - 模板只读 + 一键创建基础参数
  - 工作空间列表/详情（只读）
  - 触发作业与实时日志
  - 文件系统读写与最小权限执行
- M2（3-4 周）：
  - 配置可视化编辑、YAML 校验
  - 变量/凭证组（脱敏）
  - 回滚与重试
  - K8s/Harbor 基础信息展示
- M3（4-6 周）：
  - 分批/灰度发布
  - 定时/Webhook 触发
  - 工作空间级权限与审计导出

## 验收标准（MVP）
- 通过模板中心选择 `k8s/spring-boot` 或 `k8s/vue-nginx`，最少参数即能在指定工作空间触发一次部署。
- 作业详情可实时查看日志，完成后显示访问入口/端口。
- 工作空间详情可查看并下载当前配置，变量/凭证以脱敏方式可视化。
- 支持作业一键回滚。

## 成功指标
- 新用户 10 分钟内完成人生第一次部署 ≥ 70%。
- 回滚平均耗时 ≤ 2 分钟；回滚成功率 ≥ 95%。
- 常见部署相关问询量较 CLI 模式下降 ≥ 50%。

---

> 说明：本方案强调“界面轻、逻辑薄、命令重”。devops-web 负责可视化与引导，真实读取/写入仍在 `workspace/`、`templates/` 等既有目录，执行则复用已有 devops 命令与脚本，实现零迁移、低成本上线。
