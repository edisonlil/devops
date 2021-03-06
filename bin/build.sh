#!/bin/bash
source ${dic[cfg_devops_bin_path]}/log.sh

function check_env_by_cmd_v() {
	command -v $1 > /dev/null 2>&1 || (error "Need to install ##$1## command first and run this script again." && exit 1)
}


function parse_params() {
        case "$1" in
	-v) echo "devops version 1.6.5" ; exit 1;;
        --version) echo "devops version 1.6.5" ; exit 1;;
        -h)  devops_help ; exit 1;;
        *) 
                dic[cmd_1]=$1
                shift 1
                case "$1" in
                -h)  echo "thanks for use devops!" ; exit 1;;
                *)
                        dic[cmd_2]=$1
                        shift 1
                        while [ true ] ; do
                                if [[ $1 == -* ]];then
                                        case "$1" in
                                        --build-tool) dic[opt_build_tool]=$2; shift 2;;
                                        --git-url) dic[opt_git_url]=$2;  shift 2;;
                                        --svn-url) dic[opt_svn_url]=$2; shift 2;;
                                        --java-opts) dic[opt_java_opts]=$2; shift 2;;
                                        --dockerfile) dic[opt_dockerfile]=$2; shift 2;;
										--template) dic[opt_template]=$2; shift 2;;
										--git-branch) dic[opt_git_branch]=$2; shift 2;;
										--build-cmds) dic[opt_build_cmds]=$2; shift 2;;
                                        --build-env) dic[opt_build_env]=$2; shift 2;;
										--workspace) dic[opt_workspace]=$2; shift 2;;
                                        *) error "unknown parameter or command $1 ." ; exit 1 ; break;;
                                        esac
                                else
                                        dic[cmd_3]=$1
                                        shift 1
                                        break
                                fi
                        done

                ;;  esac
        ;; esac
}


function devops_help() {
	echo -e 'Usage:  devops [OPTIONS] COMMAND

	A cicd tool for devops
	
	Options:
	      --build-tool string    java build tool "maven" or "gradle"
	      --git-url string       the url of git registry
	      --git-branch string    the branch of git registry
	      --svn-url string       the url of svn registry
	      --java-opts string     the java -jar ${java-opts} foo.jar
	      --dockerfile string    the use of the dockerfile for this job
	      --template string      the use of the docker swram or k8s template for this job
	      --build-cmds string    the cmd rewrite for building this job
	      --build-env string     build env "dev" "test" "gray" "prod" etc.
	      --version              the version of devops
	      --workspace            the workspace
	
	Commands:
	  run      now you can "run java" or "run vue"'
	exit 1;
	
}

function run() {
        case ${dic[cmd_1]} in
        run) 
                if test -n ${dic[cmd_2]}; then
                        run_${dic[cmd_2]}
                else
                        echo "run need be followed by a cammand"; exit 1
                fi
         ;;
        *) error "cannot find the cammand ${dic[cmd_1]}"; exit 1 ; ;;
	esac
}

function check_post_parmas() {
 	if [[ -z ${dic[cmd_3]} ]];then
                warn "job name can not be null ## $1 ##."; exit 1;
	 fi
	dic[cmd_job_name]=${dic[cmd_3]} 
	dic[cfg_temp_dir]=/tmp/devops/${dic[opt_workspace]}/${dic[cmd_job_name]}

	if [[ -n ${dic[cfg_temp_dir]} && ${dic[cfg_temp_dir]} != '/' && ${dic[cfg_temp_dir]} != '.' ]]
	then
	  rm -rf ${dic[cfg_temp_dir]}
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
        #??????????????????
	check_post_parmas
	#?????????????????????????????????
	scm 
	#??????dockerfile??????
	choose_dockerfile 
	#???????????????????????????????????????java,vue,go???
	$1
	#????????????
	render_template 
	#????????????
	deploy 
	#??????????????????
	prune 

}


