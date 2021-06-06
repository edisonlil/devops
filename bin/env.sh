#!/bin/bash
source ./tools.sh
source ./devops_help

#必须先声明
declare -A env

#保存不同远程主机信息的私密文件
env[cfg_devops_secret]=$HOME/.devops/deploy-target

#获取当前shell文件所在路径
env[cfg_devops_bin_path]=$(dirname $(readlink -f "$0"))

#devops项目所在路径
env[cfg_devops_path]=`cd ${env[cfg_devops_bin_path]} && cd ../ && pwd`

function parse_params() {
        case "$1" in
	      -v) devops_version ; exit 1;;
	      -h)  devops_help ; exit 1;;
        --version) devops_version ; exit 1;;
        *)
                env[cmd_1]=$1
                shift 1
                case "$1" in
                -h)  echo "thanks for use devops!" ; exit 1;;
                *)
                        env[cmd_2]=$1
                        shift 1
                        while [ true ] ; do
                                if [[ $1 == -* ]];then
                                        case "$1" in
                                        --build-tool) env[opt_build_tool]=$2; shift 2;;
                                        --git-url) env[opt_git_url]=$2;  shift 2;;
                                        --svn-url) env[opt_svn_url]=$2; shift 2;;
                                        --java-opts) env[opt_java_opts]=$2; shift 2;;
                                        --dockerfile) env[opt_dockerfile]=$2; shift 2;;
										--template) env[opt_template]=$2; shift 2;;
										--git-branch) env[opt_git_branch]=$2; shift 2;;
										--build-cmds) env[opt_build_cmds]=$2; shift 2;;
                                        --build-env) env[opt_build_env]=$2; shift 2;;
										--workspace) env[opt_workspace]=$2; shift 2;;
                                        *) error "unknown parameter or command $1 ." ; exit 1 ; break;;
                                        esac
                                else
                                        env[cmd_3]=$1
                                        shift 1
                                        break
                                fi
                        done

                ;;  esac
        ;; esac
}


#解析命令行参数
parse_params "$@"


#激活配置
env[cfg_workspace_dir_name]="workspace"
source ${env[cfg_devops_path]}/${env[cfg_workspace_dir_name]}/enable


#如果命令行没有指定 --workspace 工作空间，那么使用enable文件配置的默认工作空间
if test -z ${env[opt_workspace]}; then
	env[cfg_enable_path]=$ENABEL_WORKSPACE_PATH
	env[opt_workspace]=${env[cfg_enable_path]}
	env[cfg_workspace_path]=${env[cfg_devops_path]}/${env[cfg_workspace_dir_name]}/${env[cfg_enable_path]}
else
	env[cfg_workspace_path]=${env[cfg_devops_path]}/${env[cfg_workspace_dir_name]}/${env[opt_workspace]}

fi

if test -f ${env[cfg_devops_secret]} ; then
    source ${env[cfg_devops_secret]}
    env[cfg_deploy_target]=`eval echo '$'"${env[opt_workspace]}"`
fi


#设置deploy文件生成位置
info "埋点: 当前的工作空间为:${opt_workspace}"
env[cfg_deploy_gen_location]=${env[cfg_devops_path]}/deploy/${env[opt_workspace]}

#加载配置
source ${env[cfg_workspace_path]}/config
#读取配置变量
env[cfg_enable_harbor]=$BUILD_ENABEL_HARBOR
env[cfg_harbor_address]=$BUILD_HARBOR_ADDRESS
env[cfg_harbor_project]=$BUILD_HARBOR_PROJECT
env[cfg_build_platform]=$BUILD_PLATFORM
env[cfg_swarm_stack_name]=$BUILD_DOCKER_STACK_NAME
env[cfg_enable_dockerfiles]=$BUILD_ENABEL_DOCKERFILES
env[cfg_swarm_network]=$BUILD_DOCKER_SWARM_NETWORK
env[cfg_enable_templates]=$BUILD_ENABEL_TEMPLATES
env[cfg_main_project_name]=
env[cfg_java_extra_opts]=


#java命令，选项默认值
if [ ${env[opt_build_tool]} == ""  ]
then
env[opt_build_tool]=gradle
fi


env[cfg_dockerfile_path]=${env[cfg_workspace_path]}/dockerfile

env[cfg_template_path]=${env[cfg_workspace_path]}/template


env[cfg_deploy_gen_location]=${env[cfg_devops_path]}/deploy/${env[opt_workspace]}




