#!/bin/bash

# 工作空间相关函数

function env_use() {
	local workspace_name="$1"
	if [ -z "$workspace_name" ]; then
		error "用法: devops env use <workspace>"; exit 1
	fi
	local devops_home="${env[cfg_devops_path]}"
	local workspace_dir="$devops_home/workspace/$workspace_name"
	local enable_file="$devops_home/workspace/enable"
	if [ ! -d "$workspace_dir" ]; then
		error "工作空间不存在: $workspace_name"; exit 1
	fi
	
	# 加载工作空间配置
	local config_file="$workspace_dir/config"
	if [ -f "$config_file" ]; then
		source "$config_file"
		# 如果启用了Harbor，执行登录
		if [ "$BUILD_ENABEL_HARBOR" = "1" ] && [ -n "$BUILD_HARBOR_ADDRESS" ] && [ -n "$BUILD_HARBOR_USERNAME" ] && [ -n "$BUILD_HARBOR_PASSWORD" ]; then
			info "正在登录 Harbor: $BUILD_HARBOR_ADDRESS"
			if docker login "$BUILD_HARBOR_ADDRESS" -u "$BUILD_HARBOR_USERNAME" -p "$BUILD_HARBOR_PASSWORD" >/dev/null 2>&1; then
				success "Harbor 登录成功"
			else
				warn "Harbor 登录失败，请检查用户名和密码"
			fi
		fi
	fi
	
	# 写入 enable 文件
	cat > "$enable_file" << EOF
#命令行也可以传入 --workspace foo来指定工作目录 
ENABEL_WORKSPACE_PATH="$workspace_name"
EOF
	info "已切换默认工作空间为: $workspace_name"
}

function harbor_login_current() {
	local devops_home="${env[cfg_devops_path]}"
	local enable_file="$devops_home/workspace/enable"
	
	if [ ! -f "$enable_file" ]; then
		error "未找到默认工作空间配置"; exit 1
	fi
	
	source "$enable_file"
	local workspace_name="$ENABEL_WORKSPACE_PATH"
	local workspace_dir="$devops_home/workspace/$workspace_name"
	local config_file="$workspace_dir/config"
	
	if [ ! -f "$config_file" ]; then
		error "工作空间配置文件不存在: $config_file"; exit 1
	fi
	
	source "$config_file"
	
	if [ "$BUILD_ENABEL_HARBOR" != "1" ]; then
		info "当前工作空间未启用 Harbor"; exit 0
	fi
	
	if [ -z "$BUILD_HARBOR_ADDRESS" ] || [ -z "$BUILD_HARBOR_USERNAME" ] || [ -z "$BUILD_HARBOR_PASSWORD" ]; then
		error "Harbor 配置不完整，请检查配置文件"; exit 1
	fi
	
	info "正在登录 Harbor: $BUILD_HARBOR_ADDRESS"
	if docker login "$BUILD_HARBOR_ADDRESS" -u "$BUILD_HARBOR_USERNAME" -p "$BUILD_HARBOR_PASSWORD" >/dev/null 2>&1; then
		success "Harbor 登录成功"
	else
		error "Harbor 登录失败，请检查用户名和密码"
		exit 1
	fi
}

