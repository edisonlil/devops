#!/bin/bash

# 获取脚本所在目录
BUILD_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$BUILD_SCRIPT_DIR/golang_build"
source "$BUILD_SCRIPT_DIR/java_build"
source "$BUILD_SCRIPT_DIR/tomcat_build"
source "$BUILD_SCRIPT_DIR/vue_build"
source "$BUILD_SCRIPT_DIR/nginx_build"
source "$BUILD_SCRIPT_DIR/python_build"
source "$BUILD_SCRIPT_DIR/nodejs_build"

function run() {
    # 调试信息
    if [[ "${DEBUG}" == "true" || "${env[opt_debug]}" == "true" ]]; then
        echo "DEBUG: cmd_1='${env[cmd_1]}'"
        echo "DEBUG: cmd_2='${env[cmd_2]}'"
        echo "DEBUG: cmd_3='${env[cmd_3]}'"
        echo "DEBUG: opt_interactive='${env[opt_interactive]}'"
        echo "DEBUG: 进入run()函数"
    fi

    if [[ "${env[opt_interactive]}" == "true" ]]; then
        if [[ "${DEBUG}" == "true" ]]; then
            echo "DEBUG: 调用run_interactive()"
        fi
        # 检查是否是中间件交互式部署
        if [[ "${env[cmd_2]}" == "middleware" ]]; then
            run_middleware_interactive
        else
            run_interactive
        fi
    else
        if [[ "${DEBUG}" == "true" ]]; then
            echo "DEBUG: 非交互式模式，cmd_2='${env[cmd_2]}'"
        fi
        if test -n "${env[cmd_2]}"; then
            # 特殊处理中间件命令，需要传递参数
            if [[ "${env[cmd_2]}" == "middleware" ]]; then
                run_middleware "${env[cmd_3]}" "${env[cmd_4]}"
            else
                run_${env[cmd_2]}
            fi
        else
            echo "run need be followed by a cammand"; exit 1
        fi
    fi
}

# 查找应用模板目录，优先使用workspace模板
function find_template_dir() {
	local platform_dir="$1"
	local template_id="$2"

	# 优先查找workspace应用模板
	local workspace_template_dir="${env[cfg_workspace_template_path]}/$platform_dir/app/$template_id"
	if [ -d "$workspace_template_dir" ]; then
		echo "$workspace_template_dir"
		return 0
	fi

	# fallback到全局应用模板
	local global_template_dir="${env[cfg_global_template_path]}/$platform_dir/app/$template_id"
	if [ -d "$global_template_dir" ]; then
		echo "$global_template_dir"
		return 0
	fi

	# 模板不存在
	return 1
}

# 查找中间件模板目录，优先使用workspace模板
function find_middleware_template_dir() {
	local platform_dir="$1"
	local template_name="$2"

	# 优先查找workspace中间件模板
	local workspace_middleware_template="${env[cfg_workspace_template_path]}/$platform_dir/middleware/$template_name"
	if [ -d "$workspace_middleware_template" ]; then
		echo "$workspace_middleware_template"
		return 0
	fi

	# fallback到全局中间件模板
	local global_middleware_template="${env[cfg_global_template_path]}/$platform_dir/middleware/$template_name"
	if [ -d "$global_middleware_template" ]; then
		echo "$global_middleware_template"
		return 0
	fi

	# 模板不存在
	return 1
}

