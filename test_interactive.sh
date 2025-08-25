#!/bin/bash

# 完整的交互式功能调试脚本
# 这个脚本会被删除，仅用于验证修复

echo "=== 完整交互式功能调试 ==="
echo

# 创建一个简单的测试函数来模拟参数解析
test_param_parsing() {
    echo "测试参数解析: $*"

    # 模拟 env.sh 的逻辑
    local cmd_1="$1"
    shift

    echo "  cmd_1: $cmd_1"

    if [[ "$cmd_1" == "run" ]]; then
        local opt_interactive=""
        local cmd_2=""
        local cmd_3=""

        # 处理第二个参数
        if [[ "$1" == "-i" || "$1" == "--interactive" ]]; then
            opt_interactive="true"
            shift
            if [[ $# -gt 0 && $1 != -* ]]; then
                cmd_2="$1"
                shift
            fi
        else
            cmd_2="$1"
            shift
        fi

        # 处理剩余参数
        while [[ $# -gt 0 ]]; do
            if [[ $1 == -* ]]; then
                case "$1" in
                    -i|--interactive) opt_interactive="true"; shift 1;;
                    *) echo "  其他选项: $1"; shift 1;;
                esac
            else
                cmd_3="$1"
                shift
                break
            fi
        done

        echo "  cmd_2: '$cmd_2'"
        echo "  cmd_3: '$cmd_3'"
        echo "  opt_interactive: '$opt_interactive'"

        # 模拟 run() 函数的逻辑
        if [[ "$opt_interactive" == "true" ]]; then
            echo "  -> 应该调用 run_interactive()"
        else
            if [[ -n "$cmd_2" ]]; then
                echo "  -> 应该调用 run_$cmd_2()"
            else
                echo "  -> 错误: run need be followed by a command"
            fi
        fi
    fi
    echo
}

# 测试各种命令格式
echo "=== 测试各种命令格式 ==="

echo "1. 测试: devops run java myapp"
test_param_parsing run java myapp

echo "2. 测试: devops run -i"
test_param_parsing run -i

echo "3. 测试: devops run java -i"
test_param_parsing run java -i

echo "4. 测试: devops run -i java"
test_param_parsing run -i java

echo "=== 实际问题诊断 ==="
echo
echo "根据测试结果，问题可能在于："
echo "1. 参数解析逻辑是否正确"
echo "2. env 数组的作用域问题"
echo "3. 函数调用的问题"
echo "4. while 循环的边界条件"
echo
echo "=== 修复建议 ==="
echo "1. 检查 while 循环条件：while [[ \$# -gt 0 ]] 而不是 while [ true ]"
echo "2. 检查参数引用：使用双引号包围变量"
echo "3. 添加调试输出确认参数解析结果"
echo "4. 检查函数定义和调用的作用域"

echo
echo "=== 完整修复内容 ==="
echo
echo "🔧 修复的问题："
echo "1. env.sh: while循环条件从 'while [ true ]' 改为 'while [[ \$# -gt 0 ]]'"
echo "2. env.sh: 修复变量引用 '\${opt_workspace}' -> '\${env[opt_workspace]}'"
echo "3. build.sh: 修复测试条件 'test -n \${env[cmd_2]}' -> 'test -n \"\${env[cmd_2]}\"'"
echo "4. 添加了完整的调试信息"
echo
echo "=== 调试步骤 ==="
echo "1. 启用调试模式："
echo "   export DEBUG=true"
echo
echo "2. 测试交互式命令："
echo "   DEBUG=true devops run -i"
echo
echo "3. 查看调试输出，应该显示："
echo "   DEBUG: 参数解析完成"
echo "   DEBUG: cmd_1='run'"
echo "   DEBUG: cmd_2=''"
echo "   DEBUG: opt_interactive='true'"
echo "   DEBUG: 进入run()函数"
echo "   DEBUG: 进入run_interactive()函数"
echo "   进入交互式配置模式..."
echo
echo "4. 如果仍然不工作，检查："
echo "   - 工作空间配置是否正确"
echo "   - 是否有语法错误"
echo "   - 函数定义是否正确加载"
echo
echo "=== 预期的完整流程 ==="
echo "devops run -i 应该："
echo "1. 加载 env.sh 并解析参数"
echo "2. 设置 env[opt_interactive]=true"
echo "3. 调用 build.sh 的 run() 函数"
echo "4. run() 检查 opt_interactive 为 true"
echo "5. 调用 run_interactive() 函数"
echo "6. 显示交互式配置界面"
echo
echo "测试完成后请删除此文件: rm test_interactive.sh"
