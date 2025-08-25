#!/bin/bash

# 简单的交互式功能调试脚本
# 这个脚本会被删除，仅用于验证修复

echo "=== 交互式功能调试 ==="
echo

echo "🔍 关键问题发现："
echo "原来的 run() 函数中有重复的逻辑检查"
echo "bin/devops 已经检查了 cmd_1='run'，不需要在 run() 函数中再次检查"
echo

echo "🔧 修复内容："
echo "1. 简化了 run() 函数的逻辑"
echo "2. 移除了重复的 case 语句"
echo "3. 直接检查 opt_interactive 并调用相应函数"
echo

echo "🎯 现在的逻辑流程："
echo "1. devops run -i"
echo "2. env.sh 解析参数: cmd_1='run', opt_interactive='true'"
echo "3. bin/devops 检查 cmd_1='run'，调用 run() 函数"
echo "4. run() 函数检查 opt_interactive='true'，调用 run_interactive()"
echo "5. run_interactive() 显示交互式界面"
echo

echo "🧪 测试命令："
echo "DEBUG=true devops run -i"
echo

echo "📋 预期的调试输出："
echo "DEBUG: 参数解析完成"
echo "DEBUG: cmd_1='run'"
echo "DEBUG: cmd_2=''"
echo "DEBUG: opt_interactive='true'"
echo "埋点: 当前的工作空间为:xxx"
echo "DEBUG: 进入run()函数"
echo "DEBUG: 调用run_interactive()"
echo "DEBUG: 进入run_interactive()函数"
echo "进入交互式配置模式..."
echo "支持的部署类型："
echo "  1) java   - Java项目（Spring Boot等）"
echo "  ..."
echo "🔹 请选择部署类型（输入序号或名称）:"
echo

echo "❌ 如果仍然不工作，可能的原因："
echo "1. 工作空间配置问题"
echo "2. 函数定义加载问题"
echo "3. 环境变量作用域问题"
echo "4. 脚本权限问题"
echo

echo "🔍 精确的参数解析模拟："
echo

# 模拟参数解析过程
simulate_parsing() {
    echo "模拟: devops run -i"
    echo "1. 初始参数: run -i"

    local cmd_1="$1"; shift
    echo "2. cmd_1='$cmd_1', 剩余参数: $*"

    local opt_interactive=""
    local cmd_2=""

    # 处理第二个参数
    if [[ "$1" == "-i" || "$1" == "--interactive" ]]; then
        echo "3. 检测到交互式参数: $1"
        opt_interactive="true"
        shift
        echo "4. 设置 opt_interactive='$opt_interactive', 剩余参数: $*"

        if [[ $# -gt 0 && $1 != -* ]]; then
            cmd_2="$1"
            shift
            echo "5. 设置 cmd_2='$cmd_2', 剩余参数: $*"
        else
            echo "5. 没有更多非选项参数，cmd_2保持为空"
        fi
    else
        cmd_2="$1"
        shift
        echo "3. 设置 cmd_2='$cmd_2', 剩余参数: $*"
    fi

    echo "6. 进入while循环处理剩余参数: $*"
    while [[ $# -gt 0 ]]; do
        echo "   处理参数: $1"
        if [[ $1 == -* ]]; then
            echo "   这是选项参数"
            case "$1" in
                -i|--interactive)
                    opt_interactive="true"
                    echo "   设置 opt_interactive='$opt_interactive'"
                    shift 1
                    ;;
                *)
                    echo "   其他选项: $1"
                    shift 1
                    ;;
            esac
        else
            echo "   这是位置参数，设置为cmd_3"
            break
        fi
    done

    echo "7. 最终结果:"
    echo "   cmd_1='$cmd_1'"
    echo "   cmd_2='$cmd_2'"
    echo "   opt_interactive='$opt_interactive'"
}

simulate_parsing run -i

echo
echo "🔍 进一步调试步骤："
echo "1. 在服务器上运行上述模拟"
echo "2. 检查实际的参数解析结果"
echo "3. 如果参数解析正确，检查函数调用"
echo

echo "测试完成后请删除此文件: rm debug_interactive.sh"