# 复制模板目录中的额外文件到构建上下文
function copy_template_files_to_build_context() {
	local template_dir="$1"
	local build_context="$2"

	if [ ! -d "$template_dir" ]; then
		if [[ "${DEBUG}" == "true" ]]; then
			echo "DEBUG: 模板目录不存在: $template_dir"
		fi
		return 0
	fi

	if [[ "${DEBUG}" == "true" ]]; then
		echo "DEBUG: 复制模板文件从 $template_dir 到 $build_context"
	fi

	# 确保构建上下文目录存在
	mkdir -p "$build_context"

	# 查找模板目录中除了dockerfile和deploy.yaml之外的其他文件
	local copied_files=()
	local skipped_files=()
	local overwritten_files=()

	for file in "$template_dir"/*; do
		if [ -f "$file" ]; then
			local filename=$(basename "$file")
			local target_file="$build_context/$filename"

			# 跳过dockerfile和deploy.yaml文件
			if [[ "$filename" != "dockerfile" && "$filename" != "deploy.yaml" && "$filename" != "deploy.yml" && "$filename" != "meta.json" ]]; then

				# 检查目标文件是否已存在
				if [ -f "$target_file" ]; then
					# 比较文件内容是否相同
					if cmp -s "$file" "$target_file"; then
						if [[ "${DEBUG}" == "true" ]]; then
							echo "DEBUG: 文件内容相同，跳过: $filename"
						fi
						skipped_files+=("$filename")
					else
						# 强制覆盖已存在的文件
						cp -f "$file" "$build_context/"
						overwritten_files+=("$filename")
						info "覆盖模板文件到构建上下文: $filename"
					fi
				else
					# 复制新文件
					cp "$file" "$build_context/"
					copied_files+=("$filename")
					info "复制模板文件到构建上下文: $filename"
				fi

				# 验证复制是否成功
				if [ ! -f "$target_file" ]; then
					error "复制文件失败: $filename"
				elif [[ "${DEBUG}" == "true" ]]; then
					echo "DEBUG: 文件复制成功: $filename ($(stat -c%s "$target_file") bytes)"
				fi
			else
				if [[ "${DEBUG}" == "true" ]]; then
					echo "DEBUG: 跳过系统文件: $filename"
				fi
			fi
		fi
	done

	# 显示详细的复制结果
	local total_processed=$((${#copied_files[@]} + ${#overwritten_files[@]} + ${#skipped_files[@]}))

	if [ $total_processed -gt 0 ]; then
		info "模板文件处理完成: 新复制 ${#copied_files[@]} 个，覆盖 ${#overwritten_files[@]} 个，跳过 ${#skipped_files[@]} 个"

		if [[ "${DEBUG}" == "true" ]]; then
			if [ ${#copied_files[@]} -gt 0 ]; then
				echo "DEBUG: 新复制的文件: ${copied_files[*]}"
			fi
			if [ ${#overwritten_files[@]} -gt 0 ]; then
				echo "DEBUG: 覆盖的文件: ${overwritten_files[*]}"
			fi
			if [ ${#skipped_files[@]} -gt 0 ]; then
				echo "DEBUG: 跳过的文件: ${skipped_files[*]}"
			fi
		fi

		info "这些文件可在dockerfile中使用 COPY 指令引用"
	else
		if [[ "${DEBUG}" == "true" ]]; then
			echo "DEBUG: 模板目录中没有需要复制的额外文件"
		fi
		# 可选：显示友好提示
		# info "模板目录中只包含系统文件（dockerfile, deploy.yaml），无额外文件需要复制"
	fi
}

# 通用函数：在Docker构建前复制模板文件到最终构建上下文
function copy_template_files_to_final_build_context() {
	if [[ -n "${env[cfg_template_dir]}" && -n "${env[tmp_build_dist_path]}" ]]; then
		info "复制模板文件到最终构建上下文: ${env[tmp_build_dist_path]}"
		copy_template_files_to_build_context "${env[cfg_template_dir]}" "${env[tmp_build_dist_path]}"
	fi
}

function check_post_parmas() {
 	if [[ -z ${env[cmd_3]} ]];then
                warn "job name can not be null ## $1 ##."; exit 1;
	 fi
	env[cmd_job_name]=${env[cmd_3]}
	env[cfg_temp_dir]=/tmp/devops/${env[opt_workspace]}/${env[cmd_job_name]}

	if [[ -n ${env[cfg_temp_dir]} && ${env[cfg_temp_dir]} != '/' && ${env[cfg_temp_dir]} != '.' ]]
	then
		if [[ "${DEBUG}" == "true" ]]; then
			echo "DEBUG: 初始清理构建目录: ${env[cfg_temp_dir]}"
		fi
		rm -rf ${env[cfg_temp_dir]}

		# 验证清理是否成功
		if [ -d "${env[cfg_temp_dir]}" ]; then
			warn "警告: 构建目录清理不完全，可能影响后续构建: ${env[cfg_temp_dir]}"
		fi
	fi
}

function check_harbor_login_status() {
	# 如果启用了Harbor，检查登录状态
	if [[ "${env[cfg_enable_harbor]}" == "1" ]]; then
		local harbor_address="${env[cfg_harbor_address]}"
		local harbor_username="${env[cfg_harbor_username]}"
		local harbor_password="${env[cfg_harbor_password]}"
		
		if [[ -n "$harbor_address" && -n "$harbor_username" && -n "$harbor_password" ]]; then
			info "检查 Harbor 登录状态: $harbor_address"
			if check_harbor_login "$harbor_address" "$harbor_username" "$harbor_password"; then
				success "Harbor 登录状态正常"
			else
				warn "Harbor 登录失败，镜像推送可能会失败"
			fi
		else
			warn "Harbor 配置不完整，请检查用户名和密码配置"
		fi
	fi
}

function create_k8s_harbor_secret() {
	# 如果启用了Harbor且是K8s平台，创建docker-registry secret
	# 注意：此函数现在假设namespace已经存在，由调用方负责创建namespace
	if [[ "${env[cfg_enable_harbor]}" == "1" && "${env[cfg_build_platform]}" == "KUBERNETES" ]]; then
		local harbor_address="${env[cfg_harbor_address]}"
		local harbor_username="${env[cfg_harbor_username]}"
		local harbor_password="${env[cfg_harbor_password]}"
		local namespace="${env[cfg_k8s_namespace]}"
		
		if [[ -n "$harbor_address" && -n "$harbor_username" && -n "$harbor_password" ]]; then
			local secret_name="harbor-registry-${namespace}"
			
			info "检查 K8s Harbor Secret: $secret_name"
			
			# 检查secret是否已存在
			if kubectl get secret "$secret_name" -n "$namespace" >/dev/null 2>&1; then
				info "Secret $secret_name 已存在，跳过创建"
				env[cfg_harbor_secret_name]="$secret_name"
			else
				info "创建 K8s Harbor Secret: $secret_name"
				if kubectl create secret docker-registry "$secret_name" \
					--docker-server="$harbor_address" \
					--docker-username="$harbor_username" \
					--docker-password="$harbor_password" \
					--namespace="$namespace" >/dev/null 2>&1; then
					success "K8s Harbor Secret 创建成功"
					env[cfg_harbor_secret_name]="$secret_name"
				else
					warn "K8s Harbor Secret 创建失败，请检查kubectl权限"
					env[cfg_harbor_secret_name]=""
				fi
			fi
		else
			warn "Harbor 配置不完整，跳过 K8s Secret 创建"
		fi
	fi
}

function run_tomcat() {
  run_devops tomcat_build
}

function run_java() {
  run_devops java_build
}

function run_go() {
	run_devops go_build
}

function run_vue() {
	run_devops vue_build
}

function run_nginx() {
	run_devops nginx_build
}

function run_python() {
	run_devops python_build
}

function run_nodejs() {
	run_devops nodejs_build
}

function run_middleware() {
    local template_name="$1"
    local instance_name="$2"
    info "执行run_middleware template_name = $1  instance_name = $2"
    if [[ "${DEBUG}" == "true" ]]; then
        echo "DEBUG: 进入run_middleware()函数"
        echo "DEBUG: template_name='$template_name'"
        echo "DEBUG: instance_name='$instance_name'"
    fi

    # 检查必要参数
    if [[ -z "$template_name" ]]; then
        error "中间件模板名称不能为空"
        echo "使用方法: devops run middleware <template-name> <instance-name>"
        echo "示例: devops run middleware redis-standalone cache-server"
        exit 1
    fi

    if [[ -z "$instance_name" ]]; then
        error "中间件实例名称不能为空"
        echo "使用方法: devops run middleware <template-name> <instance-name>"
        echo "示例: devops run middleware redis-standalone cache-server"
        exit 1
    fi

    # 检查docker环境
    check_env_by_cmd_v docker

    # 设置中间件特定的环境变量
    env[cmd_type]="middleware"
    env[middleware_template]="$template_name"  # 使用独立的中间件模板变量
    env[cmd_job_name]="$instance_name"

    # 检测前置参数（仅在非交互模式下）
    if [[ "${env[opt_interactive]}" != "true" ]]; then
        check_post_parmas
    fi

    # 检查Harbor登录状态
    check_harbor_login_status

    # 中间件不需要代码拉取，跳过scm步骤
    info "中间件部署不需要代码拉取，跳过SCM步骤"

    # 查找中间件模板
    local platform_dir
    case "${env[cfg_build_platform]}" in
        "KUBERNETES") platform_dir="k8s" ;;
        "DOCKER_SWARM") platform_dir="swarm" ;;
        "DOCKER_COMPOSE") platform_dir="compose" ;;
        "SHELL") platform_dir="shell" ;;
        *)
            error "不支持的平台: ${env[cfg_build_platform]}"
            exit 1
            ;;
    esac

    # 查找中间件模板目录
    local middleware_template_dir
    middleware_template_dir=$(find_middleware_template_dir "$platform_dir" "$template_name")
    if [[ $? -ne 0 ]]; then
        error "找不到中间件模板: $template_name (平台: $platform_dir)"
        echo "请检查以下目录是否存在模板:"
        echo "  - workspace/${env[opt_workspace]}/templates/$platform_dir/middleware/$template_name/"
        echo "  - templates/$platform_dir/middleware/$template_name/"
        exit 1
    fi

    info "使用中间件模板: $middleware_template_dir"

    # 设置模板目录环境变量
    env[cfg_template_path]="$middleware_template_dir"

    # 跳过dockerfile选择，中间件使用模板部署
    info "中间件部署使用模板配置，跳过Dockerfile步骤"

    # 处理中间件特定参数
    process_middleware_variables "$template_name" "$instance_name"

    # 设置部署相关的环境变量
    env[cmd_job_name]="$instance_name"

    if [[ "${DEBUG}" == "true" ]]; then
        echo "DEBUG: 部署变量设置："
        echo "DEBUG: cfg_k8s_namespace=${env[cfg_k8s_namespace]}"
        echo "DEBUG: cmd_job_name=${env[cmd_job_name]}"
        echo "DEBUG: cfg_deploy_gen_location=${env[cfg_deploy_gen_location]}"
    fi

    # 渲染中间件模板（使用专门的中间件模板渲染器）
    render_middleware_template

    # 处理端口配置（如果用户指定了端口参数）
    local middleware_deploy_dir="$cfg_deploy_gen_location/middleware"
    local output_file="$middleware_deploy_dir/${cmd_job_name}.yml"
    enhance_multi_ports "$output_file"

    # 部署
    deploy

    # 输出连接信息
    show_middleware_connection_info "$template_name" "$instance_name"
}

function run_devops() {
  #检查docker环境
	check_env_by_cmd_v docker
  #检测前置参数（仅在非交互模式下）
	if [[ "${env[opt_interactive]}" != "true" ]]; then
		check_post_parmas
	fi
	#检查Harbor登录状态
	check_harbor_login_status
	#从版本管理工具加载代码
	scm
	#复制dockerfile文件
	choose_dockerfile
	#开始构建，构建不同的项目，java,vue,go等
	$1
	#预先创建Harbor Secret（如果启用Harbor且是K8s平台，仅本地部署）
	if [[ "${env[cfg_enable_harbor]}" == "1" && "${env[cfg_build_platform]}" == "KUBERNETES" && -z "${env[cfg_deploy_target]}" ]]; then
		create_k8s_harbor_secret
	fi
	#渲染模板
	render_template
	#执行部署
	deploy
	#清除冗余镜像
	prune

}


function scm() {
	cfg_temp_dir=${env[cfg_temp_dir]}
	opt_git_url=${env[opt_git_url]}
	opt_git_branch=${env[opt_git_branch]}
	opt_svn_url=${env[opt_svn_url]}
	opt_static_dir=${env[opt_static_dir]}

	# 支持本地静态资源目录或tar包，跳过SCM
	if [ -n "$opt_static_dir" ]; then
		# 确保目标目录干净
		if [ -d "$cfg_temp_dir" ]; then
			if [[ "${DEBUG}" == "true" ]]; then
				echo "DEBUG: 清理已存在的构建目录: $cfg_temp_dir"
			fi
			rm -rf "$cfg_temp_dir"
		fi
		mkdir -p "$cfg_temp_dir"

		# 检查是否为tar包文件
		if [[ -f "$opt_static_dir" && "$opt_static_dir" =~ \.(tar|tar\.gz|tar\.bz2|tgz|tbz2)$ ]]; then
			info "解压tar包文件: $opt_static_dir"

			# 根据文件类型解压到构建目录
			if [[ "$opt_static_dir" =~ \.(tar\.gz|tgz)$ ]]; then
				tar -xzf "$opt_static_dir" -C "$cfg_temp_dir"
			elif [[ "$opt_static_dir" =~ \.(tar\.bz2|tbz2)$ ]]; then
				tar -xjf "$opt_static_dir" -C "$cfg_temp_dir"
			elif [[ "$opt_static_dir" =~ \.tar$ ]]; then
				tar -xf "$opt_static_dir" -C "$cfg_temp_dir"
			fi

			# 智能处理目录结构：如果解压后只有一个目录，则提升其内容到根级别
			extract_contents=$(ls -A "$cfg_temp_dir")
			if [[ $(echo "$extract_contents" | wc -l) -eq 1 && -d "$cfg_temp_dir/$extract_contents" ]]; then
				info "检测到单一顶级目录，提升内容到根级别: $extract_contents"
				mv "$cfg_temp_dir/$extract_contents"/* "$cfg_temp_dir/"
				mv "$cfg_temp_dir/$extract_contents"/.[^.]* "$cfg_temp_dir/" 2>/dev/null || true
				rmdir "$cfg_temp_dir/$extract_contents"
			fi

			info "已解压到构建目录: $cfg_temp_dir"
		elif [ -d "$opt_static_dir" ]; then
			info "复制静态资源目录: $opt_static_dir"
			cp -r "$opt_static_dir"/* "$cfg_temp_dir/"
			# 复制隐藏文件
			cp -r "$opt_static_dir"/.[^.]* "$cfg_temp_dir/" 2>/dev/null || true
			info "已复制到构建目录: $cfg_temp_dir"
		else
			error "--static-dir 不存在或格式不支持: $opt_static_dir"; exit 1
		fi

		# 设置构建路径
		env[tmp_build_dist_path]="$cfg_temp_dir"
		# 生成镜像后缀（仅日期）
		date=`date +%Y-%m-%d_%H-%M-%S`
		env[tmp_docker_image_suffix]="${date}"
		return 0
	fi

	if [ -n "$opt_git_url" ]; then
		check_env_by_cmd_v git

		# 如果配置了 workspace 默认 Git 凭据，且为 HTTP(S) URL，则注入认证信息
		if [[ -n "${env[cfg_git_username]}" && -n "${env[cfg_git_password]}" && "$opt_git_url" =~ ^https?:// ]]; then
			url_no_scheme=${opt_git_url#http://}
			if [[ "$opt_git_url" == https://* ]]; then
				scheme="https://"
				url_no_scheme=${opt_git_url#https://}
			else
				scheme="http://"
			fi
			# 进行基本URL转义，只处理常见特殊字符
			enc_user=$(printf '%s' "${env[cfg_git_username]}" | sed -e 's/%/%25/g' -e 's/@/%40/g' -e 's/:/%3A/g')
			enc_pass=$(printf '%s' "${env[cfg_git_password]}" | sed -e 's/%/%25/g' -e 's/@/%40/g' -e 's/:/%3A/g')
			opt_git_url="${scheme}${enc_user}:${enc_pass}@${url_no_scheme}"
			info "已使用工作空间默认 Git 凭据进行认证"
		fi

		# 确保目标目录不存在，避免 "already exists and is not an empty directory" 错误
		if [ -d "$cfg_temp_dir" ]; then
			if [[ "${DEBUG}" == "true" ]]; then
				echo "DEBUG: 清理已存在的构建目录: $cfg_temp_dir"
			fi
			rm -rf "$cfg_temp_dir"
		fi

		#克隆代码
		if test -n "${opt_git_branch}" ; then
			info "开始使用git拉取代码,当前分支:${opt_git_branch}"
			real_branch=${opt_git_branch}
			echo "埋点:git的real_branch:$real_branch"
			git clone -b  ${real_branch}  --single-branch $opt_git_url  $cfg_temp_dir
		else
			info "开始使用git拉取代码,当前使用默认分支"
			git clone --single-branch $opt_git_url  $cfg_temp_dir
		fi
		cd $cfg_temp_dir
		#生成日期和git日志版本后六位
		date=`date +%Y-%m-%d_%H-%M-%S`
		last_log=`git log --pretty=format:%h | head -1`
		env[tmp_docker_image_suffix]="${date}_${last_log}"
		# 设置构建上下文路径
		env[tmp_build_dist_path]="$cfg_temp_dir"
	elif [ -n "$opt_svn_url" ]; then
		check_env_by_cmd_v svn

		# 确保目标目录不存在，避免SVN checkout冲突
		if [ -d "$cfg_temp_dir" ]; then
			if [[ "${DEBUG}" == "true" ]]; then
				echo "DEBUG: 清理已存在的构建目录: $cfg_temp_dir"
			fi
			rm -rf "$cfg_temp_dir"
		fi

		info '开始使用 svn 拉取代码'
		debug '此处忽略svn拉取日志'
		svn checkout -q $opt_svn_url $cfg_temp_dir
		cd $cfg_temp_dir
		date=`date +%Y-%m-%d_%H-%M-%S`
		tmp_log=`svn log | head -2 | tail -1`
		last_log=${tmp_log%% *}
		       env[tmp_docker_image_suffix]="${date}_${last_log}"
		# 设置构建上下文路径
		env[tmp_build_dist_path]="$cfg_temp_dir"
	else
		error "--git-url and --svn-url must has one"; exit 1;
	fi
}

function choose_dockerfile() {
	cmd_job_name=${env[cmd_job_name]}
	tmp_build_dist_path=${env[tmp_build_dist_path]}
	cfg_template_path=${env[cfg_template_path]}
	cfg_build_platform=${env[cfg_build_platform]}
	cmd_type=${env[cmd_2]}
	template_id=${env[opt_template]}

	if [[ "${DEBUG}" == "true" ]]; then
		echo "DEBUG: choose_dockerfile() - tmp_build_dist_path='$tmp_build_dist_path'"
		echo "DEBUG: choose_dockerfile() - cfg_template_path='$cfg_template_path'"
		echo "DEBUG: choose_dockerfile() - cmd_type='$cmd_type'"
	fi

	if [[ -z "$tmp_build_dist_path" ]]; then
		error "构建上下文路径为空，请检查代码拉取是否成功"
		exit 1
	fi

	# 预检构建产物目录
	if test ! -d ${tmp_build_dist_path} ; then
		error "please check scm url or job name(the last command),job name must be the module name"; exit 1;
	fi

	# 平台目录映射
	platform_dir=""
	case "$cfg_build_platform" in
		KUBERNETES) platform_dir="k8s" ;;
		DOCKER_SWARM) platform_dir="swarm" ;;
		DOCKER_COMPOSE) platform_dir="compose" ;;
             SHELL) platform_dir="shell" ;;
		*) error "unsupported platform: $cfg_build_platform"; exit 1;;
	esac

	# 模板名缺省映射
	if [ -z "$template_id" ]; then
		case "$cmd_type" in
			vue) template_id="vue-nginx" ;;
			nginx) template_id="nginx" ;;
			*) template_id="spring-boot" ;;
		esac
	fi

	# 使用新的模板查找逻辑
	template_dir=$(find_template_dir "$platform_dir" "$template_id")
	if [ $? -ne 0 ] || [ -z "$template_dir" ]; then
		error "模板不存在: $template_id (平台: $platform_dir)"; exit 1
	fi

	dockerfile_tpl="$template_dir/dockerfile"
	if [ ! -f "$dockerfile_tpl" ]; then
		error "模板 dockerfile 不存在: $dockerfile_tpl"; exit 1
	fi

	env[cfg_template_dir]="$template_dir"
	env[tmp_dockerfile]="$dockerfile_tpl"

	# 显示使用的模板类型
	if [[ "$template_dir" == "${env[cfg_workspace_template_path]}"* ]]; then
		info "使用workspace模板 dockerfile: $dockerfile_tpl"
	else
		info "使用全局模板 dockerfile: $dockerfile_tpl"
	fi

}


function enhance_service_nodeport() {
	local tmp_file=$1
	local expose_port="${env[opt_expose_port]}"
	local force_override="${env[opt_force_port]}"

	# 使用Python端口配置处理器
	info "使用Python端口配置处理器"

	# 检查Python环境
	if ! command -v python3 &> /dev/null; then
		error "Python3 未安装，无法使用端口配置处理器"; exit 1
	fi

	# 检查PyYAML依赖
	if ! python3 -c "import yaml" &> /dev/null; then
		warn "PyYAML 未安装，尝试安装..."
		if command -v pip3 &> /dev/null; then
			pip3 install PyYAML
		else
			error "pip3 未安装，无法安装PyYAML依赖"; exit 1
		fi
	fi

	# 调用Python端口配置处理器
	local python_script="${BUILD_SCRIPT_DIR}/port_config_handler.py"
	if [ ! -f "$python_script" ]; then
		error "Python端口配置处理器不存在: $python_script"; exit 1
	fi

	# 构建Python处理器参数
	local python_args=(
		"$python_script"
		"--yaml-file" "$tmp_file"
	)

	# 添加端口参数
	if [ -n "$expose_port" ]; then
		python_args+=("--expose-port" "$expose_port")
	fi

	# 添加强制覆盖参数
	if [ "$force_override" = "true" ]; then
		python_args+=("--force-port")
	fi

	# 执行Python端口配置处理
	if python3 "${python_args[@]}"; then
		success "端口配置处理成功"
	else
		error "端口配置处理失败"; exit 1
	fi
}

# 处理多端口配置
function enhance_multi_ports() {
	local tmp_file=$1
	local service_port="${env[opt_service_port]}"
	local export_port="${env[opt_export_port]}"

	# 如果没有多端口配置，跳过
	if [[ -z "$service_port" && -z "$export_port" ]]; then
		return 0
	fi

	info "处理多端口配置"

	# 检查Python环境
	if ! command -v python3 &> /dev/null; then
		error "Python3 未安装，无法使用多端口配置处理器"; exit 1
	fi

	# 检查PyYAML依赖
	if ! python3 -c "import yaml" &> /dev/null; then
		warn "PyYAML 未安装，尝试安装..."
		if command -v pip3 &> /dev/null; then
			pip3 install PyYAML
		else
			error "pip3 未安装，无法安装PyYAML依赖"; exit 1
		fi
	fi

	# 调用统一端口配置处理器
	local python_script="${BUILD_SCRIPT_DIR}/port_config_handler.py"
	if [ ! -f "$python_script" ]; then
		error "端口配置处理器不存在: $python_script"; exit 1
	fi

	# 构建Python处理器参数
	local python_args=(
		"$python_script"
		"--yaml-file" "$tmp_file"
	)

	# 添加服务端口参数
	if [ -n "$service_port" ]; then
		python_args+=("--service-port" "$service_port")
		info "配置服务端口: $service_port"
	fi

	# 添加导出端口参数
	if [ -n "$export_port" ]; then
		python_args+=("--export-port" "$export_port")
		info "配置导出端口: $export_port"
	fi

	# 执行多端口配置处理
	if python3 "${python_args[@]}"; then
		success "多端口配置处理成功"
	else
		error "多端口配置处理失败"; exit 1
	fi
}

function render_template() {
	opt_template=${env[opt_template]}
	cfg_swarm_network=${env[cfg_swarm_network]}
	cfg_template_path=${env[cfg_template_path]}
	cfg_deploy_gen_location=${env[cfg_deploy_gen_location]}
	cmd_job_name=${env[cmd_job_name]}
	tmp_image_path=${env[tmp_image_path]}
	cfg_k8s_namespace=${env[cfg_k8s_namespace]}
	cfg_build_platform=${env[cfg_build_platform]}
	cmd_type=${env[cmd_2]}
	cfg_harbor_secret_name=${env[cfg_harbor_secret_name]}

	# 平台目录
	platform_dir=""
	case "$cfg_build_platform" in
		KUBERNETES) platform_dir="k8s" ;;
		DOCKER_SWARM) platform_dir="swarm" ;;
		DOCKER_COMPOSE) platform_dir="compose" ;;
            SHELL) platform_dir="shell" ;;
		*) error "unsupported platform: $cfg_build_platform"; exit 1;;
	esac

	# 模板名
	template_id="$opt_template"
	if [ -z "$template_id" ]; then
		case "$cmd_type" in
			vue) template_id="vue-nginx" ;;
			*) template_id="spring-boot" ;;
		esac
	fi

	# 使用新的模板查找逻辑
	template_dir=$(find_template_dir "$platform_dir" "$template_id")
	if [ $? -ne 0 ] || [ -z "$template_dir" ]; then
		error "模板不存在: $template_id (平台: $platform_dir)"; exit 1
	fi

	deploy_tpl="$template_dir/deploy.yaml"
	if [ ! -f "$deploy_tpl" ]; then
		error "模板 deploy.yaml 不存在: $deploy_tpl"; exit 1
	fi

	# 显示使用的模板类型
	if [[ "$template_dir" == "${env[cfg_workspace_template_path]}"* ]]; then
		info "使用workspace模板: $template_dir"
	else
		info "使用全局模板: $template_dir"
	fi

	# 使用Python模板渲染器替代sed
	info "使用Python模板渲染器处理模板"
	
	# 检查Python环境
	if ! command -v python3 &> /dev/null; then
		error "Python3 未安装，无法使用模板渲染器"; exit 1
	fi
	
	# 检查PyYAML依赖
	if ! python3 -c "import yaml" &> /dev/null; then
		warn "PyYAML 未安装，尝试安装..."
		if command -v pip3 &> /dev/null; then
			pip3 install PyYAML
		else
			error "pip3 未安装，无法安装PyYAML依赖"; exit 1
		fi
	fi
	
	# 准备渲染参数
	local app_port="${env[opt_app_port]:-80}"  # 默认80
	local java_opts="${env[opt_java_opts]:-}"
	local enable_harbor="${env[cfg_enable_harbor]:-0}"
	
	# 检查是否是中间件部署，如果是且包含Jinja2语法，使用专门的渲染器
	if [[ "${env[cmd_type]}" == "middleware" ]] && grep -q "{{.*}}\|{%.*%}" "$deploy_tpl"; then
		info "检测到中间件Jinja2模板，使用专门的渲染器"
		render_middleware_jinja2 "$deploy_tpl" "$cfg_deploy_gen_location/${cmd_job_name}.yml"
		return
	fi

	# 调用Python模板渲染器
	local python_script="${BUILD_SCRIPT_DIR}/template_renderer.py"
	if [ ! -f "$python_script" ]; then
		error "Python模板渲染器不存在: $python_script"; exit 1
	fi
	
	# 确保应用部署目录存在
	local app_deploy_dir="$cfg_deploy_gen_location/app"
	if [ ! -d "$app_deploy_dir" ]; then
		mkdir -p "$app_deploy_dir"
	fi

	# 构建Python渲染器参数
	local python_args=(
		"$python_script"
		"--template" "$deploy_tpl"
		"--output" "$app_deploy_dir/${cmd_job_name}.yml"
		"--module-name" "$cmd_job_name"
		"--image-path" "$tmp_image_path"
		"--namespace" "$cfg_k8s_namespace"
		"--app-port" "$app_port"
		"--build-platform" "$cfg_build_platform"
	)

	# 仅在非空时追加 --java-opts，避免空值触发解析错误
	# 注意：当值以 "--" 开头时，必须使用等号内联形式，避免被 argparse 误当作新选项
	if [ -n "$java_opts" ]; then
		python_args+=("--java-opts=$java_opts")
	fi
	
	# 添加网络参数（仅Docker Swarm）
	if [ "$cfg_build_platform" = "DOCKER_SWARM" ] && [ -n "$cfg_swarm_network" ]; then
		python_args+=("--network" "$cfg_swarm_network")
	fi
	
	# 添加Harbor相关参数
	if [ "$enable_harbor" = "1" ] && [ -n "$cfg_harbor_secret_name" ]; then
		python_args+=("--enable-harbor" "--harbor-secret-name" "$cfg_harbor_secret_name")
	fi
	
	# 添加验证参数
	python_args+=("--validate")
	
	# 确保输出目录存在
	if [ ! -d "$cfg_deploy_gen_location" ]; then
		mkdir -p "$cfg_deploy_gen_location"
	fi
	
	# 执行Python模板渲染
	# 调试输出：展示将要传递的 JAVA_OPTS 与渲染器参数
	info "Renderer java_opts: ${java_opts}"
	info "Renderer argv: ${python_args[@]}"
	if python3 "${python_args[@]}"; then
		success "应用模板渲染成功: $app_deploy_dir/${cmd_job_name}.yml"
	else
		error "模板渲染失败"; exit 1
	fi
	
	# 处理NodePort动态注入 (仅K8s平台)
	if [[ "$cfg_build_platform" == "KUBERNETES" ]]; then
		# 优先处理多端口配置
		enhance_multi_ports "$app_deploy_dir/${cmd_job_name}.yml"

		# 如果没有多端口配置，使用传统的单端口处理
		if [[ -z "${env[opt_service_port]}" && -z "${env[opt_export_port]}" ]]; then
			enhance_service_nodeport "$app_deploy_dir/${cmd_job_name}.yml"
		fi
	fi
}

# 中间件模板渲染函数（支持Jinja2）
function render_middleware_template() {
    local cfg_template_path="${env[cfg_template_path]}"
    local cfg_deploy_gen_location="${env[cfg_deploy_gen_location]}"
    local cmd_job_name="${env[cmd_job_name]}"

    if [[ "${DEBUG}" == "true" ]]; then
        echo "DEBUG: 开始渲染中间件模板"
        echo "DEBUG: template_path='$cfg_template_path'"
        echo "DEBUG: output_location='$cfg_deploy_gen_location'"
    fi

    # 查找模板文件（按优先级查找）
    local deploy_tpl=""
    local template_type=""

    # 1. 优先查找 Jinja2 模板
    if [ -f "$cfg_template_path/deploy.yaml.j2" ]; then
        deploy_tpl="$cfg_template_path/deploy.yaml.j2"
        template_type="jinja2"
    # 2. 其次查找占位符模板
    elif [ -f "$cfg_template_path/deploy.yaml.tpl" ]; then
        deploy_tpl="$cfg_template_path/deploy.yaml.tpl"
        template_type="placeholder"
    # 3. 最后查找普通YAML文件（向后兼容）
    elif [ -f "$cfg_template_path/deploy.yaml" ]; then
        deploy_tpl="$cfg_template_path/deploy.yaml"
        # 检测文件内容确定类型
        if grep -q "{{.*}}\|{%.*%}" "$deploy_tpl"; then
            template_type="jinja2"
        else
            template_type="placeholder"
        fi
    else
        error "未找到中间件模板文件，支持的文件名："
        error "  - deploy.yaml.j2 (Jinja2模板)"
        error "  - deploy.yaml.tpl (占位符模板)"
        error "  - deploy.yaml (自动检测)"
        exit 1
    fi

    info "渲染中间件模板: $deploy_tpl (类型: $template_type)"

    # 确保中间件部署目录存在
    local middleware_deploy_dir="$cfg_deploy_gen_location/middleware"
    if [ ! -d "$middleware_deploy_dir" ]; then
        mkdir -p "$middleware_deploy_dir"
    fi

    local output_file="$middleware_deploy_dir/${cmd_job_name}.yml"

    # 根据模板类型选择渲染器
    case "$template_type" in
        "jinja2")
            info "使用Jinja2渲染器"
            render_with_jinja2 "$deploy_tpl" "$output_file"
            ;;
        "placeholder")
            info "使用占位符渲染器"
            render_with_placeholders "$deploy_tpl" "$output_file"
            ;;
        *)
            error "未知的模板类型: $template_type"
            exit 1
            ;;
    esac

    success "中间件模板渲染成功: $output_file"
}

# 使用Jinja2渲染器
function render_with_jinja2() {
    local template_file="$1"
    local output_file="$2"

    # 检查Python环境
    if ! command -v python3 &> /dev/null; then
        error "Python3 未安装，无法使用Jinja2渲染器"
        exit 1
    fi

    # 检查Jinja2依赖
    if ! python3 -c "import jinja2" &> /dev/null; then
        warn "Jinja2 未安装，尝试安装..."
        if command -v pip3 &> /dev/null; then
            pip3 install Jinja2 PyYAML
        else
            error "pip3 未安装，无法安装Jinja2依赖"
            exit 1
        fi
    fi

    # 调用动态Python Jinja2渲染器
    local python_script="${BUILD_SCRIPT_DIR}/dynamic_middleware_renderer.py"
    if [ ! -f "$python_script" ]; then
        error "动态中间件渲染器不存在: $python_script"
        exit 1
    fi

    # 构建渲染器参数
    local python_args=(
        "$python_script"
        "--template" "$template_file"
        "--output" "$output_file"
        "--validate"
    )

    # 添加所有中间件变量作为参数
    add_middleware_jinja2_variables "python_args"

    # 调试信息
    if [[ "${DEBUG}" == "true" ]]; then
        echo "DEBUG: Python渲染器参数:"
        for arg in "${python_args[@]}"; do
            echo "DEBUG:   $arg"
        done
    fi

    # 执行渲染
    if python3 "${python_args[@]}"; then
        success "Jinja2模板渲染成功"
    else
        error "Jinja2模板渲染失败"
        exit 1
    fi
}

# 预渲染指定目录下的所有 Jinja2(.j2) 与占位符(.tpl) 模板到同名无后缀文件
function prerender_all_templates_in_dir() {
    local dir="$1"
    local out_dir="${env[cfg_deploy_gen_location]}"
    if [[ -z "$dir" || ! -d "$dir" ]]; then
        return 0
    fi
    if [[ -z "$out_dir" ]]; then
        warn "预渲染输出目录未设置(cgf_deploy_gen_location)"; return 0
    fi
    mkdir -p "$out_dir"
    shopt -s nullglob
    local rendered_count=0
    local copied_count=0
    local f
    # .j2 → render_with_jinja2
    for f in "$dir"/*.j2; do
        local base_name="$(basename "${f%.j2}")"
        local out_file="$out_dir/$base_name"
        info "预渲染 Jinja2: $(basename "$f") -> $(basename "$out_file")"
        render_with_jinja2 "$f" "$out_file" || { warn "预渲染失败: $f"; }
        rendered_count=$((rendered_count+1))
    done
    # .tpl → render_with_placeholders
    for f in "$dir"/*.tpl; do
        local base_name="$(basename "${f%.tpl}")"
        local out_file="$out_dir/$base_name"
        info "预渲染占位符: $(basename "$f") -> $(basename "$out_file")"
        render_with_placeholders "$f" "$out_file" || { warn "预渲染失败: $f"; }
        rendered_count=$((rendered_count+1))
    done
    # 复制其他普通文件到部署目录（排除 .j2/.tpl）
    for f in "$dir"/*; do
        if [[ -f "$f" && "$f" != *.j2 && "$f" != *.tpl ]]; then
            local target="$out_dir/$(basename "$f")"
            cp -f "$f" "$target" && copied_count=$((copied_count+1))
        fi
    done
    shopt -u nullglob
    if [[ $rendered_count -gt 0 || $copied_count -gt 0 ]]; then
        success "已预渲染/复制模板文件: 渲染 $rendered_count 个, 复制 $copied_count 个"
    fi
}

# 动态添加所有中间件变量到Jinja2渲染器参数
function add_middleware_jinja2_variables() {
    local args_var_name="$1"

    if [[ "${DEBUG}" == "true" ]]; then
        echo "DEBUG: 动态添加中间件变量到Jinja2参数"
    fi

    # 遍历所有middleware_开头的环境变量
    for key in "${!env[@]}"; do
        if [[ "$key" =~ ^middleware_ ]]; then
            local var_value="${env[$key]}"

            # 跳过空值（但保留调试信息）
            if [[ -z "$var_value" ]]; then
                if [[ "${DEBUG}" == "true" ]]; then
                    echo "DEBUG: 跳过空值变量: $key"
                fi
                continue
            fi

            # 提取变量名（移除middleware_前缀）
            local var_name="${key#middleware_}"

            # 跳过与Python渲染器基础参数冲突的变量，以及特殊处理的变量
            case "$var_name" in
                template|output|validate)
                    if [[ "${DEBUG}" == "true" ]]; then
                        echo "DEBUG: 跳过冲突参数: $var_name"
                    fi
                    continue
                    ;;
            esac

            # 特殊处理：namespace 使用 cfg_k8s_namespace 的值
            if [[ "$var_name" == "namespace" ]]; then
                var_value="${env[cfg_k8s_namespace]}"
                if [[ "${DEBUG}" == "true" ]]; then
                    echo "DEBUG: 特殊处理 namespace: 使用 cfg_k8s_namespace=$var_value"
                fi
            fi

            # 将下划线转换为连字符（符合命令行参数约定）
            local param_name="${var_name//_/-}"

            # 添加到参数数组
            eval "${args_var_name}+=(\"--${param_name}\" \"${var_value}\")"

            if [[ "${DEBUG}" == "true" ]]; then
                echo "DEBUG: 添加参数: --${param_name} = ${var_value}"
            fi
        fi
    done
}

# 使用简单占位符渲染
function render_with_placeholders() {
    local template_file="$1"
    local output_file="$2"

    # 读取模板内容
    local template_content
    template_content=$(cat "$template_file")

    # 替换占位符变量
    template_content=$(render_middleware_placeholders "$template_content")

    # 写入渲染后的文件
    echo "$template_content" > "$output_file"
}

# 动态替换中间件模板中的占位符
function render_middleware_placeholders() {
    local content="$1"

    if [[ "${DEBUG}" == "true" ]]; then
        echo "DEBUG: 开始动态占位符替换"
    fi

    # 动态替换所有 ?variable 占位符
    for key in "${!env[@]}"; do
        if [[ "$key" =~ ^middleware_ ]]; then
            local var_value="${env[$key]}"

            # 跳过空值
            if [[ -z "$var_value" ]]; then
                continue
            fi

            # 提取变量名（移除middleware_前缀）
            local var_name="${key#middleware_}"

            # 替换 ?variable 占位符
            local placeholder="?${var_name}"
            content="${content//$placeholder/$var_value}"

            if [[ "${DEBUG}" == "true" ]]; then
                echo "DEBUG: 替换占位符: $placeholder = $var_value"
            fi
        fi
    done

    # 自动计算资源请求值
    if [[ -n "${env[middleware_memory_limit]}" ]]; then
        local memory_request cpu_request cpu_limit
        memory_request=$(calculate_memory_request "${env[middleware_memory_limit]}")
        cpu_request="100m"
        cpu_limit="500m"

        # 替换计算出的资源值
        content="${content//\?memory_request/$memory_request}"
        content="${content//\?cpu_request/$cpu_request}"
        content="${content//\?cpu_limit/$cpu_limit}"

        if [[ "${DEBUG}" == "true" ]]; then
            echo "DEBUG: 计算资源: memory_request=$memory_request, cpu_request=$cpu_request, cpu_limit=$cpu_limit"
        fi
    fi

    echo "$content"
}

# 计算内存请求值的辅助函数
function calculate_memory_request() {
    local memory_limit="$1"
    local memory_request

    if [[ "$memory_limit" =~ ^([0-9]+)([MG])i$ ]]; then
        local value="${BASH_REMATCH[1]}"
        local unit="${BASH_REMATCH[2]}"
        local request_value=$((value * 7 / 10))
        memory_request="${request_value}${unit}i"
    else
        memory_request="256Mi"
    fi

    echo "$memory_request"
}

# 处理简化的Jinja2语法
function process_jinja2_syntax() {
    local content="$1"

    # 处理简单的if条件语句
    # {% if variable %}...{% endif %}
    while [[ "$content" =~ \{\%[[:space:]]*if[[:space:]]+([^[:space:]]+)[[:space:]]*\%\}(.*?)\{\%[[:space:]]*endif[[:space:]]*\%\} ]]; do
        local var_name="${BASH_REMATCH[1]}"
        local if_content="${BASH_REMATCH[2]}"
        local full_match="${BASH_REMATCH[0]}"

        # 动态检查变量是否存在且非空
        local var_value=""
        local middleware_key="middleware_${var_name}"

        # 首先检查middleware_前缀的变量
        if [[ -n "${env[$middleware_key]}" ]]; then
            var_value="${env[$middleware_key]}"
        # 然后检查opt_前缀的变量（向后兼容）
        elif [[ -n "${env[opt_${var_name}]}" ]]; then
            var_value="${env[opt_${var_name}]}"
        fi

        if [[ "${DEBUG}" == "true" ]]; then
            echo "DEBUG: 检查条件变量: $var_name = $var_value"
        fi

        if [[ -n "$var_value" && "$var_value" != "auto-generate" ]]; then
            # 条件为真，保留内容
            content="${content//$full_match/$if_content}"
        else
            # 条件为假，移除整个块
            content="${content//$full_match/}"
        fi
    done

    # 动态处理变量替换 {{ variable }}
    for key in "${!env[@]}"; do
        if [[ "$key" =~ ^middleware_ ]]; then
            local var_value="${env[$key]}"

            # 跳过空值
            if [[ -z "$var_value" ]]; then
                continue
            fi

            # 提取变量名（移除middleware_前缀）
            local var_name="${key#middleware_}"

            # 替换 {{ variable }} 模式（支持空格）
            local pattern="\{\{[[:space:]]*${var_name}[[:space:]]*\}\}"
            content="${content//$pattern/$var_value}"

            if [[ "${DEBUG}" == "true" ]]; then
                echo "DEBUG: 替换Jinja2变量: {{ $var_name }} = $var_value"
            fi
        fi
    done

    # 处理过滤器 {{ variable | filter }}
    # 例如: {{ redis_password | b64encode }}
    while [[ "$content" =~ \{\{[[:space:]]*([^[:space:]|]+)[[:space:]]*\|[[:space:]]*([^[:space:]]+)[[:space:]]*\}\} ]]; do
        local var_name="${BASH_REMATCH[1]}"
        local filter_name="${BASH_REMATCH[2]}"
        local full_match="${BASH_REMATCH[0]}"

        # 动态获取变量值
        local var_value=""
        local middleware_key="middleware_${var_name}"

        if [[ -n "${env[$middleware_key]}" ]]; then
            var_value="${env[$middleware_key]}"
        else
            var_value="$var_name"  # 如果找不到变量，保持原样
        fi

        # 应用过滤器
        local filtered_value
        case "$filter_name" in
            "b64encode")
                filtered_value=$(echo -n "$var_value" | base64 -w 0 2>/dev/null || echo -n "$var_value" | base64)
                ;;
            *)
                filtered_value="$var_value"
                ;;
        esac

        content="${content//$full_match/$filtered_value}"
    done

    echo "$content"
}

# 获取部署文件路径的辅助函数
function get_deploy_file_path() {
    local cfg_deploy_gen_location=${env[cfg_deploy_gen_location]}
    local cmd_job_name=${env[cmd_job_name]}
    local cmd_2=${env[cmd_2]}

    # 根据部署类型确定子目录
    if [[ "$cmd_2" == "middleware" ]]; then
        echo "$cfg_deploy_gen_location/middleware/${cmd_job_name}.yml"
    else
        echo "$cfg_deploy_gen_location/app/${cmd_job_name}.yml"
    fi
}

function deploy() {
        cfg_deploy_target=${env[cfg_deploy_target]}
	if test -z "$cfg_deploy_target"  ; then
		info "执行本地部署"
		local_deploy
	else
		echo "执行远程部署"
		remote_deploy
	fi

}

function local_deploy() {
  	cfg_devops_path=${env[cfg_devops_path]}
    cfg_build_platform=${env[cfg_build_platform]}
    cfg_swarm_stack_name=${env[cfg_swarm_stack_name]}
	cfg_deploy_gen_location=${env[cfg_deploy_gen_location]}
    cmd_job_name=${env[cmd_job_name]}
    cfg_k8s_namespace=${env[cfg_k8s_namespace]}

	deploy_job_yml=$(get_deploy_file_path)
        #创建或者更新镜像
        if [ "$cfg_build_platform" = "KUBERNETES" ]
        then
                check_env_by_cmd_v kubectl
                info "开始使用k8s部署服务到namespace: ${cfg_k8s_namespace}"
                # 确保namespace存在
                if [[ -z "${cfg_k8s_namespace}" ]]; then
                    error "命名空间变量为空，请检查配置"
                    exit 1
                fi

                if ! kubectl get namespace ${cfg_k8s_namespace} >/dev/null 2>&1; then
                    info "创建命名空间: ${cfg_k8s_namespace}"
                    kubectl create namespace ${cfg_k8s_namespace}
                else
                    info "命名空间已存在: ${cfg_k8s_namespace}"
                fi
                if [[ -f $deploy_job_yml ]]; then
                    # 检查部署是否已经存在
                    if kubectl get -f ${deploy_job_yml} -n ${cfg_k8s_namespace} >/dev/null 2>&1; then
                        info "服务已存在，先删除再重新部署"
                        kubectl delete -f ${deploy_job_yml} -n ${cfg_k8s_namespace}
                        kubectl apply -f ${deploy_job_yml} -n ${cfg_k8s_namespace}
                    else
                        info "服务不存在，直接部署"
                        kubectl apply -f ${deploy_job_yml} -n ${cfg_k8s_namespace}
                    fi
                else
                    error "部署文件不存在: $deploy_job_yml"
                    exit 1
                fi
        elif [ "$cfg_build_platform" = "DOCKER_SWARM" ]
        then
                info "开始使用docker swarm部署服务"
                docker stack deploy -c ${deploy_job_yml} ${cfg_swarm_stack_name}  --with-registry-auth
        elif [ "$cfg_build_platform" = "DOCKER_COMPOSE" ]
        then
                check_env_by_cmd_v docker-compose
                info "開始使用docker-compose 部署服務"
                last_pwd=$PWD
                # 進入docker文件
                compose_path=$cfg_deploy_gen_location/$cmd_job_name
                if [[ ! -d $compose_path ]]
                then
                  mkdir $compose_path
                fi
                cd $compose_path
                if [[ -f "./docker-compose.yml" ]]
                then
                  docker-compose down
                fi
                cp -f $deploy_job_yml "./docker-compose.yml"
                docker-compose up -d
                cd $last_pwd
        fi

}

function remote_deploy() {

	cfg_devops_path=${env[cfg_devops_path]}
    cfg_build_platform=${env[cfg_build_platform]}
    cfg_swarm_stack_name=${env[cfg_swarm_stack_name]}
	cfg_deploy_target=${env[cfg_deploy_target]}
	cfg_deploy_gen_location=${env[cfg_deploy_gen_location]}
    cmd_job_name=${env[cmd_job_name]}
    cfg_k8s_namespace=${env[cfg_k8s_namespace]}

	deploy_job_yml=$(get_deploy_file_path)

        array=(${cfg_deploy_target//:/ })
        user=${array[0]}
        ip=${array[1]}
        password=${array[2]}

        if test -z "$user" -o -z "$ip" -o -z "$password" ; then
                error '执行远程构建，deploy_target的配置不正确'
                exit 1
        fi


        #创建或者更新镜像
        if [ "$cfg_build_platform" = "KUBERNETES" ]
        then
                info "开始使用k8s部署服务到namespace: ${cfg_k8s_namespace}"
                # 构建远程命令：创建namespace + 创建Harbor Secret + 部署应用
                local harbor_secret_cmd=""
                if [[ "${env[cfg_enable_harbor]}" == "1" && -n "${env[cfg_harbor_address]}" && -n "${env[cfg_harbor_username]}" && -n "${env[cfg_harbor_password]}" ]]; then
                    local secret_name="harbor-registry-${env[cfg_k8s_namespace]}"
                    # 设置secret名称，供模板渲染器使用
                    env[cfg_harbor_secret_name]="$secret_name"
                    harbor_secret_cmd="kubectl get secret $secret_name -n ${env[cfg_k8s_namespace]} >/dev/null 2>&1 || kubectl create secret docker-registry $secret_name --docker-server=${env[cfg_harbor_address]} --docker-username=${env[cfg_harbor_username]} --docker-password=${env[cfg_harbor_password]} --namespace=${env[cfg_k8s_namespace]} >/dev/null 2>&1;"
                fi
		remote_command="ssh $user@$ip 'kubectl get namespace ${cfg_k8s_namespace} >/dev/null 2>&1 || kubectl create namespace ${cfg_k8s_namespace}; $harbor_secret_cmd' && cat $deploy_job_yml | ssh $user@$ip 'kubectl apply -f -'"
        elif [ "$cfg_build_platform" = "DOCKER_SWARM" ]
        then
                info "开始使用docker swarm部署服务"
		remote_command="cat $deploy_job_yml | ssh $user@$ip 'docker stack deploy -c - ${cfg_swarm_stack_name} --with-registry-auth'"
        else
                info "开始使用docker swarm部署服务"
		remote_command="cat $deploy_job_yml | ssh $user@$ip 'docker stack deploy -c - ${cfg_swarm_stack_name} --with-registry-auth'"
        fi

	remote_common_command="echo 'start prune remote images:';docker image prune -af --filter='label=maintainer=corp'"

	remote_command="$remote_command;$remote_common_command"

	expect << EOF

	spawn bash -c "$remote_command"
	expect {
	"yes/no" {send "yes\r"; exp_continue}
	"password" {send "$password\r"}
	}
	expect eof

EOF
}


function prune() {
	cfg_devops_path=${env[cfg_devops_path]}
	cfg_temp_dir=${env[cfg_temp_dir]}

	#删除源代码
	cd $cfg_devops_path

	if [[ -n ${cfg_temp_dir} && ${cfg_temp_dir} != '/' && ${cfg_temp_dir} != '.' ]]
	then
	 rm -rf $cfg_temp_dir
  fi
	#!清除没有运行的无用镜像
	echo 'start prune local images:'
	docker image prune -af --filter="label=maintainer=corp" --filter="until=24h"
}

# 动态扫描可用的中间件模板
function list_available_middleware_templates() {
    local platform_dir
    case "${env[cfg_build_platform]}" in
        "KUBERNETES") platform_dir="k8s" ;;
        "DOCKER_SWARM") platform_dir="swarm" ;;
        "DOCKER_COMPOSE") platform_dir="compose" ;;
        "SHELL") platform_dir="shell" ;;
        *) platform_dir="k8s" ;;
    esac

    local templates_dir="${DEVOPS_ROOT}/templates/${platform_dir}/middleware"
    local templates=()
    local template_descriptions=()

    if [[ "${DEBUG}" == "true" ]]; then
        echo "DEBUG: 扫描模板目录: $templates_dir"
        echo "DEBUG: DEVOPS_ROOT=$DEVOPS_ROOT"
        echo "DEBUG: platform_dir=$platform_dir"
    fi

    if [[ -d "$templates_dir" ]]; then
        if [[ "${DEBUG}" == "true" ]]; then
            echo "DEBUG: 模板目录存在，开始扫描..."
        fi

        for template_dir in "$templates_dir"/*; do
            if [[ -d "$template_dir" ]]; then
                local template_name=$(basename "$template_dir")
                local metadata_file="$template_dir/metadata.yaml"
                local description="未知描述"

                if [[ "${DEBUG}" == "true" ]]; then
                    echo "DEBUG: 找到模板目录: $template_name"
                fi

                if [[ -f "$metadata_file" ]]; then
                    # 提取描述信息
                    description=$(grep "^description:" "$metadata_file" | sed 's/description:[[:space:]]*["'"'"']*\([^"'"'"']*\)["'"'"']*/\1/')
                    if [[ "${DEBUG}" == "true" ]]; then
                        echo "DEBUG: 读取到描述: $description"
                    fi
                fi

                templates+=("$template_name")
                template_descriptions+=("$description")
            fi
        done
    else
        if [[ "${DEBUG}" == "true" ]]; then
            echo "DEBUG: 模板目录不存在: $templates_dir"
        fi
    fi

    # 返回模板列表（通过全局变量）
    available_templates=("${templates[@]}")
    available_descriptions=("${template_descriptions[@]}")
}