function harbor_secret_manage() {
	local devops_home="${env[cfg_devops_path]}"
	local enable_file="$devops_home/workspace/enable"
	
	if [ ! -f "$enable_file" ]; then
		error "未找到默认工作空间配置"; exit 1
	fi
	
	source "$enable_file"
	local workspace_name="$ENABEL_WORKSPACE_PATH"
	local workspace_dir="$devops_home/workspace/$workspace_name"
	local config_file="$workspace_dir/config"
	
	if [ ! -f "$config_file" ]; then
		error "工作空间配置文件不存在: $config_file"; exit 1
	fi
	
	source "$config_file"
	
	if [ "$BUILD_ENABEL_HARBOR" != "1" ]; then
		info "当前工作空间未启用 Harbor"; exit 0
	fi
	
	if [ "$BUILD_PLATFORM" != "KUBERNETES" ]; then
		info "当前工作空间不是 KUBERNETES 平台"; exit 0
	fi
	
	if [ -z "$BUILD_HARBOR_ADDRESS" ] || [ -z "$BUILD_HARBOR_USERNAME" ] || [ -z "$BUILD_HARBOR_PASSWORD" ]; then
		error "Harbor 配置不完整，请检查配置文件"; exit 1
	fi
	
	local namespace="$BUILD_K8S_NAMESPACE"
	local secret_name="harbor-registry-${namespace}"
	
	echo "Harbor Secret 管理"
	echo "=================="
	echo "工作空间: $workspace_name"
	echo "命名空间: $namespace"
	echo "Secret名称: $secret_name"
	echo "Harbor地址: $BUILD_HARBOR_ADDRESS"
	echo ""
	
	# 检查kubectl是否可用
	if ! command -v kubectl >/dev/null 2>&1; then
		error "kubectl 命令未找到，请先安装 kubectl"; exit 1
	fi
	
	# 检查secret是否存在
	if kubectl get secret "$secret_name" -n "$namespace" >/dev/null 2>&1; then
		echo "✅ Secret $secret_name 已存在"
		echo ""
		echo "操作选项:"
		echo "1) 重新创建 Secret"
		echo "2) 删除 Secret"
		echo "3) 查看 Secret 详情"
		echo "4) 退出"
		echo ""
		read -p "请选择操作 [1-4]: " choice
		
		case "$choice" in
			1)
				info "删除现有 Secret..."
				kubectl delete secret "$secret_name" -n "$namespace" >/dev/null 2>&1
				info "重新创建 Secret..."
				;;
			2)
				info "删除 Secret..."
				if kubectl delete secret "$secret_name" -n "$namespace" >/dev/null 2>&1; then
					success "Secret 删除成功"
				else
					error "Secret 删除失败"
				fi
				exit 0
				;;
			3)
				info "Secret 详情:"
				kubectl describe secret "$secret_name" -n "$namespace"
				exit 0
				;;
			4|*)
				info "操作已取消"
				exit 0
				;;
		esac
	else
		echo "❌ Secret $secret_name 不存在"
		echo ""
		read -p "是否创建 Secret? [Y/n]: " choice
		if [[ "$choice" =~ ^[Nn]$ ]]; then
			info "操作已取消"
			exit 0
		fi
	fi
	
	# 创建或重新创建secret
	info "创建 K8s Harbor Secret: $secret_name"
	if kubectl create secret docker-registry "$secret_name" \
		--docker-server="$BUILD_HARBOR_ADDRESS" \
		--docker-username="$BUILD_HARBOR_USERNAME" \
		--docker-password="$BUILD_HARBOR_PASSWORD" \
		--namespace="$namespace" >/dev/null 2>&1; then
		success "K8s Harbor Secret 创建成功"
		info "Secret 名称: $secret_name"
		info "命名空间: $namespace"
		info "Harbor 地址: $BUILD_HARBOR_ADDRESS"
	else
		error "K8s Harbor Secret 创建失败，请检查kubectl权限"
		exit 1
	fi
}

