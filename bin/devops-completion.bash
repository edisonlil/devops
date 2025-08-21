#!/bin/bash

# devops命令自动补全脚本
# 使用方法: source bin/devops-completion.bash

_devops_completion() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    # 主命令选项
    local main_commands="run install-tools template env create"

    # 项目类型选项
    local project_types="java vue golang tomcat"

    # 构建工具选项
    local build_tools="maven gradle"

    # 环境选项
    local build_envs="dev test gray prod"
    
    # 全局选项
    local global_opts="--build-tool --git-url --git-branch --svn-url --java-opts --dockerfile --template --build-cmds --build-env --workspace --namespace --version --help"

    case ${COMP_CWORD} in
        1)
            # 第一个参数：主命令
            COMPREPLY=($(compgen -W "${main_commands}" -- ${cur}))
            return 0
            ;;
        2)
            # 第二个参数：根据主命令提供不同选项
            case "${prev}" in
                "run")
                    COMPREPLY=($(compgen -W "${project_types}" -- ${cur}))
                    return 0
                    ;;
                "install-tools")
                    COMPREPLY=($(compgen -W "--all --check --tools --java-version --help" -- ${cur}))
                    return 0
                    ;;
                "template")
                    COMPREPLY=($(compgen -W "list create delete update export import validate" -- ${cur}))
                    return 0
                    ;;
                "env")
                    COMPREPLY=($(compgen -W "use" -- ${cur}))
                    return 0
                    ;;
                "create")
                    COMPREPLY=($(compgen -W "workspace" -- ${cur}))
                    return 0
                    ;;
            esac
            ;;
        *)
            # 处理选项参数
            case "${prev}" in
                "--build-tool")
                    COMPREPLY=($(compgen -W "${build_tools}" -- ${cur}))
                    return 0
                    ;;
                "--build-env")
                    COMPREPLY=($(compgen -W "${build_envs}" -- ${cur}))
                    return 0
                    ;;
                "--git-url"|"--svn-url")
                    # 对于URL，不提供补全
                    return 0
                    ;;
                "--workspace")
                    # 补全workspace目录
                    local workspace_dir="workspace"
                    if [[ -d "${workspace_dir}" ]]; then
                        local workspaces=$(ls -1 "${workspace_dir}" 2>/dev/null | grep -v "deploy-target.sample")
                        COMPREPLY=($(compgen -W "${workspaces}" -- ${cur}))
                    fi
                    return 0
                    ;;
                "use")
                    # 补全: devops env use <workspace>
                    if [[ ${COMP_WORDS[1]} == "env" ]]; then
                        local workspace_dir="workspace"
                        if [[ -d "${workspace_dir}" ]]; then
                            local workspaces=$(ls -1 "${workspace_dir}" 2>/dev/null | grep -v "deploy-target.sample")
                            COMPREPLY=($(compgen -W "${workspaces}" -- ${cur}))
                        fi
                        return 0
                    fi
                    ;;
                "--namespace")
                    # 常用的k8s namespace
                    COMPREPLY=($(compgen -W "default kube-system kube-public dev test prod" -- ${cur}))
                    return 0
                    ;;
                "--template")
                    # 补全模板文件
                    local template_dir="templates"
                    if [[ -d "${template_dir}" ]]; then
                        local templates=$(ls -1 "${template_dir}" 2>/dev/null)
                        COMPREPLY=($(compgen -W "${templates}" -- ${cur}))
                    fi
                    return 0
                    ;;
                "workspace")
                    # 补全 create workspace 参数
                    if [[ ${COMP_WORDS[1]} == "create" ]]; then
                        COMPREPLY=($(compgen -W "--platform --namespace --stack --network --git-url --git-branch --maven-settings --gradle-init-script --set-default -i --interactive" -- ${cur}))
                        return 0
                    fi
                    ;;
                "--dockerfile")
                    # 补全dockerfile文件
                    COMPREPLY=($(compgen -f -X '!Dockerfile*' -- ${cur}))
                    return 0
                    ;;
                *)
                    # 默认提供全局选项
                    if [[ ${cur} == -* ]]; then
                        COMPREPLY=($(compgen -W "${global_opts}" -- ${cur}))
                    fi
                    return 0
                    ;;
            esac
            ;;
    esac
}

# 注册补全函数
complete -F _devops_completion devops

# 如果devops命令在PATH中，也为其注册补全
if command -v devops >/dev/null 2>&1; then
    complete -F _devops_completion devops
fi

#echo "devops命令自动补全已启用"
#echo "使用方法: 输入 'devops' 然后按Tab键查看可用选项"
#echo ""
#echo "示例:"
#echo "  devops <Tab>           # 显示主命令: run, install-tools, template, shortcuts"
#echo "  devops run <Tab>       # 显示项目类型: java, vue, golang, tomcat"
#echo "  devops shortcuts <Tab> # 显示shortcuts选项"
#echo "  devops run java --<Tab> # 显示可用选项"