# 解析模板元数据中的变量定义
function parse_template_variables() {
    local template_name="$1"
    local platform_dir
    case "${env[cfg_build_platform]}" in
        "KUBERNETES") platform_dir="k8s" ;;
        "DOCKER_SWARM") platform_dir="swarm" ;;
        "DOCKER_COMPOSE") platform_dir="compose" ;;
        "SHELL") platform_dir="shell" ;;
        *) platform_dir="k8s" ;;
    esac

    local template_dir="${DEVOPS_ROOT}/templates/${platform_dir}/middleware/${template_name}"
    local metadata_file="$template_dir/metadata.yaml"

    if [[ ! -f "$metadata_file" ]]; then
        warn "模板元数据文件不存在: $metadata_file"
        return 1
    fi

    # 清空之前的变量定义
    template_variables=()

    # 解析 variables 部分
    local in_variables=false
    local current_var=""
    local var_name=""
    local var_type=""
    local var_default=""
    local var_description=""
    local var_required="false"

    while IFS= read -r line; do
        # 检测 variables 部分开始
        if [[ "$line" =~ ^variables:[[:space:]]*$ ]]; then
            in_variables=true
            continue
        fi

        # 如果不在 variables 部分，跳过
        if [[ "$in_variables" != "true" ]]; then
            continue
        fi

        # 检测 variables 部分结束（下一个顶级键）
        if [[ "$line" =~ ^[a-zA-Z_][a-zA-Z0-9_]*:[[:space:]]* && ! "$line" =~ ^[[:space:]]+ ]]; then
            in_variables=false
            break
        fi

        # 解析变量项
        if [[ "$line" =~ ^[[:space:]]*-[[:space:]]*name:[[:space:]]*[\"\']*([^\"\']+)[\"\']*[[:space:]]*$ ]]; then
            # 保存上一个变量
            if [[ -n "$var_name" ]]; then
                template_variables+=("$var_name|$var_type|$var_default|$var_description|$var_required")
            fi

            # 开始新变量
            var_name="${BASH_REMATCH[1]}"
            var_type="string"
            var_default=""
            var_description=""
            var_required="false"
        elif [[ "$line" =~ ^[[:space:]]+type:[[:space:]]*[\"\']*([^\"\']+)[\"\']*[[:space:]]*$ ]]; then
            var_type="${BASH_REMATCH[1]}"
        elif [[ "$line" =~ ^[[:space:]]+default:[[:space:]]*[\"\']*([^\"\']*)[\"\']*[[:space:]]*$ ]]; then
            var_default="${BASH_REMATCH[1]}"
        elif [[ "$line" =~ ^[[:space:]]+default:[[:space:]]*([0-9]+)[[:space:]]*$ ]]; then
            var_default="${BASH_REMATCH[1]}"
        elif [[ "$line" =~ ^[[:space:]]+description:[[:space:]]*[\"\']*([^\"\']*)[\"\']*[[:space:]]*$ ]]; then
            var_description="${BASH_REMATCH[1]}"
        elif [[ "$line" =~ ^[[:space:]]+required:[[:space:]]*(true|false)[[:space:]]*$ ]]; then
            var_required="${BASH_REMATCH[1]}"
        fi
    done < "$metadata_file"

    # 保存最后一个变量
    if [[ -n "$var_name" ]]; then
        template_variables+=("$var_name|$var_type|$var_default|$var_description|$var_required")
    fi

    if [[ "${DEBUG}" == "true" ]]; then
        echo "DEBUG: 解析到 ${#template_variables[@]} 个变量"
        for var in "${template_variables[@]}"; do
            echo "DEBUG: 变量: $var"
        done
    fi
}

# 根据模板变量定义收集用户输入
function collect_template_variables() {
    local template_name="$1"

    # 解析模板变量
    parse_template_variables "$template_name"

    if [[ ${#template_variables[@]} -eq 0 ]]; then
        info "该模板没有可配置的变量，使用默认配置"
        return
    fi

    echo
    info "📋 配置模板变量 ($template_name)"
    echo

    # 遍历每个变量，收集用户输入
    for var_def in "${template_variables[@]}"; do
        IFS='|' read -r var_name var_type var_default var_description var_required <<< "$var_def"

        # 构建提示信息
        local prompt="🔹 $var_description"
        local is_required=true

        if [[ -n "$var_default" ]]; then
            prompt="$prompt (默认: $var_default)"
            is_required=false
        elif [[ "$var_required" != "true" ]]; then
            is_required=false
        fi

        prompt="$prompt: "

        # 收集用户输入
        while true; do
            read -p "$prompt" user_input

            # 如果用户直接回车且有默认值，使用默认值
            if [[ -z "$user_input" && -n "$var_default" ]]; then
                user_input="$var_default"
            fi

            # 检查必填项
            if [[ -z "$user_input" && "$is_required" == "true" ]]; then
                warn "该项为必填项，请输入值"
                continue
            fi

            # 类型验证
            if [[ -n "$user_input" ]]; then
                case "$var_type" in
                    "integer")
                        if ! [[ "$user_input" =~ ^[0-9]+$ ]]; then
                            warn "请输入有效的整数"
                            continue
                        fi
                        ;;
                    "boolean")
                        if ! [[ "$user_input" =~ ^(true|false|yes|no|1|0)$ ]]; then
                            warn "请输入 true/false 或 yes/no 或 1/0"
                            continue
                        fi
                        # 标准化布尔值
                        case "$user_input" in
                            yes|1) user_input="true" ;;
                            no|0) user_input="false" ;;
                        esac
                        ;;
                esac
            fi

            # 设置环境变量
            env["middleware_${var_name}"]="$user_input"

            if [[ "${DEBUG}" == "true" ]]; then
                echo "DEBUG: 设置变量 middleware_${var_name}=$user_input"
            fi

            break
        done
    done
}

# 中间件交互式部署
function run_middleware_interactive() {
    if [[ "${DEBUG}" == "true" ]]; then
        echo "DEBUG: 进入run_middleware_interactive()函数"
    fi
    info "进入中间件交互式配置模式..."
    echo

    # 1. 动态选择中间件模板
    if [[ -z "${env[cmd_3]}" ]]; then
        list_available_middleware_templates

        if [[ ${#available_templates[@]} -eq 0 ]]; then
            error "未找到可用的中间件模板"
            exit 1
        fi

        echo "可用的中间件模板："
        for i in "${!available_templates[@]}"; do
            local index=$((i + 1))
            echo "  $index) ${available_templates[i]} - ${available_descriptions[i]}"
        done
        echo

        while true; do
            read -p "🔹 请选择中间件模板（输入序号或名称）: " middleware_choice

            # 检查是否是序号
            if [[ "$middleware_choice" =~ ^[0-9]+$ ]]; then
                local choice_index=$((middleware_choice - 1))
                if [[ $choice_index -ge 0 && $choice_index -lt ${#available_templates[@]} ]]; then
                    env[cmd_3]="${available_templates[choice_index]}"
                    break
                else
                    warn "无效的序号，请重试"
                    continue
                fi
            else
                # 检查是否是模板名称
                local found=false
                for template in "${available_templates[@]}"; do
                    if [[ "$template" == "$middleware_choice" ]]; then
                        env[cmd_3]="$template"
                        found=true
                        break
                    fi
                done

                if [[ "$found" == "true" ]]; then
                    break
                else
                    warn "未找到模板: $middleware_choice，请重试"
                fi
            fi
        done
    fi

    # 2. 实例名称
    if [[ -z "${env[cmd_4]}" ]]; then
        while true; do
            read -p "🔹 请输入实例名称: " instance_name
            if [[ -n "$instance_name" && "$instance_name" =~ ^[a-z0-9-]+$ ]]; then
                env[cmd_4]="$instance_name"
                break
            else
                warn "实例名称只能包含小写字母、数字和连字符，请重试"
            fi
        done
    fi

    # 3. 根据模板元数据收集变量配置
    collect_template_variables "${env[cmd_3]}"

    # 4. 生成并显示命令
    generate_middleware_command

    # 5. 确认并执行
    confirm_and_execute_middleware
}

function run_interactive() {
    if [[ "${DEBUG}" == "true" ]]; then
        echo "DEBUG: 进入run_interactive()函数"
    fi
    info "进入交互式配置模式..."
    echo

    # 1. 收集基本参数
    # 确保我们知道要运行什么类型
    if [[ -z "${env[cmd_2]}" ]]; then
        echo "支持的部署类型："
        echo "  1) java   - Java项目（Spring Boot等）"
        echo "  2) vue    - Vue.js前端项目"
        echo "  3) go     - Go语言项目"
        echo "  4) nginx  - Nginx静态项目"
        echo "  5) tomcat - Tomcat Web项目"
        echo "  6) python - Python项目（Flask/Django/FastAPI等）"
        echo "  7) nodejs - Node.js项目（Express/Koa/NestJS等）"
        echo
        while true; do
            read -p "🔹 请选择部署类型（输入序号或名称）: " deploy_type
            case "$deploy_type" in
                1|java) env[cmd_2]="java"; break ;;
                2|vue) env[cmd_2]="vue"; break ;;
                3|go) env[cmd_2]="go"; break ;;
                4|nginx) env[cmd_2]="nginx"; break ;;
                5|tomcat) env[cmd_2]="tomcat"; break ;;
                6|python) env[cmd_2]="python"; break ;;
                7|nodejs) env[cmd_2]="nodejs"; break ;;
                *) warn "无效选择，请重试" ;;
            esac
        done
    fi

    # 项目/模块名称
    if [[ -z "${env[cmd_3]}" ]]; then
        prompt_required "项目/模块名称" env[cmd_3]
    fi

    echo
    info "开始配置部署参数..."
    echo

    # 2. 代码拉取配置
    if [[ -z "${env[opt_git_url]}" && -z "${env[opt_svn_url]}" ]]; then
        echo "代码拉取方式："
        echo "  1) Git"
        echo "  2) SVN"
        while true; do
            read -p "🔹 请选择代码拉取方式（1/2）: " scm_choice
            case "$scm_choice" in
                1|git|Git)
                    prompt_smart_required "请输入Git地址" scm_url "${env[cfg_git_url]}"
                    env[opt_git_url]="$scm_url"
                    break
                    ;;
                2|svn|SVN)
                    prompt_required "请输入SVN地址" scm_url
                    env[opt_svn_url]="$scm_url"
                    break
                    ;;
                *) warn "无效选择，请重试" ;;
            esac
        done
    fi

    # Git 分支
    if [[ -n "${env[opt_git_url]}" && -z "${env[opt_git_branch]}" ]]; then
        prompt_with_workspace_default "Git 分支" env[opt_git_branch] "${env[cfg_git_branch]}" "main"
    fi

    # 3. 版本管理配置
    if [[ -z "${env[opt_build_version]}" ]]; then
        if [[ -n "${env[cfg_build_version]}" ]]; then
            read -p "🔸 构建工具版本 (可选，默认值为：${env[cfg_build_version]}，回车使用默认值): " build_version_input
            env[opt_build_version]=${build_version_input:-${env[cfg_build_version]}}
        else
            echo "构建工具版本配置 (可选):"
            echo "  格式: 工具:版本,工具:版本"
            echo "  示例: node:18.12,jdk:17,maven:3.9.3"
            echo "  支持: node, jdk/java, maven, gradle, volta"
            read -p "🔸 构建工具版本 (可留空): " env[opt_build_version]
        fi
    fi

    # 4. 特定于类型的参数
    case "${env[cmd_2]}" in
        java)
            if [[ -z "${env[opt_build_tool]}" ]]; then
                prompt_with_default "构建工具 (maven/gradle)" env[opt_build_tool] "gradle"
            fi
            if [[ -z "${env[opt_build_cmds]}" ]]; then
                prompt_optional "自定义构建命令" env[opt_build_cmds]
            fi
            if [[ -z "${env[opt_java_opts]}" ]]; then
                prompt_optional "Java 启动参数 (JAVA_OPTS)" env[opt_java_opts]
            fi
            ;;
        vue)
            if [[ -z "${env[opt_build_cmds]}" ]]; then
                prompt_optional "自定义构建命令 (如: npm run build:prod)" env[opt_build_cmds]
            fi
            ;;
        python)
            if [[ -z "${env[opt_python_main]}" ]]; then
                prompt_optional "Python 主程序文件 (默认: app.py)" env[opt_python_main]
            fi
            if [[ -z "${env[opt_python_requirements]}" ]]; then
                prompt_optional "Requirements 文件路径 (默认: requirements.txt)" env[opt_python_requirements]
            fi
            if [[ -z "${env[opt_build_cmds]}" ]]; then
                prompt_optional "自定义构建命令" env[opt_build_cmds]
            fi
            ;;
        # 其他类型的参数可在此处扩展
    esac

    # 5. 部署模板配置
    if [[ -z "${env[opt_template]}" ]]; then
        default_template="spring-boot"
        case "${env[cmd_2]}" in
            vue) default_template="vue-nginx" ;;
            go) default_template="go" ;;
            nginx) default_template="nginx" ;;
            tomcat) default_template="tomcat" ;;
            python) default_template="python" ;;
        esac

        echo
        echo "选择模板 (可选，默认模板：$default_template):"
        echo "  回车使用默认模板，或输入自定义模板名称"
        read -p "🔸 部署模板: " template_input
        env[opt_template]=${template_input:-$default_template}
    fi

    # 6. 部署环境配置
    if [[ -z "${env[opt_namespace]}" ]]; then
        prompt_with_workspace_default "Kubernetes Namespace" env[opt_namespace] "${env[cfg_k8s_namespace]}" "default"
    fi

    # 7. 构建环境配置
    if [[ -z "${env[opt_build_env]}" ]]; then
        echo
        echo "构建环境配置 (可选):"
        echo "  常用环境: dev, test, staging, prod"
        read -p "🔸 构建环境 (可留空): " env[opt_build_env]
    fi

    # 8. 端口配置
    echo
    info "端口配置 (可选)"

    # 应用端口配置
    if [[ -z "${env[opt_app_port]}" ]]; then
        read -p "🔸 容器应用端口 (默认80): " app_port_input
        if [[ -n "$app_port_input" ]]; then
            env[opt_app_port]="$app_port_input"
        fi
    fi

    # 端口配置方式选择
    echo
    echo "端口配置方式："
    echo "  1) 传统方式 - 单端口配置"
    echo "  2) 多端口方式 - 支持多个服务端口和导出端口"
    read -p "🔸 选择端口配置方式 (1/2，默认1): " port_config_mode
    port_config_mode=${port_config_mode:-1}

    case "$port_config_mode" in
        1)
            # 传统单端口配置
            if [[ -z "${env[opt_expose_port]}" ]]; then
                read -p "🔸 外部暴露端口 (NodePort，范围30000-32767，可留空): " expose_port_input
                if [[ -n "$expose_port_input" ]]; then
                    env[opt_expose_port]="$expose_port_input"
                    read -p "🔸 是否强制覆盖模板固定端口? [y/N] " -r answer
                    if [[ "$answer" =~ ^[Yy]$ ]]; then
                        env[opt_force_port]=true
                    fi
                fi
            fi
            ;;
        2)
            # 多端口配置
            echo
            info "多端口配置"
            echo "支持的格式："
            echo "  - 单端口: 8080"
            echo "  - 多端口: 8080,9090,3000"
            echo "  - 命名端口: http:8080,admin:9090"
            echo "  - 混合格式: 8080,admin:9090,3000"
            echo

            if [[ -z "${env[opt_service_port]}" ]]; then
                read -p "🔸 服务端口配置 (可留空): " service_port_input
                if [[ -n "$service_port_input" ]]; then
                    env[opt_service_port]="$service_port_input"
                fi
            fi

            if [[ -z "${env[opt_export_port]}" ]]; then
                read -p "🔸 导出端口配置 (NodePort，范围30000-32767，可留空): " export_port_input
                if [[ -n "$export_port_input" ]]; then
                    env[opt_export_port]="$export_port_input"
                fi
            fi
            ;;
        *)
            warn "无效选择，使用传统单端口配置"
            ;;
    esac

        # 2. 生成并打印命令
    local final_command="devops run ${env[cmd_2]} ${env[cmd_3]}"
    for key in "${!env[@]}"; do
        if [[ "$key" == opt_* && -n "${env[$key]}" ]]; then
            local param_name="--${key#opt_}"
            # 特殊处理 interactive 标志
            if [[ "$param_name" == "--interactive" ]]; then continue; fi
            final_command+=" $param_name \"${env[$key]}\""
        fi
    done

    info "根据您的输入，生成的等效命令如下:"
    echo "--------------------------------------------------"
    echo -e "  \033[1;32m$final_command\033[0m"
    echo "--------------------------------------------------"

    # 3. 最终确认
    confirm "是否执行以上命令?"

    # 3. 最终确认 (待实现)

        # 4. 设置必要的环境变量
    env[cmd_job_name]=${env[cmd_3]}
    env[cfg_temp_dir]=/tmp/devops/${env[opt_workspace]}/${env[cmd_job_name]}
    
    # 5. 执行构建
    case "${env[cmd_2]}" in
        java) run_devops java_build ;;
        vue) run_devops vue_build ;;
        go) run_devops go_build ;;
        nginx) run_devops nginx_build ;;
        tomcat) run_devops tomcat_build ;;
        *) error "不支持的运行类型: ${env[cmd_2]}" ; exit 1 ;;
    esac
}

