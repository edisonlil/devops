#!/bin/bash

# 获取脚本所在目录
ENV_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$ENV_SCRIPT_DIR/tools.sh"
source "$ENV_SCRIPT_DIR/devops_help"

#必须先声明
declare -A env

#保存不同远程主机信息的私密文件
env[cfg_devops_secret]=$HOME/.devops/deploy-target

#获取当前shell文件所在路径
env[cfg_devops_bin_path]=$(dirname $(readlink -f "$0"))

#devops项目所在路径
env[cfg_devops_path]=`cd ${env[cfg_devops_bin_path]} && cd ../ && pwd`

function parse_params() {
        # 无参数时显示帮助
        if [[ -z "$1" ]]; then
                devops_help ; exit 1;
        fi
        case "$1" in
              -v) devops_version ; exit 1;;
              -h)  devops_help ; exit 1;;
        --version) devops_version ; exit 1;;
        --help) devops_help ; exit 1;;
        *)
                env[cmd_1]=$1
                shift 1

                # 特殊处理install-tools命令
                if [[ "${env[cmd_1]}" == "install-tools" ]]; then
                    # 对于install-tools命令，直接解析其参数
                    while [[ $# -gt 0 ]]; do
                        case "$1" in
                            --all) env[opt_install_all]=true; shift 1;;
                            --check) env[opt_install_check]=true; shift 1;;
                            --tools) env[opt_install_tools]=$2; shift 2;;
                            --java-version) env[opt_java_version]=$2; shift 2;;
                            --help) env[opt_install_help]=true; shift 1;;
                            *) break;;
                        esac
                    done
                    return 0
                fi

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
                                        --static-dir) env[opt_static_dir]=$2; shift 2;;
										--template) env[opt_template]=$2; shift 2;;
										--git-branch) env[opt_git_branch]=$2; shift 2;;
										--build-cmds) env[opt_build_cmds]=$2; shift 2;;
                                        --build-env) env[opt_build_env]=$2; shift 2;;
                                        --build-version) env[opt_build_version]=$2; shift 2;;
										--workspace) env[opt_workspace]=$2; shift 2;;
                                        --namespace) env[opt_namespace]=$2; shift 2;;
                                        --app-port) env[opt_app_port]=$2; shift 2;;
                                        --expose-port) env[opt_expose_port]=$2; shift 2;;
                                        --service-port) env[opt_service_port]=$2; shift 2;;
                                        --export-port) env[opt_export_port]=$2; shift 2;;
                                        --force-port) env[opt_force_port]=true; shift 1;;
                                        -i|--interactive) env[opt_interactive]=true; shift 1;;
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
env[cfg_deploy_gen_location]=${env[cfg_workspace_path]}/deploy

#加载配置
source ${env[cfg_workspace_path]}/config
#读取配置变量
env[cfg_enable_harbor]=$BUILD_ENABEL_HARBOR
env[cfg_harbor_address]=$BUILD_HARBOR_ADDRESS
env[cfg_harbor_project]=$BUILD_HARBOR_PROJECT
env[cfg_harbor_username]=$BUILD_HARBOR_USERNAME
env[cfg_harbor_password]=$BUILD_HARBOR_PASSWORD
env[cfg_build_platform]=$BUILD_PLATFORM
env[cfg_swarm_stack_name]=$BUILD_DOCKER_STACK_NAME
env[cfg_enable_dockerfiles]=$BUILD_ENABEL_DOCKERFILES
env[cfg_swarm_network]=$BUILD_DOCKER_SWARM_NETWORK
env[cfg_k8s_namespace]=$BUILD_K8S_NAMESPACE
env[cfg_git_branch]=$BUILD_GIT_BRANCH
env[cfg_git_url]=$BUILD_GIT_URL
env[cfg_main_project_name]=
env[cfg_maven_settings]=$BUILD_MAVEN_SETTINGS
env[cfg_gradle_init_script]=$BUILD_GRADLE_INIT_SCRIPT
env[cfg_build_version]=$BUILD_VERSION
env[cfg_java_extra_opts]=

# namespace处理逻辑：命令行参数优先于配置文件
if [[ -n "${env[opt_namespace]}" ]]; then
    env[cfg_k8s_namespace]=${env[opt_namespace]}
elif [[ -z "${env[cfg_k8s_namespace]}" ]]; then
    # 如果配置文件和命令行都没有指定，使用默认namespace
    env[cfg_k8s_namespace]="default"
fi

# 若未显式传入 --git-branch，使用 workspace 默认分支
if [[ -z "${env[opt_git_branch]}" && -n "${env[cfg_git_branch]}" ]]; then
    env[opt_git_branch]=${env[cfg_git_branch]}
fi

# 若未显式传入 --git-url 或 --svn-url，使用 workspace 默认 git 地址
if [[ -z "${env[opt_git_url]}" && -z "${env[opt_svn_url]}" && -n "${env[cfg_git_url]}" ]]; then
    env[opt_git_url]=${env[cfg_git_url]}
fi

#java命令，选项默认值
if [ "${env[opt_build_tool]}" == "" ]
then
env[opt_build_tool]=maven
fi


env[cfg_dockerfile_path]=${env[cfg_workspace_path]}/dockerfile

# 模板路径配置
env[cfg_global_template_path]=${env[cfg_devops_path]}/templates
env[cfg_workspace_template_path]=${env[cfg_workspace_path]}/templates
env[cfg_template_path]=${env[cfg_global_template_path]}  # 保持向后兼容