function scm() {
	cfg_temp_dir=${dic[cfg_temp_dir]}
	opt_git_url=${dic[opt_git_url]}
	opt_git_branch=${dic[opt_git_branch]}
	opt_svn_url=${dic[opt_svn_url]}

	if [ -n "$opt_git_url" ]; then 
		check_env_by_cmd_v git
		#????????????
		if test -n "${opt_git_branch}" ; then
			info "????????????git????????????,????????????:${opt_git_branch}"
			#????????????orgin/test?????????
			real_branch=${opt_git_branch##*/}
			echo "??????:git???real_branch:$real_branch"
			git clone -b  ${real_branch}  --single-branch $opt_git_url  $cfg_temp_dir
		else 
			 info "????????????git????????????,????????????????????????"
		        git clone --single-branch $opt_git_url  $cfg_temp_dir
		fi
		cd $cfg_temp_dir
		#???????????????git?????????????????????
		date=`date +%Y-%m-%d_%H-%M-%S`
		last_log=`git log --pretty=format:%h | head -1`
		dic[tmp_docker_image_suffix]="${date}_${last_log}"
	elif [ -n "$opt_svn_url" ]; then 
		check_env_by_cmd_v svn
		info '???????????? svn ????????????'
		debug '????????????svn????????????'
		svn checkout -q $opt_svn_url $cfg_temp_dir
		cd $cfg_temp_dir
		date=`date +%Y-%m-%d_%H-%M-%S`
		tmp_log=`svn log | head -2 | tail -1`
		last_log=${tmp_log%% *}
                dic[tmp_docker_image_suffix]="${date}_${last_log}"
	else 
		error "--git-url and --svn-url must has one"; exit 1;
	fi
}

function go_build() {
	cfg_temp_dir=${dic[cfg_temp_dir]}
	cmd_job_name=${dic[cmd_job_name]}
	opt_build_tool=${dic[opt_build_tool]}
	opt_build_cmds=${dic[opt_build_cmds]}
	cfg_harbor_address=${dic[cfg_harbor_address]}
	cfg_harbor_project=${dic[cfg_harbor_project]}
	tmp_dockerfile=${dic[tmp_dockerfile]}
	tmp_docker_image_suffix=${dic[tmp_docker_image_suffix]}	

	dic[tmp_go_workspace]=/tmp/devops-go
	dic[tmp_go_workspace_src]=${dic[tmp_go_workspace]}/src
	dic[tmp_go_workspace_src_ws]=${dic[tmp_go_workspace_src]}/${dic[opt_workspace]}
	#??????gopath???src
	if test ! -d "${dic[tmp_go_workspace_src_ws]}" ;then
		mkdir -p ${dic[tmp_go_workspace_src_ws]}
	fi
	export GOAPTH=${dic[tmp_go_workspace]}

  if [[ -n ${dic[tmp_go_workspace_src_ws]} && ${dic[tmp_go_workspace_src_ws]} != '/' && ${dic[tmp_go_workspace_src_ws]} != '.' ]]
	then
	  rm -rf ${dic[tmp_go_workspace_src_ws]}/${cmd_job_name}
  fi
	\mv $cfg_temp_dir ${dic[tmp_go_workspace_src_ws]}
	dic[cfg_temp_dir]=${dic[tmp_go_workspace_src_ws]}/${cmd_job_name}


	module_path=`find ${dic[cfg_temp_dir]}/* -type d  -name  ${cmd_job_name}`
        if test -z "$module_path"; then module_path=${dic[cfg_temp_dir]}; fi


        #go????????????????????????????????????????????????????????????dockerfile build????????????????????????dockerfile??????????????????copy????????????
	check_env_by_cmd_v go
	info "????????????go????????????"
	#????????????
	if test -n "$opt_build_cmds" ;then
		cd $module_path && $opt_build_cmds
    	else
		cd $module_path && go build -o ./
    	fi
	dic[tmp_build_dist_path]=$module_path

  info "??????go?????????????????????"

	check_env_by_cmd_v docker
	# ????????????
	image_path=${cmd_job_name}_${tmp_docker_image_suffix}:latest
	if test ${dic[cfg_enable_harbor]} -eq 1;
	then
	   image_path=$cfg_harbor_address/$cfg_harbor_project/$image_path
  fi
	tar -cf dist.tar *
	docker build  --build-arg DEVOPS_RUN_ENV=${dic[opt_build_env]} \
		 -t $image_path -f  $tmp_dockerfile  ${dic[tmp_build_dist_path]}


    #????????????
	push $image_path
}

function tomcat_build() {

  cfg_temp_dir=${dic[cfg_temp_dir]}
	cmd_job_name=${dic[cmd_job_name]}
	opt_build_tool=${dic[opt_build_tool]}
	opt_build_cmds=${dic[opt_build_cmds]}
	opt_java_opts=${dic[opt_java_opts]}
	tmp_dockerfile=${dic[tmp_dockerfile]}
	cfg_harbor_address=${dic[cfg_harbor_address]}
	cfg_harbor_project=${dic[cfg_harbor_project]}
	tmp_docker_image_suffix=${dic[tmp_docker_image_suffix]}

	module_path=`find $cfg_temp_dir/* -type d  -name  ${cmd_job_name}`
        if test -z "$module_path"; then module_path=$cfg_temp_dir; fi

	case "$opt_build_tool"  in
	gradle)
		check_env_by_cmd_v gradle
		info "????????????gradle????????????"
		#????????????
		if test -n "$opt_build_cmds" ;then
			cd $module_path && $opt_build_cmds
        	else
			cd $module_path && gradle -x test clean build
        	fi
		dic[tmp_build_dist_path]=$module_path/build/libs
	 ;;
	maven)
		check_env_by_cmd_v mvn
		info "????????????maven????????????"
		 #????????????
                if test -n "$opt_build_cmds" ;then
			cd $module_path && ${opt_build_cmds}
		else
			cd $module_path && mvn clean -Dmaven.test.skip=true  compile package -U -am
		fi
		dic[tmp_build_dist_path]=$module_path/target
       	#to do
	 ;;
	*) warn "java project only support gradle or maven build"; exit 1; ;;
    	esac


	info "??????java?????????????????????"

	# ??????jar??????
	cd ${dic[tmp_build_dist_path]}
	jar_name=`ls | grep -v 'source'| grep ${cmd_job_name}`

	check_env_by_cmd_v docker
	# ????????????
	image_path=${cmd_job_name}_${tmp_docker_image_suffix}:latest
	if test ${dic[cfg_enable_harbor]} -eq 1;
	then
	   image_path=$cfg_harbor_address/$cfg_harbor_project/$image_path
  fi

	docker build --build-arg java_opts="$opt_java_opts"\
	       --build-arg tomcat_deploy_path=$cmd_job_name\
	       -t $image_path -f $tmp_dockerfile ${dic[tmp_build_dist_path]}

    #????????????
	push $image_path
    
}