# 显示中间件连接信息
function show_middleware_connection_info() {
    local template_name="$1"
    local instance_name="$2"

    info "中间件部署完成！"
    echo
    echo "📋 连接信息："

    # 根据平台显示不同的连接信息
    case "${env[cfg_build_platform]}" in
        "KUBERNETES")
            local namespace="${env[opt_namespace]:-default}"
            echo "- 内部访问: ${instance_name}.${namespace}.svc.cluster.local"

            # 显示通用连接信息
            echo "- 服务端口: ${env[middleware_service_port]:-80}"

            # 显示模板特定的连接信息（从metadata.yaml读取）
            local template_dir="${env[cfg_template_path]}"
            if [[ -f "$template_dir/metadata.yaml" ]]; then
                local connection_info
                connection_info=$(grep -A 10 "connection:" "$template_dir/metadata.yaml" 2>/dev/null | grep -v "connection:" | sed 's/^[[:space:]]*//')
                if [[ -n "$connection_info" ]]; then
                    echo "- 连接信息："
                    echo "$connection_info" | while read -r line; do
                        if [[ -n "$line" ]]; then
                            # 替换变量占位符
                            line="${line//\{instance_name\}/$instance_name}"
                            line="${line//\{namespace\}/$namespace}"
                            echo "  $line"
                        fi
                    done
                else
                    echo "- 请查看模板文档了解具体连接信息"
                fi
            else
                echo "- 请查看模板文档了解具体连接信息"
            fi

            # 显示外部访问端口（如果配置了）
            if [[ -n "${env[opt_export_port]}" ]]; then
                echo "- 外部访问端口: ${env[opt_export_port]}"
            fi
            ;;
        "DOCKER_SWARM"|"DOCKER_COMPOSE")
            echo "- 服务名称: ${instance_name}"
            echo "- 网络访问: ${instance_name}:端口"
            ;;
    esac

    echo
    echo "🔧 管理命令："
    echo "- 查看状态: devops middleware status ${instance_name}"
    echo "- 查看日志: devops middleware logs ${instance_name}"
    echo "- 删除服务: devops middleware remove ${instance_name}"

    # 显示模板特定的使用提示
    if [[ -f "${env[cfg_template_path]}/metadata.yaml" ]]; then
        local usage_info
        usage_info=$(grep -A 10 "usage:" "${env[cfg_template_path]}/metadata.yaml" 2>/dev/null | grep -v "usage:" | sed 's/^[[:space:]]*//')
        if [[ -n "$usage_info" ]]; then
            echo
            echo "💡 使用提示："
            echo "$usage_info"
        fi
    fi

    echo
}

