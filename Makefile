# DevOps 项目 Makefile
# 作者: edison, srillia

.PHONY: help install test clean setup permissions sdkman java-only script-only full

# 默认目标
help:
	@echo "DevOps 项目管理工具"
	@echo ""
	@echo "可用命令:"
	@echo "  install        - 标准安装（Java + Docker + 构建工具）"
	@echo "  full           - 完整安装（所有开发环境）"
	@echo "  script-only    - 仅安装 DevOps 脚本（推荐已有环境用户）"
	@echo "  minimal        - 最小化安装（同 script-only）"
	@echo "  sdkman         - 安装 SDKMAN! 和 Java 环境"
	@echo "  java-only      - 仅安装 Java (通过 SDKMAN!)"
	@echo "  test           - 运行安装测试"
	@echo "  quick-test     - 运行快速测试"
	@echo "  setup          - 设置脚本权限"
	@echo "  clean          - 清理临时文件"
	@echo "  permissions    - 修复文件权限"
	@echo ""
	@echo "安装模式说明:"
	@echo "  install        - 标准安装：Java + Docker + Maven + Gradle (~10分钟)"
	@echo "  full           - 完整安装：标准 + Node.js + Go (~20分钟)"
	@echo "  script-only    - 脚本专用：仅脚本工具 (~1分钟)"
	@echo "  sdkman         - 仅安装 Java 相关环境"
	@echo ""
	@echo "示例:"
	@echo "  make install     # 标准安装"
	@echo "  make full        # 完整安装"
	@echo "  make script-only # 仅安装脚本"
	@echo "  make test        # 测试安装"

# 设置脚本权限
permissions:
	@echo "设置脚本执行权限..."
	chmod +x install.sh
	chmod +x quick-install.sh
	chmod +x test-install.sh
	chmod +x install-sdkman.sh
	chmod +x bin/*
	@echo "权限设置完成"

# 初始化设置
setup: permissions
	@echo "初始化 DevOps 环境..."
	mkdir -p $(HOME)/.devops
	mkdir -p $(HOME)/.deploy
	@if [ -f workspace/deploy-target.sample ]; then \
		cp workspace/deploy-target.sample $(HOME)/.deploy/ 2>/dev/null || true; \
	fi
	@echo "初始化完成"

# 标准安装
install: permissions
	@echo "开始标准安装..."
	./install.sh

# 完整安装
full: permissions
	@echo "开始完整安装..."
	./install.sh --full

# 脚本专用安装
script-only: permissions
	@echo "仅安装 DevOps 脚本..."
	./install.sh --script-only

# 最小化安装（同 script-only）
minimal: script-only



# 安装 SDKMAN! 和 Java 环境
sdkman: permissions
	@echo "安装 SDKMAN! 和 Java 环境..."
	./install-sdkman.sh

# 仅安装 Java
java-only: permissions
	@echo "仅安装 Java 环境..."
	./install-sdkman.sh --java-only

# 运行测试
test: permissions
	@echo "运行安装测试..."
	./test-install.sh

# 快速测试
quick-test: permissions
	@echo "运行快速测试..."
	./test-install.sh --quick

# 清理临时文件
clean:
	@echo "清理临时文件..."
	rm -f /tmp/devops_env.sh
	rm -f /tmp/apache-maven-*.tar.gz
	rm -f /tmp/gradle-*.zip
	rm -f /tmp/go*.tar.gz
	rm -f get-docker.sh
	@echo "清理完成"

# 卸载
uninstall:
	@echo "卸载 DevOps 环境..."
	@echo "警告: 这将删除所有 DevOps 配置文件"
	@read -p "确认卸载? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	sed -i '/DEVOPS_HOME/d' $(HOME)/.bashrc 2>/dev/null || true
	sed -i '/DevOps Environment/d' $(HOME)/.bashrc 2>/dev/null || true
	rm -rf $(HOME)/.devops
	rm -rf $(HOME)/.deploy
	sudo rm -f /etc/profile.d/devops.sh
	@echo "卸载完成"

# 显示系统信息
info:
	@echo "系统信息:"
	@echo "操作系统: $$(lsb_release -d 2>/dev/null | cut -f2 || uname -s)"
	@echo "内核版本: $$(uname -r)"
	@echo "架构: $$(uname -m)"
	@echo ""
	@echo "已安装组件:"
	@command -v git >/dev/null && echo "  Git: $$(git --version)" || echo "  Git: 未安装"
	@command -v docker >/dev/null && echo "  Docker: $$(docker --version)" || echo "  Docker: 未安装"
	@command -v java >/dev/null && echo "  Java: $$(java -version 2>&1 | head -n1)" || echo "  Java: 未安装"
	@command -v mvn >/dev/null && echo "  Maven: $$(mvn -version | head -n1)" || echo "  Maven: 未安装"
	@command -v node >/dev/null && echo "  Node.js: $$(node --version)" || echo "  Node.js: 未安装"

# 检查依赖
check-deps:
	@echo "检查系统依赖..."
	@command -v curl >/dev/null || echo "警告: curl 未安装"
	@command -v wget >/dev/null || echo "警告: wget 未安装"
	@command -v git >/dev/null || echo "警告: git 未安装"
	@command -v sudo >/dev/null || echo "警告: sudo 未安装"
	@echo "依赖检查完成"

# 更新脚本
update:
	@echo "更新 DevOps 脚本..."
	git pull origin main 2>/dev/null || echo "无法从 git 更新，请手动更新"
	make permissions
	@echo "更新完成"

# 备份配置
backup:
	@echo "备份配置文件..."
	@backup_dir="devops-backup-$$(date +%Y%m%d-%H%M%S)"; \
	mkdir -p "$$backup_dir"; \
	cp -r workspace "$$backup_dir/" 2>/dev/null || true; \
	cp -r $(HOME)/.devops "$$backup_dir/user-devops" 2>/dev/null || true; \
	cp -r $(HOME)/.deploy "$$backup_dir/user-deploy" 2>/dev/null || true; \
	echo "配置已备份到: $$backup_dir"

# 恢复配置
restore:
	@echo "恢复配置文件..."
	@echo "请指定备份目录:"
	@read -p "备份目录路径: " backup_dir; \
	if [ -d "$$backup_dir" ]; then \
		cp -r "$$backup_dir/workspace" . 2>/dev/null || true; \
		cp -r "$$backup_dir/user-devops" $(HOME)/.devops 2>/dev/null || true; \
		cp -r "$$backup_dir/user-deploy" $(HOME)/.deploy 2>/dev/null || true; \
		echo "配置恢复完成"; \
	else \
		echo "备份目录不存在"; \
	fi

# 开发模式（用于开发和调试）
dev: permissions
	@echo "开发模式..."
	@echo "DEVOPS_HOME=$(PWD)" > /tmp/devops_dev.env
	@echo "PATH=$(PWD)/bin:$$PATH" >> /tmp/devops_dev.env
	@echo "开发环境变量已写入 /tmp/devops_dev.env"
	@echo "运行: source /tmp/devops_dev.env"