function copy_workspace() {
	# Usage: devops copy workspace <source> <target> [--platform ...] [--namespace ...] [-i|--interactive] [--set-default]
	local interactive=false
	local source_workspace=""
	local target_workspace=""
	local platform=""
	local namespace=""
	local stack_name=""
	local network_name=""
	local harbor_project=""
	local set_default=false

	# Parse subcommand: expect first arg to be 'workspace'
	if [ "$1" != "workspace" ]; then
		error "用法: devops copy workspace <source> <target> [选项]"; exit 1
	fi
	shift

	source_workspace="$1"; shift || true
	target_workspace="$1"; shift || true

	while [[ $# -gt 0 ]]; do
		case "$1" in
			-i|--interactive) interactive=true; shift 1;;
			--platform) platform="$2"; shift 2;;
			--namespace) namespace="$2"; shift 2;;
			--stack) stack_name="$2"; shift 2;;
			--network) network_name="$2"; shift 2;;
			--harbor-project) harbor_project="$2"; shift 2;;
			--set-default) set_default=true; shift 1;;
			*) error "未知参数: $1"; exit 1;;
		esac
	done

	# Validate required parameters
	if [ -z "$source_workspace" ]; then
		error "缺少源工作空间名称"; exit 1
	fi
	if [ -z "$target_workspace" ]; then
		error "缺少目标工作空间名称"; exit 1
	fi

	local devops_home="${env[cfg_devops_path]}"
	local source_dir="$devops_home/workspace/$source_workspace"
	local target_dir="$devops_home/workspace/$target_workspace"

	# Check if source workspace exists
	if [ ! -d "$source_dir" ]; then
		error "源工作空间不存在: $source_workspace"; exit 1
	fi

	# Check if target workspace already exists
	if [ -d "$target_dir" ]; then
		if [ "$interactive" = true ]; then
			read -p "目标工作空间已存在，是否覆盖? [y/N]: " confirm
			if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
				info "操作已取消"; exit 0
			fi
		else
			warn "目标工作空间已存在，将被覆盖: $target_workspace"
		fi
		rm -rf "$target_dir"
	fi

	# Copy the entire workspace directory
	info "正在复制工作空间: $source_workspace -> $target_workspace"
	cp -r "$source_dir" "$target_dir"

	# Load source config to get current settings
	local source_config="$source_dir/config"
	if [ -f "$source_config" ]; then
		source "$source_config"
	fi

	# Interactive mode: prompt for configuration changes
	if [ "$interactive" = true ]; then
		echo ""
		echo "配置工作空间: $target_workspace"
		echo "================================"

		if [ -z "$platform" ]; then
			echo "当前平台: $BUILD_PLATFORM"
			read -p "是否修改平台? [y/N]: " change_platform
			if [[ "$change_platform" =~ ^[Yy]$ ]]; then
				while [[ -z "$platform" ]]; do
					echo "选择平台:"
					echo "  1) KUBERNETES"
					echo "  2) DOCKER_SWARM"
					echo "  3) DOCKER_COMPOSE"
					read -p "输入序号 [1]: " choice
					choice=${choice:-1}
					case "$choice" in
						1) platform="KUBERNETES" ;;
						2) platform="DOCKER_SWARM" ;;
						3) platform="DOCKER_COMPOSE" ;;
						*) echo "无效选择，请重试"; platform="" ;;
					esac
				done
			else
				platform="$BUILD_PLATFORM"
			fi
		fi

		if [ "$platform" = "KUBERNETES" ] || [ "$BUILD_PLATFORM" = "KUBERNETES" ]; then
			if [ -z "$namespace" ]; then
				echo "当前命名空间: $BUILD_K8S_NAMESPACE"
				read -p "新的命名空间 [保持不变]: " new_namespace
				if [ -n "$new_namespace" ]; then
					namespace="$new_namespace"
				fi
			fi
		else
			if [ -z "$stack_name" ]; then
				echo "当前Stack名称: $BUILD_DOCKER_STACK_NAME"
				read -p "新的Stack名称 [${target_workspace}]: " new_stack
				stack_name=${new_stack:-$target_workspace}
			fi
			if [ -z "$network_name" ]; then
				echo "当前网络名称: $BUILD_DOCKER_SWARM_NETWORK"
				read -p "新的网络名称 [${target_workspace}_overlay_network]: " new_network
				network_name=${new_network:-${target_workspace}_overlay_network}
			fi
		fi

		if [ "$BUILD_ENABEL_HARBOR" = "1" ] && [ -z "$harbor_project" ]; then
			echo "当前Harbor项目: $BUILD_HARBOR_PROJECT"
			read -p "新的Harbor项目 [保持不变]: " new_harbor_project
			if [ -n "$new_harbor_project" ]; then
				harbor_project="$new_harbor_project"
			fi
		fi

		read -p "设为默认工作空间? [y/N]: " reply_default
		if [[ "$reply_default" =~ ^[Yy]$ ]]; then set_default=true; fi
	fi

	# Update configuration file
	local target_config="$target_dir/config"
	if [ -f "$target_config" ]; then
		# Update platform if specified
		if [ -n "$platform" ] && [ "$platform" != "$BUILD_PLATFORM" ]; then
			if command -v sed >/dev/null 2>&1; then
				# 使用临时文件确保兼容性
				sed "s/BUILD_PLATFORM=\".*\"/BUILD_PLATFORM=\"$platform\"/" "$target_config" > "$target_config.tmp" && mv "$target_config.tmp" "$target_config"
			fi
		fi

		# Update namespace if specified
		if [ -n "$namespace" ]; then
			if grep -q "BUILD_K8S_NAMESPACE" "$target_config"; then
				if command -v sed >/dev/null 2>&1; then
					sed "s/BUILD_K8S_NAMESPACE=\".*\"/BUILD_K8S_NAMESPACE=\"$namespace\"/" "$target_config" > "$target_config.tmp" && mv "$target_config.tmp" "$target_config"
				fi
			else
				# Add namespace config if not exists
				echo "" >> "$target_config"
				echo "#配置Kubernetes namespace" >> "$target_config"
				echo "BUILD_K8S_NAMESPACE=\"$namespace\"" >> "$target_config"
			fi
		fi

		# Update stack name if specified
		if [ -n "$stack_name" ]; then
			if grep -q "BUILD_DOCKER_STACK_NAME" "$target_config"; then
				if command -v sed >/dev/null 2>&1; then
					sed "s/BUILD_DOCKER_STACK_NAME=\".*\"/BUILD_DOCKER_STACK_NAME=\"$stack_name\"/" "$target_config" > "$target_config.tmp" && mv "$target_config.tmp" "$target_config"
				fi
			else
				echo "" >> "$target_config"
				echo "BUILD_DOCKER_STACK_NAME=\"$stack_name\"" >> "$target_config"
			fi
		fi

		# Update network name if specified
		if [ -n "$network_name" ]; then
			if grep -q "BUILD_DOCKER_SWARM_NETWORK" "$target_config"; then
				if command -v sed >/dev/null 2>&1; then
					sed "s/BUILD_DOCKER_SWARM_NETWORK=\".*\"/BUILD_DOCKER_SWARM_NETWORK=\"$network_name\"/" "$target_config" > "$target_config.tmp" && mv "$target_config.tmp" "$target_config"
				fi
			else
				echo "" >> "$target_config"
				echo "BUILD_DOCKER_SWARM_NETWORK=\"$network_name\"" >> "$target_config"
			fi
		fi

		# Update harbor project if specified
		if [ -n "$harbor_project" ]; then
			if grep -q "BUILD_HARBOR_PROJECT" "$target_config"; then
				if command -v sed >/dev/null 2>&1; then
					sed "s/BUILD_HARBOR_PROJECT=\".*\"/BUILD_HARBOR_PROJECT=\"$harbor_project\"/" "$target_config" > "$target_config.tmp" && mv "$target_config.tmp" "$target_config"
				fi
			fi
		fi
	fi

	success "工作空间复制完成: $source_workspace -> $target_workspace"
	info "配置文件: $target_config"

	if [ "$set_default" = true ]; then
		env_use "$target_workspace"
	fi
}