# 从metadata.yaml加载默认值
function load_metadata_defaults() {
    local metadata_file="$1"

    if [[ ! -f "$metadata_file" ]]; then
        warn "模板metadata.yaml不存在: $metadata_file，使用系统默认值"
        # 使用系统默认值（命名空间已在env.sh中处理）
        env[middleware_memory_limit]="512Mi"
        env[middleware_storage_size]="5Gi"
        env[middleware_replicas]="1"
        env[middleware_service_port]="80"
        return
    fi

    if [[ "${DEBUG}" == "true" ]]; then
        echo "DEBUG: 解析metadata.yaml: $metadata_file"
    fi

    # 解析YAML中的变量定义和默认值
    local in_variables=false
    local current_var=""

    while IFS= read -r line; do
        # 检测是否进入variables部分
        if [[ "$line" =~ ^variables: ]]; then
            in_variables=true
            continue
        fi

        # 如果遇到其他顶级键，退出variables部分
        if [[ "$in_variables" == true && "$line" =~ ^[a-zA-Z] ]]; then
            in_variables=false
        fi

        if [[ "$in_variables" == true ]]; then
            # 解析变量名
            if [[ "$line" =~ ^[[:space:]]*-[[:space:]]*name:[[:space:]]*\"([^\"]+)\" ]]; then
                current_var="${BASH_REMATCH[1]}"
                if [[ "${DEBUG}" == "true" ]]; then
                    echo "DEBUG: 发现变量: $current_var"
                fi
            fi

            # 解析默认值
            if [[ -n "$current_var" && "$line" =~ ^[[:space:]]*default:[[:space:]]*\"?([^\"]+)\"? ]]; then
                local default_value="${BASH_REMATCH[1]}"
                # 移除可能的引号
                default_value=$(echo "$default_value" | sed 's/^"//;s/"$//')
                env["middleware_${current_var}"]="$default_value"
                if [[ "${DEBUG}" == "true" ]]; then
                    echo "DEBUG: 设置默认值: middleware_${current_var}=$default_value"
                fi
                current_var=""
            elif [[ -n "$current_var" && "$line" =~ ^[[:space:]]*default:[[:space:]]*([0-9]+) ]]; then
                # 处理数字类型的默认值
                local default_value="${BASH_REMATCH[1]}"
                env["middleware_${current_var}"]="$default_value"
                if [[ "${DEBUG}" == "true" ]]; then
                    echo "DEBUG: 设置数字默认值: middleware_${current_var}=$default_value"
                fi
                current_var=""
            fi
        fi
    done < "$metadata_file"

    # 确保基础变量有值（如果metadata中没有定义）
    # namespace 使用系统统一的 cfg_k8s_namespace
    env[middleware_memory_limit]="${env[middleware_memory_limit]:-512Mi}"
    env[middleware_storage_size]="${env[middleware_storage_size]:-5Gi}"
    env[middleware_replicas]="${env[middleware_replicas]:-1}"
    env[middleware_service_port]="${env[middleware_service_port]:-80}"
}

# 动态应用命令行参数覆盖默认值
function apply_command_line_overrides() {
    if [[ "${DEBUG}" == "true" ]]; then
        echo "DEBUG: 开始应用命令行参数覆盖"
        echo "DEBUG: opt_export_port=${env[opt_export_port]}"
        echo "DEBUG: opt_service_port=${env[opt_service_port]}"
    fi

    # 遍历所有opt_开头的环境变量（命令行参数）
    for key in "${!env[@]}"; do
        if [[ "$key" =~ ^opt_ ]]; then
            # 提取变量名（移除opt_前缀）
            local var_name="${key#opt_}"
            local var_value="${env[$key]}"

            if [[ "${DEBUG}" == "true" ]]; then
                echo "DEBUG: 处理参数: $key = $var_value"
            fi

            # 跳过系统保留参数和instance_name（直接复用命令中的<name>）
            case "$var_name" in
                interactive|workspace|namespace|build_tool|git_url|svn_url|java_opts|dockerfile|static_dir|template|git_branch|build_cmds|build_env|build_version|app_port|expose_port|force_port|python_requirements|python_main|instance_name)
                    if [[ "${DEBUG}" == "true" ]]; then
                        echo "DEBUG: 跳过系统参数: $var_name"
                    fi
                    continue
                    ;;
            esac

            # 设置中间件变量
            local middleware_key="middleware_${var_name}"
            env["$middleware_key"]="$var_value"

            if [[ "${DEBUG}" == "true" ]]; then
                echo "DEBUG: 应用参数覆盖: $key -> $middleware_key = $var_value"
            fi
        fi
    done

    # 处理auto-generate密码
    for key in "${!env[@]}"; do
        if [[ "$key" =~ ^middleware_ && "${env[$key]}" == "auto-generate" ]]; then
            env["$key"]=$(generate_password)
            if [[ "${DEBUG}" == "true" ]]; then
                echo "DEBUG: 自动生成密码: $key"
            fi
        fi
    done

    # 确保基础变量有值
    # namespace 使用系统统一的 cfg_k8s_namespace
    env[middleware_instance_name]="${env[middleware_instance_name]:-${env[cmd_3]}}"
}

# 生成随机密码
function generate_password() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 16 2>/dev/null | tr -d "=+/" | cut -c1-16
    else
        echo "pass$(date +%s)"
    fi
}

# 中间件Jinja2模板渲染
function render_middleware_jinja2() {
    local template_file="$1"
    local output_file="$2"

    # 检查Python环境
    if ! command -v python3 &> /dev/null; then
        error "Python3 未安装，无法使用Jinja2渲染器"
        exit 1
    fi

    # 创建临时Python脚本
    local temp_script="/tmp/middleware_renderer_$$.py"
    cat > "$temp_script" << 'EOF'
#!/usr/bin/env python3
import sys
import os
import base64

try:
    from jinja2 import Environment, FileSystemLoader
    import yaml
except ImportError:
    print("错误: 缺少依赖，请安装: pip3 install Jinja2 PyYAML", file=sys.stderr)
    sys.exit(1)

def main():
    if len(sys.argv) != 3:
        print("用法: python3 script.py template_file output_file", file=sys.stderr)
        sys.exit(1)

    template_file = sys.argv[1]
    output_file = sys.argv[2]

    # 从环境变量获取模板变量
    variables = {}
    for key, value in os.environ.items():
        if key.startswith('middleware_'):
            var_name = key[11:]  # 移除 'middleware_' 前缀
            variables[var_name] = value

    # 设置Jinja2环境
    template_dir = os.path.dirname(template_file)
    env = Environment(loader=FileSystemLoader(template_dir))

    # 添加自定义过滤器
    env.filters['b64encode'] = lambda x: base64.b64encode(x.encode()).decode()

    # 渲染模板
    template = env.get_template(os.path.basename(template_file))
    rendered = template.render(**variables)

    # 写入输出文件
    with open(output_file, 'w') as f:
        f.write(rendered)

    print(f"中间件模板渲染成功: {output_file}")

if __name__ == '__main__':
    main()
EOF

    # 执行渲染
    if python3 "$temp_script" "$template_file" "$output_file"; then
        success "中间件Jinja2模板渲染成功"
    else
        error "中间件Jinja2模板渲染失败"
        exit 1
    fi

    # 清理临时文件
    rm -f "$temp_script"
}

# 处理中间件变量（MVP版本）
function process_middleware_variables() {
    local template_name="$1"
    local instance_name="$2"
    local template_dir="${env[cfg_template_path]}"
    local metadata_file="$template_dir/metadata.yaml"

    # 设置基础变量，instance_name直接复用命令中的<name>参数
    env[middleware_instance_name]="$instance_name"

    # 从metadata.yaml读取默认值，如果没有则使用系统默认值
    load_metadata_defaults "$metadata_file"

    # 应用命令行参数（覆盖默认值）
    apply_command_line_overrides

    # 调试：显示所有中间件变量
    if [[ "${DEBUG}" == "true" ]]; then
        echo "DEBUG: 所有中间件变量："
        for key in "${!env[@]}"; do
            if [[ "$key" =~ ^middleware_ ]]; then
                echo "DEBUG: $key=${env[$key]}"
            fi
        done
    fi
}

# 生成中间件部署命令
function generate_middleware_command() {
    local template_name="${env[cmd_3]}"
    local instance_name="${env[cmd_4]}"

    echo
    info "📊 配置预览"
    echo "模板: $template_name"
    echo "实例名称: $instance_name"

    # 显示配置的变量
    echo
    echo "配置变量:"
    for var_name in "${!env[@]}"; do
        if [[ "$var_name" =~ ^middleware_ ]]; then
            local display_name="${var_name#middleware_}"
            echo "  - $display_name: ${env[$var_name]}"
        fi
    done

    # 生成等效的命令行
    echo
    echo "等效命令行:"
    local cmd="devops run middleware $template_name $instance_name"

    # 添加变量参数
    for var_name in "${!env[@]}"; do
        if [[ "$var_name" =~ ^middleware_ && -n "${env[$var_name]}" ]]; then
            local param_name="${var_name#middleware_}"
            # 将下划线转换为连字符
            param_name="${param_name//_/-}"
            cmd="$cmd --$param_name \"${env[$var_name]}\""
        fi
    done

    echo "$cmd"
}

# 确认并执行中间件部署
function confirm_and_execute_middleware() {
    echo
    while true; do
        read -p "🔹 确认部署？[Y/n]: " confirm
        case "$confirm" in
            ""|y|Y|yes|Yes)
                info "开始部署中间件..."
                # 调用实际的中间件部署逻辑
                run_middleware "${env[cmd_3]}" "${env[cmd_4]}"
                break
                ;;
            n|N|no|No)
                info "取消部署"
                exit 0
                ;;
            *)
                warn "请输入 y 或 n"
                ;;
        esac
    done
}

