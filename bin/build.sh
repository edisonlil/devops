#!/bin/bash

source ./golang_build
source ./java_build
source ./tomcat_build
source ./vue_build

function run() {
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

function run_devops() {
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
	opt_dockerfile=${env[opt_dockerfile]}
	cfg_dockerfile_path=${env[cfg_dockerfile_path]}
	cfg_enable_dockerfiles=${env[cfg_enable_dockerfiles]}
	tmp_build_dist_path=${env[tmp_build_dist_path]}

        if test ! -d ${tmp_build_dist_path} ; then
		error "please check scm url or job name(the last command),job name must be the module name";
                exit 1;
	fi		
	#info "开始复制dockerfile到构建目录"
	if test -n "${opt_dockerfile}"
	then
		echo "埋点:执行命令行指定dockerfile${opt_dockerfile}"
   		env[tmp_dockerfile]=$cfg_dockerfile_path/${opt_dockerfile}-dockerfile
	else
		dockerfiles=(${cfg_enable_dockerfiles//,/ })
		is_has_enable_docker_file=false
		for dockerfile in ${dockerfiles[@]} ;do
			if [[ $cmd_job_name == $dockerfile ]]
			then
			  echo "埋点:执行在config.conf配置的dockerfile:${dockerfile}"
			  env[tmp_dockerfile]=$cfg_dockerfile_path/${dockerfile}-dockerfile
			  is_has_enable_docker_file=true
			fi
		done
		if [ "$is_has_enable_docker_file" = false ]; then
			echo "埋点:执行默认指定dockerfile"
		   	env[tmp_dockerfile]=$cfg_dockerfile_path/dockerfile
		fi
	fi
}



function render_template() {
	opt_template=${env[opt_template]}
	cfg_devops_path=${env[cfg_devops_path]}
	cfg_swarm_network=${env[cfg_swarm_network]}
	cfg_template_path=${env[cfg_template_path]}
	cfg_enable_templates=${env[cfg_enable_templates]}
	cfg_deploy_gen_location=${env[cfg_deploy_gen_location]}
	cmd_job_name=${env[cmd_job_name]}
	tmp_image_path=${env[tmp_image_path]}

        #info "开始渲染模板文件"
	cd $cfg_template_path
	gen_long_time_str=`date +%s%N`

	 #处理模板路由信息
	if test -n "${opt_template}"; then
		\cp ./${opt_template}-template.yml ./${gen_long_time_str}.yml
	else
		templates=(${cfg_enable_templates//,/ })
	        is_has_enable_template=false
	        for template in ${templates[@]}
	        do
	        if [[ $cmd_job_name == $template ]]
	        then
	           \cp ./$cmd_job_name-template.yml ./${gen_long_time_str}.yml
	           is_has_enable_template=true
       		fi
	        done
       		if [ "$is_has_enable_template" = false ]
        	then
            	\cp ./template.yml ./${gen_long_time_str}.yml
        	fi
	fi

	#执行替换
	sed -i "s#?module_name#${cmd_job_name}#g"  ./${gen_long_time_str}.yml
	sed -i "s#?module_name#${cmd_job_name}#g"  ./${gen_long_time_str}.yml
	sed -i "s#?image_path#${tmp_image_path}#g"  ./${gen_long_time_str}.yml
	sed -i "s#?network#${cfg_swarm_network}#g"  ./${gen_long_time_str}.yml
	#生成文件
	if [ ! -d "$cfg_deploy_gen_location" ];then
	mkdir -p $cfg_deploy_gen_location
	fi
	\mv ./${gen_long_time_str}.yml $cfg_deploy_gen_location/${cmd_job_name}.yml
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
                info "开始使用k8s部署服务"
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
                info "开始使用k8s部署服务"
		remote_command="cat $deploy_job_yml | ssh $user@$ip 'kubectl apply -f -'"
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

function push(){

  image_path=$1
  enable_harbor=${env[cfg_enable_harbor]}
	#推送镜像
	if test $enable_harbor -eq 1 ;
	then
	    info "开始向harbor推送镜像"
	    docker push $image_path
    fi
    info "$image_path"
    env[tmp_image_path]=$image_path
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
