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
	# 写入 enable 文件
	cat > "$enable_file" << EOF
#命令行也可以传入 --workspace foo来指定工作目录 
ENABEL_WORKSPACE_PATH="$workspace_name"
EOF
	info "已切换默认工作空间为: $workspace_name"
}

function create_workspace() {
	# Usage: devops create workspace <name> [--platform ...] [-i|--interactive] [--set-default]
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
		fi
		echo ""
		echo "#Git 默认分支"
		echo "BUILD_GIT_BRANCH=\"$git_branch\""
		if [ -n "$git_url" ]; then
			echo "#Git 默认地址"
			echo "BUILD_GIT_URL=\"$git_url\""
		fi
		if [ -n "$maven_settings" ]; then
			echo "#Maven settings.xml"
			echo "BUILD_MAVEN_SETTINGS=\"$maven_settings\""
		fi
		if [ -n "$gradle_init_script" ]; then
			echo "#Gradle init script"
			echo "BUILD_GRADLE_INIT_SCRIPT=\"$gradle_init_script\""
		fi
		echo ""
		echo "#启用dockerfile,路由dockerfile"
		echo "#BUILD_ENABEL_DOCKERFILES=\"\""
	} > "$cfg_file"

	info "已创建工作空间: $workspace_name"
	info "配置文件: $cfg_file"

	if [ "$set_default" = true ]; then
		env_use "$workspace_name"
	fi
}