# 中间件部署主函数
function run_middleware() {
    local template_name="$1"
    local instance_name="$2"

    if [[ -z "$template_name" || -z "$instance_name" ]]; then
        error "缺少必要参数: template_name 和 instance_name"
        exit 1
    fi

    info "部署中间件: $template_name -> $instance_name"

    # 设置中间件特定的环境变量
    env[cmd_type]="middleware"
    env[middleware_template]="$template_name"  # 使用独立的中间件模板变量
    env[cmd_job_name]="$instance_name"

    # 查找模板目录
    local platform_dir
    case "${env[cfg_build_platform]}" in
        "KUBERNETES") platform_dir="k8s" ;;
        "DOCKER_SWARM") platform_dir="swarm" ;;
        "DOCKER_COMPOSE") platform_dir="compose" ;;
        "SHELL") platform_dir="shell" ;;
        *) platform_dir="k8s" ;;
    esac

    local template_dir="${DEVOPS_ROOT}/templates/${platform_dir}/middleware/${template_name}"
    if [[ ! -d "$template_dir" ]]; then
        # SHELL 平台允许回退到常见平台（例如 compose）下的模板
        if [[ "$platform_dir" == "shell" ]]; then
            local fallback_dir="${DEVOPS_ROOT}/templates/compose/middleware/${template_name}"
            if [[ -d "$fallback_dir" ]]; then
                template_dir="$fallback_dir"
            else
                error "模板目录不存在: $template_dir (尝试回退: $fallback_dir 也不存在)"
                exit 1
            fi
        else
            error "模板目录不存在: $template_dir"
            exit 1
        fi
    fi

    env[cfg_template_path]="$template_dir"

    # 处理中间件变量
    process_middleware_variables "$template_name" "$instance_name"

    # 预渲染模板目录中的所有 .j2/.tpl 文件（输出为同名无后缀文件），与平台无关
    prerender_all_templates_in_dir "$template_dir"

    # 当平台为 SHELL 时，直接执行模板中的启动脚本
    if [[ "$platform_dir" == "shell" ]]; then
        export_middleware_env_for_shell
        run_shell_platform_start_script "$template_dir"
    else
    # 渲染中间件模板（使用专门的中间件模板渲染器）
    render_middleware_template

    # 部署
    deploy
    fi

    # 显示部署结果
    show_middleware_deployment_info "$instance_name"
}