function java_build() {
	cfg_temp_dir=${dic[cfg_temp_dir]}
	cmd_job_name=${dic[cmd_job_name]}
	opt_build_tool=${dic[opt_build_tool]}
	opt_build_cmds=${dic[opt_build_cmds]}
	opt_java_opts=${dic[opt_java_opts]}
	tmp_dockerfile=${dic[tmp_dockerfile]}	
	cfg_harbor_address=${dic[cfg_harbor_address]}
	cfg_harbor_project=${dic[cfg_harbor_project]}
	tmp_docker_image_suffix=${dic[tmp_docker_image_suffix]}

	module_path=`find $cfg_temp_dir/* -type d  -name  ${cmd_job_name}`
        if test -z "$module_path"; then module_path=$cfg_temp_dir; fi


	case "$opt_build_tool"  in
	gradle)
		check_env_by_cmd_v gradle
		info "????????????gradle????????????"
		#????????????
		if test -n "$opt_build_cmds" ;then
			cd $module_path && $opt_build_cmds
        	else
			cd $module_path && gradle -x test clean build
        	fi
		dic[tmp_build_dist_path]=$module_path/build/libs
	 ;;
	maven)
		check_env_by_cmd_v mvn
		info "????????????maven????????????"
		 #????????????
    if test -n "$opt_build_cmds" ;then
			cd $module_path && ${opt_build_cmds}
		else
			cd $module_path && mvn clean -Dmaven.test.skip=true  compile package -U -am
		fi
		dic[tmp_build_dist_path]=$module_path/target
       	#to do
	 ;;
	*) warn "java project only support gradle or maven build"; exit 1; ;;
    	esac


	info "??????java?????????????????????"

	# ??????jar??????
	cd ${dic[tmp_build_dist_path]}
	jar_name=`ls | grep -v 'source'| grep ${cmd_job_name}`
	
	check_env_by_cmd_v docker

	# ????????????
	image_path=${cmd_job_name}_${tmp_docker_image_suffix}:latest
	if test ${dic[cfg_enable_harbor]} -eq 1;
	then
	   image_path=$cfg_harbor_address/$cfg_harbor_project/$image_path
  fi
	docker build --build-arg jar_name=$jar_name\
	       --build-arg java_opts="$opt_java_opts"\
	       -t $image_path -f $tmp_dockerfile ${dic[tmp_build_dist_path]}

    #????????????
	push $image_path
}