function create_workspace() {
	# Usage: devops create workspace <name> [--platform ...] [--build-version ...] [-i|--interactive] [--set-default]
	local interactive=false
	local workspace_name=""
	local platform=""
	local namespace=""
	local stack_name=""
	local network_name=""
	local enable_harbor=""
	local harbor_full=""
	local git_branch=""
	local git_url=""
	local maven_settings=""
	local gradle_init_script=""
	local build_version=""
	local set_default=false

	# Parse subcommand: expect first arg to be 'workspace'
	if [ "$1" != "workspace" ]; then
		error "用法: devops create workspace <name> [选项]"; exit 1
	fi
	shift

	workspace_name="$1"; shift || true

	while [[ $# -gt 0 ]]; do
		case "$1" in
			-i|--interactive) interactive=true; shift 1;;
			--platform) platform="$2"; shift 2;;
			--namespace) namespace="$2"; shift 2;;
			--stack) stack_name="$2"; shift 2;;
			--network) network_name="$2"; shift 2;;
			--harbor) harbor_full="$2"; shift 2;;
			--enable-harbor) enable_harbor="$2"; shift 2;;
			--git-branch) git_branch="$2"; shift 2;;
			--git-url) git_url="$2"; shift 2;;
			--maven-settings) maven_settings="$2"; shift 2;;
			--gradle-init-script) gradle_init_script="$2"; shift 2;;
			--build-version) build_version="$2"; shift 2;;
			--set-default) set_default=true; shift 1;;
			*) error "未知参数: $1"; exit 1;;
		esac
	done

	# Interactive prompts if needed
	if [ "$interactive" = true ]; then
		if [ -z "$workspace_name" ]; then
			read -p "工作空间名称: " workspace_name
		fi
		while [[ -z "$platform" ]]; do
			echo "选择平台:"
			echo "  1) KUBERNETES"
			echo "  2) DOCKER_SWARM"
			echo "  3) DOCKER_COMPOSE"
			read -p "输入序号 [1]: " choice
			choice=${choice:-1}
			case "$choice" in
				1) platform="KUBERNETES" ;;
				2) platform="DOCKER_SWARM" ;;
				3) platform="DOCKER_COMPOSE" ;;
				*) echo "无效选择，请重试"; platform="" ;;
			esac
		done
		if [ "$platform" = "KUBERNETES" ]; then
			if [ -z "$namespace" ]; then
				read -p "K8s 命名空间 [default]: " namespace
				namespace=${namespace:-default}
			fi
		else
			if [ -z "$stack_name" ]; then
				read -p "Stack 名称 [${workspace_name}]: " stack_name
				stack_name=${stack_name:-$workspace_name}
			fi
			if [ -z "$network_name" ]; then
				read -p "网络名称 [${workspace_name}_overlay_network]: " network_name
				network_name=${network_name:-${workspace_name}_overlay_network}
			fi
		fi
		if [ -z "$enable_harbor" ]; then
			read -p "是否启用 Harbor (0/1) [0]: " enable_harbor
			enable_harbor=${enable_harbor:-0}
		fi
		if [ "$enable_harbor" = "1" ] && [ -z "$harbor_full" ]; then
			read -p "Harbor 地址与项目 (addr/project): " harbor_full
		fi
		if [ "$enable_harbor" = "1" ] && [ -z "$harbor_username" ]; then
			read -p "Harbor 用户名: " harbor_username
		fi
		if [ "$enable_harbor" = "1" ] && [ -z "$harbor_password" ]; then
			read -s -p "Harbor 密码: " harbor_password
			echo
		fi
		if [ -z "$git_branch" ]; then
			read -p "Git 默认分支 [main]: " git_branch
			git_branch=${git_branch:-main}
		fi
		if [ -z "$git_url" ]; then
			read -p "默认 Git 仓库地址 (可留空): " git_url
		fi
		if [ -z "$maven_settings" ]; then
			read -p "Maven settings.xml 路径 (可留空): " maven_settings
		fi
		if [ -z "$gradle_init_script" ]; then
			read -p "Gradle init script 路径 (可留空): " gradle_init_script
		fi
		if [ -z "$build_version" ]; then
			echo ""
			echo "构建工具版本配置 (可选):"
			echo "  格式: 工具:版本,工具:版本"
			echo "  示例: node:18.12,jdk:17,maven:3.9.3"
			echo "  支持: node, jdk/java, maven, gradle, volta"
			read -p "构建工具版本 (可留空): " build_version
		fi
		read -p "设为默认工作空间? (y/N): " reply_default
		if [[ "$reply_default" =~ ^[Yy]$ ]]; then set_default=true; fi
	fi

	# Validate required
	if [ -z "$workspace_name" ]; then error "缺少工作空间名称"; exit 1; fi
	if [ -z "$platform" ]; then platform="KUBERNETES"; fi
	if [ "$platform" = "KUBERNETES" ] && [ -z "$namespace" ]; then namespace="default"; fi
	if [ "$platform" != "KUBERNETES" ]; then
		[ -z "$stack_name" ] && stack_name="$workspace_name"
		[ -z "$network_name" ] && network_name="${workspace_name}_overlay_network"
	fi
	[ -z "$git_branch" ] && git_branch="main"

	# Harbor parse
	local harbor_addr="" harbor_project=""
	if [ -n "$harbor_full" ]; then
		harbor_addr="${harbor_full%%/*}"
		harbor_project="${harbor_full#*/}"
		if [ -z "$harbor_project" ] || [ "$harbor_project" = "$harbor_addr" ]; then
			error "--harbor 需为 <address>/<project> 格式"; exit 1
		fi
		enable_harbor=1
	fi
	[ -z "$enable_harbor" ] && enable_harbor=0

	local devops_home="${env[cfg_devops_path]}"
	local ws_dir="$devops_home/workspace/$workspace_name"
	local cfg_file="$ws_dir/config"
	if [ -d "$ws_dir" ]; then
		warn "工作空间已存在: $workspace_name"
	else
		mkdir -p "$ws_dir"
	fi

	# Write config directly
	{
		echo ""
		echo "#构建平台，是 DOCKER_SWARM,KUBERNETES,DOCKER_COMPOSE"
		echo "BUILD_PLATFORM=\"$platform\""
		case "$platform" in
			KUBERNETES)
				echo ""
				echo "#配置Kubernetes namespace"
				echo "BUILD_K8S_NAMESPACE=\"$namespace\""
				;;
			DOCKER_SWARM|DOCKER_COMPOSE)
				echo ""
				echo "BUILD_DOCKER_STACK_NAME=\"$stack_name\""
				echo "BUILD_DOCKER_SWARM_NETWORK=\"$network_name\""
				;;
			*) ;;
		esac
		echo ""
		echo "#是否启用harbor仓库"
		echo "BUILD_ENABEL_HARBOR=$enable_harbor"
		if [ "$enable_harbor" = "1" ]; then
			echo "#配置harbor仓库地址"
			echo "BUILD_HARBOR_ADDRESS=\"$harbor_addr\""
			echo "#配置harbor仓库"
			echo "BUILD_HARBOR_PROJECT=\"$harbor_project\""
			echo "#配置harbor用户名"
			echo "BUILD_HARBOR_USERNAME=\"$harbor_username\""
			echo "#配置harbor密码"
			echo "BUILD_HARBOR_PASSWORD=\"$harbor_password\""
		fi
		echo ""
		echo "#Git 默认分支"
		echo "BUILD_GIT_BRANCH=\"$git_branch\""
		if [ -n "$git_url" ]; then
			echo "#Git 默认地址"
			echo "BUILD_GIT_URL=\"$git_url\""
		fi
		# Git 默认凭据（可选，建议使用只读 Token/Robot）
		echo "#Git 默认用户名（可选）"
		echo "#BUILD_GIT_USERNAME=\"\""
		echo "#Git 默认密码/Token（可选，建议使用环境变量引用）"
		echo "#BUILD_GIT_PASSWORD=\"\""
		if [ -n "$maven_settings" ]; then
			echo "#Maven settings.xml"
			echo "BUILD_MAVEN_SETTINGS=\"$maven_settings\""
		fi
		if [ -n "$gradle_init_script" ]; then
			echo "#Gradle init script"
			echo "BUILD_GRADLE_INIT_SCRIPT=\"$gradle_init_script\""
		fi
		echo ""
		echo "#构建工具版本配置 (可选)"
		echo "#格式: \"工具:版本,工具:版本\" 例如: \"node:18.12,jdk:17,maven:3.9.3\""
		if [ -n "$build_version" ]; then
			echo "BUILD_VERSION=\"$build_version\""
		else
			echo "#BUILD_VERSION=\"\""
		fi
		echo ""
		echo "#Java 启动参数默认值 (JAVA_OPTS)，示例: -Xms512m -Xmx1024m"
		echo "#BUILD_JAVA_OPTS=\"-Xms512m -Xmx1024m\""
	} > "$cfg_file"

	info "已创建工作空间: $workspace_name"
	info "配置文件: $cfg_file"

	# 如果启用了Harbor，执行登录
	if [ "$enable_harbor" = "1" ] && [ -n "$harbor_addr" ] && [ -n "$harbor_username" ] && [ -n "$harbor_password" ]; then
		info "正在登录 Harbor: $harbor_addr"
		if docker login "$harbor_addr" -u "$harbor_username" -p "$harbor_password" >/dev/null 2>&1; then
			success "Harbor 登录成功"
		else
			warn "Harbor 登录失败，请检查用户名和密码"
		fi
	fi

	if [ "$set_default" = true ]; then
		env_use "$workspace_name"
	fi
}