# 将 middleware_* 变量导出为脚本可用的环境变量（中划线转下划线，大写）
function export_middleware_env_for_shell() {
    for var_name in "${!env[@]}"; do
        if [[ "$var_name" =~ ^middleware_ ]]; then
            local key="${var_name#middleware_}"
            key="${key//-/_}"
            local upper_key
            upper_key=$(echo "$key" | tr '[:lower:]' '[:upper:]')
            export "$upper_key"="${env[$var_name]}"
        fi
    done
    # 兼容实例名
    if [[ -n "${env[cmd_job_name]}" ]]; then
        export INSTANCE_NAME="${env[cmd_job_name]}"
    fi
}

# 在 SHELL 平台执行启动脚本
# 优先级：middleware_start_script > 默认 install.sh
function run_shell_platform_start_script() {
    local template_dir="$1"
    local work_dir="${env[cfg_deploy_gen_location]:-$template_dir}"
    local start_script
    start_script="${env[middleware_start_script]}"
    if [[ -z "$start_script" ]]; then
        start_script="install.sh"
    fi

    local script_path="$work_dir/$start_script"
    if [[ ! -f "$script_path" ]]; then
        error "启动脚本不存在: $script_path"
        echo "可通过 --start-script 或在元数据/命令行中设置 middleware_start_script 指定脚本名"
        exit 1
    fi

    info "执行启动脚本: $script_path"
    ( cd "$work_dir" && bash "$script_path" )
}