function vue_build() {
  cfg_temp_dir=${dic[cfg_temp_dir]}
  cmd_job_name=${dic[cmd_job_name]}
	opt_build_cmds=${dic[opt_build_cmds]}
	opt_build_env=${dic[opt_build_env]}	
	cfg_harbor_address=${dic[cfg_harbor_address]}
	cfg_harbor_project=${dic[cfg_harbor_project]}
	tmp_dockerfile=${dic[tmp_dockerfile]}	
	tmp_docker_image_suffix=${dic[tmp_docker_image_suffix]}

	check_env_by_cmd_v npm	
	info "????????????node??????vue??????"
    module_path=`find $cfg_temp_dir/* -type d  -name  ${cmd_job_name}`
    if test -z "$module_path"; then module_path=$cfg_temp_dir; fi
	if test -n "$opt_build_cmds" ;then
		cd $module_path &&  npm --unsafe-perm install && $opt_build_cmds
	else
		if test -n "$opt_build_env" ;then
			cd $module_path && npm --unsafe-perm install && npm run build:$opt_build_env
		else
			cd $module_path && npm --unsafe-perm install && npm run build
		fi
	fi

	dic[tmp_build_dist_path]=$module_path/dist

    info "??????vue?????????????????????"
	cd ${dic[tmp_build_dist_path]}
	tar -cf dist.tar *
	check_env_by_cmd_v docker
	# ????????????
	image_path=${cmd_job_name}_${tmp_docker_image_suffix}:latest
	if test ${dic[cfg_enable_harbor]} -eq 1;
	then
	   image_path=$cfg_harbor_address/$cfg_harbor_project/$image_path
  fi
	docker build -t $image_path -f  $tmp_dockerfile  ${dic[tmp_build_dist_path]}

	#????????????
	push $image_path

}

