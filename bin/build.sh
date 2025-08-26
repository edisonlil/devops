#!/bin/bash

# 获取脚本所在目录
BUILD_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$BUILD_SCRIPT_DIR/golang_build"
source "$BUILD_SCRIPT_DIR/java_build"
source "$BUILD_SCRIPT_DIR/tomcat_build"
source "$BUILD_SCRIPT_DIR/vue_build"
source "$BUILD_SCRIPT_DIR/nginx_build"

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
        run_interactive
    else
        if [[ "${DEBUG}" == "true" ]]; then
            echo "DEBUG: 非交互式模式，cmd_2='${env[cmd_2]}'"
        fi
        if test -n "${env[cmd_2]}"; then
            run_${env[cmd_2]}
        else
            echo "run need be followed by a cammand"; exit 1
        fi
    fi
}

# 查找模板目录，优先使用workspace模板
function find_template_dir() {
	local platform_dir="$1"
	local template_id="$2"

	# 优先查找workspace模板
	local workspace_template_dir="${env[cfg_workspace_template_path]}/$platform_dir/$template_id"
	if [ -d "$workspace_template_dir" ]; then
		echo "$workspace_template_dir"
		return 0
	fi

	# fallback到全局模板
	local global_template_dir="${env[cfg_global_template_path]}/$platform_dir/$template_id"
	if [ -d "$global_template_dir" ]; then
		echo "$global_template_dir"
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

	# 支持本地静态资源目录，跳过SCM
	if [ -n "$opt_static_dir" ]; then
		if [ ! -d "$opt_static_dir" ]; then
			error "--static-dir 不存在: $opt_static_dir"; exit 1
		fi

		# 确保目标目录干净
		if [ -d "$cfg_temp_dir" ]; then
			if [[ "${DEBUG}" == "true" ]]; then
				echo "DEBUG: 清理已存在的构建目录: $cfg_temp_dir"
			fi
			rm -rf "$cfg_temp_dir"
		fi
		mkdir -p "$cfg_temp_dir"
		# 打包静态资源为 dist.tar.gz
		( cd "$opt_static_dir" && tar -cf "$cfg_temp_dir/dist.tar" . )
		# 供后续 docker build 使用
		env[tmp_build_dist_path]="$cfg_temp_dir"
		# 生成镜像后缀（仅日期）
		date=`date +%Y-%m-%d_%H-%M-%S`
		env[tmp_docker_image_suffix]="${date}"
		return 0
	fi

	if [ -n "$opt_git_url" ]; then
		check_env_by_cmd_v git

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
		*) error "unsupported platform: $cfg_build_platform"; exit 1;;
	esac

	# 模板名缺省映射
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
	
	# 调用Python模板渲染器
	local python_script="${BUILD_SCRIPT_DIR}/template_renderer.py"
	if [ ! -f "$python_script" ]; then
		error "Python模板渲染器不存在: $python_script"; exit 1
	fi
	
	# 构建Python渲染器参数
	local python_args=(
		"$python_script"
		"--template" "$deploy_tpl"
		"--output" "$cfg_deploy_gen_location/${cmd_job_name}.yml"
		"--module-name" "$cmd_job_name"
		"--image-path" "$tmp_image_path"
		"--namespace" "$cfg_k8s_namespace"
		"--app-port" "$app_port"
		"--build-platform" "$cfg_build_platform"
		"--java-opts" "$java_opts"
	)
	
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
	if python3 "${python_args[@]}"; then
		success "模板渲染成功: $cfg_deploy_gen_location/${cmd_job_name}.yml"
	else
		error "模板渲染失败"; exit 1
	fi
	
	# 处理NodePort动态注入 (仅K8s平台)
	if [[ "$cfg_build_platform" == "KUBERNETES" ]]; then
		# 优先处理多端口配置
		enhance_multi_ports "$cfg_deploy_gen_location/${cmd_job_name}.yml"

		# 如果没有多端口配置，使用传统的单端口处理
		if [[ -z "${env[opt_service_port]}" && -z "${env[opt_export_port]}" ]]; then
			enhance_service_nodeport "$cfg_deploy_gen_location/${cmd_job_name}.yml"
		fi
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

	deploy_job_yml=$cfg_deploy_gen_location/${cmd_job_name}.yml
        #创建或者更新镜像
        if [ "$cfg_build_platform" = "KUBERNETES" ]
        then
                check_env_by_cmd_v kubectl
                info "开始使用k8s部署服务到namespace: ${cfg_k8s_namespace}"
                # 确保namespace存在
                kubectl create namespace ${cfg_k8s_namespace} --dry-run=client -o yaml | kubectl apply -f -
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

	deploy_job_yml=$cfg_deploy_gen_location/${cmd_job_name}.yml

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
		remote_command="ssh $user@$ip 'kubectl create namespace ${cfg_k8s_namespace} --dry-run=client -o yaml | kubectl apply -f - && $harbor_secret_cmd' && cat $deploy_job_yml | ssh $user@$ip 'kubectl apply -f -'"
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
        echo
        while true; do
            read -p "🔹 请选择部署类型（输入序号或名称）: " deploy_type
            case "$deploy_type" in
                1|java) env[cmd_2]="java"; break ;;
                2|vue) env[cmd_2]="vue"; break ;;
                3|go) env[cmd_2]="go"; break ;;
                4|nginx) env[cmd_2]="nginx"; break ;;
                5|tomcat) env[cmd_2]="tomcat"; break ;;
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
