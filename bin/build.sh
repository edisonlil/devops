#!/bin/bash

# 获取脚本所在目录
BUILD_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$BUILD_SCRIPT_DIR/golang_build"
source "$BUILD_SCRIPT_DIR/java_build"
source "$BUILD_SCRIPT_DIR/tomcat_build"
source "$BUILD_SCRIPT_DIR/vue_build"
source "$BUILD_SCRIPT_DIR/nginx_build"

function run() {
    if [[ "${env[opt_interactive]}" == "true" ]]; then
        run_interactive
    else
        case ${env[cmd_1]} in
        run)
                if test -n ${env[cmd_2]}; then
                        run_${env[cmd_2]}
                else
                        echo "run need be followed by a cammand"; exit 1
                fi
         ;;
        *) error "cannot find the cammand ${env[cmd_1]}"; exit 1 ; ;;
	esac
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
	  rm -rf ${env[cfg_temp_dir]}
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
  #检测前置参数
	check_post_parmas
	#从版本管理工具加载代码
	scm
	#复制dockerfile文件
	choose_dockerfile
	#开始构建，构建不同的项目，java,vue,go等
	$1
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
		mkdir -p "$cfg_temp_dir"
		# 打包静态资源为 dist.tar.gz
		( cd "$opt_static_dir" && tar -czf "$cfg_temp_dir/dist.tar.gz" . )
		# 供后续 docker build 使用
		env[tmp_build_dist_path]="$cfg_temp_dir"
		# 生成镜像后缀（仅日期）
		date=`date +%Y-%m-%d_%H-%M-%S`
		env[tmp_docker_image_suffix]="${date}"
		return 0
	fi

	if [ -n "$opt_git_url" ]; then
		check_env_by_cmd_v git
		#克隆代码
		if test -n "${opt_git_branch}" ; then
			info "开始使用git拉取代码,当前分支:${opt_git_branch}"
			#处理存在orgin/test的问题
			real_branch=${opt_git_branch##*/}
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
	elif [ -n "$opt_svn_url" ]; then
		check_env_by_cmd_v svn
		info '开始使用 svn 拉取代码'
		debug '此处忽略svn拉取日志'
		svn checkout -q $opt_svn_url $cfg_temp_dir
		cd $cfg_temp_dir
		date=`date +%Y-%m-%d_%H-%M-%S`
		tmp_log=`svn log | head -2 | tail -1`
		last_log=${tmp_log%% *}
                env[tmp_docker_image_suffix]="${date}_${last_log}"
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

	template_dir="$cfg_template_path/$platform_dir/$template_id"
	dockerfile_tpl="$template_dir/dockerfile"
	if [ ! -f "$dockerfile_tpl" ]; then
		error "模板 dockerfile 不存在: $dockerfile_tpl"; exit 1
	fi
	env[cfg_template_dir]="$template_dir"
	env[tmp_dockerfile]="$dockerfile_tpl"
	info "使用模板 dockerfile: $dockerfile_tpl"
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

	template_dir="$cfg_template_path/$platform_dir/$template_id"
	deploy_tpl="$template_dir/deploy.yaml"
	if [ ! -f "$deploy_tpl" ]; then
		error "模板 deploy.yaml 不存在: $deploy_tpl"; exit 1
	fi

	gen_long_time_str=`date +%s%N`
	tmp_render_file="/tmp/${gen_long_time_str}.yml"
	\cp "$deploy_tpl" "$tmp_render_file"

	# 仅处理 ? 占位符
	sed -i "s#?module_name#${cmd_job_name}#g" "$tmp_render_file"
	sed -i "s#?image_path#${tmp_image_path}#g" "$tmp_render_file"
	sed -i "s#?namespace#${cfg_k8s_namespace}#g" "$tmp_render_file"
	sed -i "s#?network#${cfg_swarm_network}#g" "$tmp_render_file" 2>/dev/null || true

	# 生成文件
	if [ ! -d "$cfg_deploy_gen_location" ];then
		mkdir -p $cfg_deploy_gen_location
	fi
	\mv "$tmp_render_file" $cfg_deploy_gen_location/${cmd_job_name}.yml
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
                kubectl apply -f  ${deploy_job_yml}
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
		remote_command="ssh $user@$ip 'kubectl create namespace ${cfg_k8s_namespace} --dry-run=client -o yaml | kubectl apply -f -' && cat $deploy_job_yml | ssh $user@$ip 'kubectl apply -f -'"
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

function run_interactive() {
    info "进入交互式配置模式..."

        # 1. 收集参数 (已修正)
    # 确保我们知道要运行什么类型
    if [[ -z "${env[cmd_2]}" ]]; then
        prompt_required "运行类型 (e.g., java, vue)" env[cmd_2]
    fi

    # 项目/模块名称
    if [[ -z "${env[cmd_3]}" ]]; then
        prompt_required "项目/模块名称" env[cmd_3]
    fi

    # SCM (代码库)
    if [[ -z "${env[opt_git_url]}" && -z "${env[opt_svn_url]}" ]]; then
        prompt_required "Git/SVN URL" scm_url
        if [[ "$scm_url" == *.git ]]; then
            env[opt_git_url]=$scm_url
        else
            env[opt_svn_url]=$scm_url
        fi
    fi

    # Git 分支
    if [[ -n "${env[opt_git_url]}" && -z "${env[opt_git_branch]}" ]]; then
        prompt_with_default "Git 分支" env[opt_git_branch] "main"
    fi

    # 特定于类型的参数
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
        # 其他类型的参数可在此处扩展
    esac

    # 部署模板
    if [[ -z "${env[opt_template]}" ]]; then
        default_template="spring-boot"
        if [[ "${env[cmd_2]}" == "vue" ]]; then default_template="vue-nginx"; fi
        prompt_with_default "部署模板" env[opt_template] "$default_template"
    fi

    # K8s Namespace
    if [[ -z "${env[opt_namespace]}" ]]; then
        prompt_with_default "Kubernetes Namespace" env[opt_namespace] "${env[cfg_k8s_namespace]:-default}"
    fi

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

        # 4. 执行构建
    case "${env[cmd_2]}" in
        java) run_devops java_build ;;
        vue) run_devops vue_build ;;
        go) run_devops go_build ;;
        nginx) run_devops nginx_build ;;
        tomcat) run_devops tomcat_build ;;
        *) error "不支持的运行类型: ${env[cmd_2]}" ; exit 1 ;;
    esac
}

	echo 'start prune local images:'
	docker image prune -af --filter="label=maintainer=corp" --filter="until=24h"
}