function choose_dockerfile() {
	cmd_job_name=${dic[cmd_job_name]}
	opt_dockerfile=${dic[opt_dockerfile]}
	cfg_dockerfile_path=${dic[cfg_dockerfile_path]}
	cfg_enable_dockerfiles=${dic[cfg_enable_dockerfiles]}
	tmp_build_dist_path=${dic[tmp_build_dist_path]}

        if test ! -d ${tmp_build_dist_path} ; then
		error "please check scm url or job name(the last command),job name must be the module name";
                exit 1;
	fi		
	#info "????????????dockerfile???????????????"
	if test -n "${opt_dockerfile}"
	then
		echo "??????:?????????????????????dockerfile${opt_dockerfile}"
   		dic[tmp_dockerfile]=$cfg_dockerfile_path/${opt_dockerfile}-dockerfile 
	else
		dockerfiles=(${cfg_enable_dockerfiles//,/ })
		is_has_enable_docker_file=false
		for dockerfile in ${dockerfiles[@]} ;do
			if [[ $cmd_job_name == $dockerfile ]]
			then
			  echo "??????:?????????config.conf?????????dockerfile:${dockerfile}"
			  dic[tmp_dockerfile]=$cfg_dockerfile_path/${dockerfile}-dockerfile
			  is_has_enable_docker_file=true
			fi
		done
		if [ "$is_has_enable_docker_file" = false ]; then
			echo "??????:??????????????????dockerfile"
		   	dic[tmp_dockerfile]=$cfg_dockerfile_path/dockerfile
		fi
	fi
}



function render_template() {
	opt_template=${dic[opt_template]}
	cfg_devops_path=${dic[cfg_devops_path]}
	cfg_swarm_network=${dic[cfg_swarm_network]}
	cfg_template_path=${dic[cfg_template_path]}
	cfg_enable_templates=${dic[cfg_enable_templates]}
	cfg_deploy_gen_location=${dic[cfg_deploy_gen_location]}
	cmd_job_name=${dic[cmd_job_name]}
	tmp_image_path=${dic[tmp_image_path]}

        #info "????????????????????????"
	cd $cfg_template_path
	gen_long_time_str=`date +%s%N`

	 #????????????????????????
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

	#????????????
	sed -i "s#?module_name#${cmd_job_name}#g"  ./${gen_long_time_str}.yml
	sed -i "s#?module_name#${cmd_job_name}#g"  ./${gen_long_time_str}.yml
	sed -i "s#?image_path#${tmp_image_path}#g"  ./${gen_long_time_str}.yml
	sed -i "s#?network#${cfg_swarm_network}#g"  ./${gen_long_time_str}.yml
	#????????????
	if [ ! -d "$cfg_deploy_gen_location" ];then
	mkdir -p $cfg_deploy_gen_location
	fi
	\mv ./${gen_long_time_str}.yml $cfg_deploy_gen_location/${cmd_job_name}.yml
}

function deploy() {
        cfg_deploy_target=${dic[cfg_deploy_target]}
	if test -z "$cfg_deploy_target"  ; then
		info "??????????????????"
		local_deploy
	else
		echo "??????????????????"
		remote_deploy
	fi

}

function local_deploy() {
  	cfg_devops_path=${dic[cfg_devops_path]}
    cfg_build_platform=${dic[cfg_build_platform]}
    cfg_swarm_stack_name=${dic[cfg_swarm_stack_name]}
	cfg_deploy_gen_location=${dic[cfg_deploy_gen_location]}
    cmd_job_name=${dic[cmd_job_name]}

	deploy_job_yml=$cfg_deploy_gen_location/${cmd_job_name}.yml
        #????????????????????????
        if [ "$cfg_build_platform" = "KUBERNETES" ]
        then
                check_env_by_cmd_v kubectl
                info "????????????k8s????????????"
                kubectl apply -f  ${deploy_job_yml}
        elif [ "$cfg_build_platform" = "DOCKER_SWARM" ]
        then
                info "????????????docker swarm????????????"
                docker stack deploy -c ${deploy_job_yml} ${cfg_swarm_stack_name}  --with-registry-auth
        elif [ "$cfg_build_platform" = "DOCKER_COMPOSE" ]
        then
                check_env_by_cmd_v docker-compose
                info "????????????docker-compose ????????????"
                last_pwd=$PWD
                # ??????docker??????
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

	cfg_devops_path=${dic[cfg_devops_path]}
    cfg_build_platform=${dic[cfg_build_platform]}
    cfg_swarm_stack_name=${dic[cfg_swarm_stack_name]}
	cfg_deploy_target=${dic[cfg_deploy_target]}
	cfg_deploy_gen_location=${dic[cfg_deploy_gen_location]}
    cmd_job_name=${dic[cmd_job_name]}

	deploy_job_yml=$cfg_deploy_gen_location/${cmd_job_name}.yml

        array=(${cfg_deploy_target//:/ })
        user=${array[0]}
        ip=${array[1]}
        password=${array[2]}

        if test -z "$user" -o -z "$ip" -o -z "$password" ; then
                error '?????????????????????deploy_target??????????????????'
                exit 1
        fi


        #????????????????????????
        if [ "$cfg_build_platform" = "KUBERNETES" ]
        then
                info "????????????k8s????????????"
		remote_command="cat $deploy_job_yml | ssh $user@$ip 'kubectl apply -f -'"
        elif [ "$cfg_build_platform" = "DOCKER_SWARM" ]
        then
                info "????????????docker swarm????????????"
		remote_command="cat $deploy_job_yml | ssh $user@$ip 'docker stack deploy -c - ${cfg_swarm_stack_name} --with-registry-auth'"
        else
                info "????????????docker swarm????????????"
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
  enable_harbor=${dic[cfg_enable_harbor]}
	#????????????
	if test $enable_harbor -eq 1 ;
	then
	    info "?????????harbor????????????"
	    docker push $image_path
    fi
    info "$image_path"
    dic[tmp_image_path]=$image_path
}

function prune() {
	cfg_devops_path=${dic[cfg_devops_path]}
	cfg_temp_dir=${dic[cfg_temp_dir]}

	#???????????????
	cd $cfg_devops_path

	if [[ -n ${cfg_temp_dir} && ${cfg_temp_dir} != '/' && ${cfg_temp_dir} != '.' ]]
	then
	 rm -rf $cfg_temp_dir
  fi
	#!?????????????????????????????????
	echo 'start prune local images:'
	docker image prune -af --filter="label=maintainer=corp" --filter="until=24h"
}