# 显示中间件部署信息
function show_middleware_deployment_info() {
    local instance_name="$1"

    echo
    success "🎉 中间件部署完成！"
    echo
    echo "📋 部署信息："
    echo "- 实例名称: $instance_name"
    echo "- 模板类型: ${env[middleware_template]}"

    # 根据平台显示连接信息
    case "${env[cfg_build_platform]}" in
        "KUBERNETES")
            local namespace="${env[cfg_k8s_namespace]:-default}"
            echo "- 命名空间: $namespace"
            echo "- 内部访问: ${instance_name}.${namespace}.svc.cluster.local"

            # 显示外部访问端口（如果配置了）
            if [[ -n "${env[middleware_export_port]}" ]]; then
                echo "- 外部访问端口: ${env[middleware_export_port]}"
            fi
            ;;
        "DOCKER_SWARM"|"DOCKER_COMPOSE")
            echo "- 服务名称: ${instance_name}"
            echo "- 网络访问: ${instance_name}:端口"
            ;;
    esac

    echo
    echo "🔧 管理命令："
    echo "- 查看状态: devops middleware status ${instance_name}"
    echo "- 查看日志: devops middleware logs ${instance_name}"
    echo "- 删除服务: devops middleware remove ${instance_name}"

    # 显示模板特定的使用提示
    if [[ -f "${env[cfg_template_path]}/metadata.yaml" ]]; then
        local usage_info
        usage_info=$(grep -A 10 "usage:" "${env[cfg_template_path]}/metadata.yaml" 2>/dev/null | grep -v "usage:" | sed 's/^[[:space:]]*//')
        if [[ -n "$usage_info" ]]; then
            echo
            echo "💡 使用提示："
            echo "$usage_info"
        fi
    fi

    echo
}