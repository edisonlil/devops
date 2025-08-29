#!/bin/bash

# devops命令自动补全脚本
# 使用方法: source bin/devops-completion.bash

# 辅助函数：获取快捷键列表
_get_shortcuts() {
    local shortcuts=()
    local current_workspace=""

    # 获取当前工作空间
    if [[ -f "workspace/enable" ]]; then
        current_workspace=$(grep "ENABEL_WORKSPACE_PATH" workspace/enable 2>/dev/null | cut -d'"' -f2)
    fi

    if [[ -z "$current_workspace" ]]; then
        current_workspace="default"
    fi

    local workspace_path="workspace/$current_workspace"

    # 使用Python脚本获取快捷键列表
    if [[ -f "bin/shortcut_manager.py" && -d "$workspace_path" ]]; then
        shortcuts=($(python3 bin/shortcut_manager.py list --workspace "$workspace_path" 2>/dev/null | cut -d: -f1))
    fi

    echo "${shortcuts[@]}"
}

# 辅助函数：获取中间件模板列表
_get_middleware_templates() {
    local middleware_templates=()

    # 从全局模板目录获取中间件模板
    local templates_dir="templates"
    if [[ -d "${templates_dir}" ]]; then
        for platform_dir in "${templates_dir}"/*; do
            if [[ -d "${platform_dir}/middleware" ]]; then
                for template_dir in "${platform_dir}/middleware"/*; do
                    if [[ -d "${template_dir}" ]]; then
                        local template_name=$(basename "${template_dir}")
                        middleware_templates+=("${template_name}")
                    fi
                done
            fi
        done
    fi

    # 从当前workspace模板目录获取中间件模板（如果存在）
    local current_workspace=""
    if [[ -f "workspace/enable" ]]; then
        current_workspace=$(grep "ENABEL_WORKSPACE_PATH" workspace/enable 2>/dev/null | cut -d'"' -f2)
    fi

    if [[ -z "$current_workspace" ]]; then
        current_workspace="default"
    fi

    local workspace_templates_dir="workspace/$current_workspace/templates"
    if [[ -d "${workspace_templates_dir}" ]]; then
        for platform_dir in "${workspace_templates_dir}"/*; do
            if [[ -d "${platform_dir}/middleware" ]]; then
                for template_dir in "${platform_dir}/middleware"/*; do
                    if [[ -d "${template_dir}" ]]; then
                        local template_name=$(basename "${template_dir}")
                        middleware_templates+=("${template_name}")
                    fi
                done
            fi
        done
    fi

    # 去重并输出
    printf '%s\n' "${middleware_templates[@]}" | sort -u
}

# 辅助函数：补全模板ID
_complete_template_ids() {
    local template_ids=()

    # 从全局模板目录获取模板ID
    local templates_dir="templates"
    if [[ -d "${templates_dir}" ]]; then
        for platform_dir in "${templates_dir}"/*; do
            if [[ -d "${platform_dir}" ]]; then
                for template_dir in "${platform_dir}"/*; do
                    if [[ -d "${template_dir}" ]]; then
                        local template_id=$(basename "${template_dir}")
                        template_ids+=("${template_id}")
                    fi
                done
            fi
        done
    fi

    # 从当前workspace模板目录获取模板ID（如果存在）
    local current_workspace=""
    if [[ -f "workspace/enable" ]]; then
        current_workspace=$(grep "ENABEL_WORKSPACE_PATH" workspace/enable 2>/dev/null | cut -d'"' -f2)
    fi

    if [[ -n "${current_workspace}" ]]; then
        local workspace_templates_dir="workspace/${current_workspace}/templates"
        if [[ -d "${workspace_templates_dir}" ]]; then
            for platform_dir in "${workspace_templates_dir}"/*; do
                if [[ -d "${platform_dir}" ]]; then
                    for template_dir in "${platform_dir}"/*; do
                        if [[ -d "${template_dir}" ]]; then
                            local template_id=$(basename "${template_dir}")
                            template_ids+=("${template_id}")
                        fi
                    done
                fi
            done
        fi
    fi

    # 去重并补全
    local unique_templates=($(printf '%s\n' "${template_ids[@]}" | sort -u))
    COMPREPLY=($(compgen -W "${unique_templates[*]}" -- ${cur}))
}

# 辅助函数：补全workspace名称
_complete_workspaces() {
    local workspace_dir="workspace"
    if [[ -d "${workspace_dir}" ]]; then
        local workspaces=$(ls -1 "${workspace_dir}" 2>/dev/null | grep -v "deploy-target.sample" | grep -v "enable")
        COMPREPLY=($(compgen -W "${workspaces}" -- ${cur}))
    fi
}

_devops_completion() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    # 主命令选项
    local main_commands="run install-tools template env create copy shortcut middleware"

    # 项目类型选项
    local project_types="java vue golang tomcat python middleware"

    # 中间件模板选项
    local middleware_templates="redis-standalone redis-cluster mysql-standalone mysql-ha postgresql-standalone postgresql-ha kafka-standalone kafka-cluster elasticsearch-standalone elasticsearch-cluster mongodb-standalone mongodb-replicaset rabbitmq-standalone rabbitmq-cluster"

    # 中间件管理命令
    local middleware_actions="list status logs remove scale backup restore info templates"

    # 构建工具选项
    local build_tools="maven gradle"

    # 环境选项
    local build_envs="dev test gray prod"
    
    # 版本管理选项
    local version_specs="node: volta: jdk: java: maven: gradle: python: py:"
    
    # 全局选项
    local global_opts="--build-tool --git-url --git-branch --svn-url --java-opts --dockerfile --template --build-cmds --build-env --build-version --workspace --platform --namespace --app-port --expose-port --service-port --export-port --force-port --python-requirements --python-main --start-script -i --interactive --version --help"

    case ${COMP_CWORD} in
        1)
            # 第一个参数：主命令或快捷键名称
            local shortcuts=($(_get_shortcuts))
            local all_options="${main_commands} ${shortcuts[*]}"
            COMPREPLY=($(compgen -W "${all_options}" -- ${cur}))
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
                    COMPREPLY=($(compgen -W "--all --check --tools --java-version --python-version --help" -- ${cur}))
                    return 0
                    ;;
                "template")
                    COMPREPLY=($(compgen -W "list show copy create validate" -- ${cur}))
                    return 0
                    ;;
                "env")
                    COMPREPLY=($(compgen -W "use harbor-login harbor-secret" -- ${cur}))
                    return 0
                    ;;
                "create")
                    COMPREPLY=($(compgen -W "workspace" -- ${cur}))
                    return 0
                    ;;
                "copy")
                    COMPREPLY=($(compgen -W "workspace" -- ${cur}))
                    return 0
                    ;;
                "shortcut")
                    COMPREPLY=($(compgen -W "save run list show delete edit help" -- ${cur}))
                    return 0
                    ;;
                "middleware")
                    COMPREPLY=($(compgen -W "${middleware_actions}" -- ${cur}))
                    return 0
                    ;;
            esac
            ;;
        3)
            # 第三个参数：处理template子命令的参数
            if [[ ${COMP_WORDS[1]} == "template" ]]; then
                case "${COMP_WORDS[2]}" in
                    "show"|"copy")
                        # 补全模板ID（从全局模板目录获取）
                        _complete_template_ids
                        return 0
                        ;;
                    "create")
                        # template create 需要模板ID
                        _complete_template_ids
                        return 0
                        ;;
                    "validate")
                        # template validate 需要workspace名称
                        _complete_workspaces
                        return 0
                        ;;
                esac
            elif [[ ${COMP_WORDS[1]} == "copy" ]]; then
                case "${COMP_WORDS[2]}" in
                    "workspace")
                        # copy workspace 需要源workspace名称
                        _complete_workspaces
                        return 0
                        ;;
                esac
            elif [[ ${COMP_WORDS[1]} == "shortcut" ]]; then
                case "${COMP_WORDS[2]}" in
                    "run"|"show"|"delete"|"edit")
                        # 补全快捷键名称
                        local shortcuts=($(_get_shortcuts))
                        COMPREPLY=($(compgen -W "${shortcuts[*]}" -- ${cur}))
                        return 0
                        ;;
                    "save")
                        # shortcut save 需要快捷键名称（用户输入）
                        return 0
                        ;;
                esac
            elif [[ ${COMP_WORDS[1]} == "run" && ${COMP_WORDS[2]} == "middleware" ]]; then
                # run middleware 需要中间件模板名称
                local available_templates=($(_get_middleware_templates))
                COMPREPLY=($(compgen -W "${available_templates[*]}" -- ${cur}))
                return 0
            elif [[ ${COMP_WORDS[1]} == "middleware" ]]; then
                case "${COMP_WORDS[2]}" in
                    "status"|"logs"|"remove"|"scale"|"backup"|"restore"|"info")
                        # 这些命令需要中间件实例名称，暂时不提供补全
                        return 0
                        ;;
                    "templates")
                        COMPREPLY=($(compgen -W "list show validate copy create" -- ${cur}))
                        return 0
                        ;;
                esac
            fi
            ;;
        4)
            # 第四个参数：处理template create的job名称
            if [[ ${COMP_WORDS[1]} == "template" && ${COMP_WORDS[2]} == "create" ]]; then
                # 这里是job名称，不提供补全
                return 0
            fi
            # 处理template validate的job名称
            if [[ ${COMP_WORDS[1]} == "template" && ${COMP_WORDS[2]} == "validate" ]]; then
                # 这里是job名称，不提供补全
                return 0
            fi
            # 处理copy workspace的目标workspace名称
            if [[ ${COMP_WORDS[1]} == "copy" && ${COMP_WORDS[2]} == "workspace" ]]; then
                # 这里是目标workspace名称，不提供补全（用户自定义）
                return 0
            fi
            ;;
        *)
            # 处理选项参数
            case "${prev}" in
                "--build-tool")
                    COMPREPLY=($(compgen -W "${build_tools}" -- ${cur}))
                    return 0
                    ;;
                "--build-env")
                    # --build-env 不再处理版本信息，只提供构建环境
                    COMPREPLY=($(compgen -W "${build_envs}" -- ${cur}))
                    return 0
                    ;;
                "--build-version")
                    # --build-version 专门处理版本信息
                    if [[ "${cur}" == *":"* ]]; then
                        # 已经输入了工具名，提供版本建议
                        local tool_name="${cur%%:*}"
                        case "$tool_name" in
                            "node")
                                COMPREPLY=($(compgen -W "node:18.12 node:18 node:16 node:lts" -- ${cur}))
                                ;;
                            "jdk"|"java")
                                COMPREPLY=($(compgen -W "jdk:17 jdk:11 jdk:8 java:17 java:11" -- ${cur}))
                                ;;
                            "maven")
                                COMPREPLY=($(compgen -W "maven:3.9.3 maven:3.8.6 maven:3.6.3" -- ${cur}))
                                ;;
                            "gradle")
                                COMPREPLY=($(compgen -W "gradle:8.0 gradle:7.6 gradle:6.9" -- ${cur}))
                                ;;
                            "volta")
                                COMPREPLY=($(compgen -W "volta:18.12 volta:18 volta:16 volta:lts" -- ${cur}))
                                ;;
                            "python"|"py")
                                COMPREPLY=($(compgen -W "python:3.11 python:3.10 python:3.9 python:3.8 py:3.11 py:3.10" -- ${cur}))
                                ;;
                        esac
                    else
                        # 提供工具名建议
                        COMPREPLY=($(compgen -W "${version_specs}" -- ${cur}))
                    fi
                    return 0
                    ;;
                "--service-port")
                    # 服务端口补全
                    if [[ ${cur} == *:* ]]; then
                        # 已经输入了端口名，补全端口号
                        local port_prefix="${cur%:*}:"
                        local port_part="${cur##*:}"
                        case "${port_prefix}" in
                            "http:")
                                COMPREPLY=($(compgen -W "80 8080 3000 4200" -P "${port_prefix}" -- ${port_part}))
                                ;;
                            "admin:")
                                COMPREPLY=($(compgen -W "9090 8090 9000" -P "${port_prefix}" -- ${port_part}))
                                ;;
                            "api:")
                                COMPREPLY=($(compgen -W "8080 9080 3000" -P "${port_prefix}" -- ${port_part}))
                                ;;
                            *)
                                COMPREPLY=($(compgen -W "80 8080 9090 3000" -P "${port_prefix}" -- ${port_part}))
                                ;;
                        esac
                    else
                        # 补全端口格式示例
                        COMPREPLY=($(compgen -W "8080 http:8080 admin:9090 8080,9090 http:8080,admin:9090" -- ${cur}))
                    fi
                    return 0
                    ;;
                "--export-port")
                    # 导出端口补全（NodePort范围）
                    if [[ ${cur} == *:* ]]; then
                        # 已经输入了端口名，补全NodePort端口号
                        local port_prefix="${cur%:*}:"
                        local port_part="${cur##*:}"
                        case "${port_prefix}" in
                            "http:")
                                COMPREPLY=($(compgen -W "30080 30000 30001" -P "${port_prefix}" -- ${port_part}))
                                ;;
                            "admin:")
                                COMPREPLY=($(compgen -W "30090 30002 30003" -P "${port_prefix}" -- ${port_part}))
                                ;;
                            *)
                                COMPREPLY=($(compgen -W "30080 30090 30000" -P "${port_prefix}" -- ${port_part}))
                                ;;
                        esac
                    else
                        # 补全NodePort格式示例
                        COMPREPLY=($(compgen -W "30080 http:30080 admin:30090 30080,30090 http:30080,admin:30090" -- ${cur}))
                    fi
                    return 0
                    ;;
                "--git-url"|"--svn-url")
                    # 对于URL，不提供补全
                    return 0
                    ;;
                "--workspace")
                    # 补全workspace目录
                    _complete_workspaces
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
                "--java-version")
                    # Java版本补全
                    COMPREPLY=($(compgen -W "8 11 17 21" -- ${cur}))
                    return 0
                    ;;
                "--python-version")
                    # Python版本补全
                    COMPREPLY=($(compgen -W "3.8 3.9 3.10 3.11 3.12" -- ${cur}))
                    return 0
                    ;;
                "--template")
                    # 补全模板ID（包括全局和workspace模板）
                    _complete_template_ids
                    return 0
                    ;;
                "workspace")
                    # 补全 create workspace 参数
                    if [[ ${COMP_WORDS[1]} == "create" ]]; then
                        COMPREPLY=($(compgen -W "--platform --namespace --stack --network --git-url --git-branch --maven-settings --gradle-init-script --build-version --set-default -i --interactive" -- ${cur}))
                        return 0
                    fi
                    # 补全 copy workspace 参数
                    if [[ ${COMP_WORDS[1]} == "copy" ]]; then
                        COMPREPLY=($(compgen -W "--platform --namespace --stack --network --harbor-project --set-default -i --interactive" -- ${cur}))
                        return 0
                    fi
                    # 补全 template copy --workspace 参数
                    if [[ ${COMP_WORDS[1]} == "template" && ${COMP_WORDS[2]} == "copy" ]]; then
                        _complete_workspaces
                        return 0
                    fi
                    ;;
                "--dockerfile")
                    # 补全dockerfile文件
                    COMPREPLY=($(compgen -f -X '!Dockerfile*' -- ${cur}))
                    return 0
                    ;;
                *)
                    # 处理template命令的特殊选项
                    if [[ ${COMP_WORDS[1]} == "template" ]]; then
                        case "${COMP_WORDS[2]}" in
                            "copy")
                                # template copy 命令的选项
                                if [[ ${cur} == -* ]]; then
                                    COMPREPLY=($(compgen -W "--workspace" -- ${cur}))
                                fi
                                return 0
                                ;;
                            "create")
                                # template create 命令的选项
                                if [[ ${cur} == -* ]]; then
                                    COMPREPLY=($(compgen -W "--workspace --param --output --dry-run" -- ${cur}))
                                fi
                                return 0
                                ;;
                        esac
                    fi

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
