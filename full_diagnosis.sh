#!/bin/bash

# 完整的交互式功能诊断脚本
# 这个脚本会被删除，仅用于全面诊断问题

echo "=== 完整交互式功能诊断 ==="
echo

echo "🔍 第一步：检查基本环境"
echo "1. 检查脚本文件是否存在："
ls -la bin/devops bin/env.sh bin/build.sh bin/log.sh bin/tools.sh 2>/dev/null || echo "某些文件不存在"

echo
echo "2. 检查工作空间配置："
if [[ -f "workspace/enable" ]]; then
    echo "✓ workspace/enable 存在"
    echo "内容："
    cat workspace/enable
else
    echo "✗ workspace/enable 不存在"
fi

echo
echo "🔍 第二步：模拟参数解析"
echo "模拟 'devops run -i' 的参数解析过程："

# 模拟env.sh的参数解析
simulate_env_parsing() {
    echo "参数: $*"
    
    # 模拟parse_params函数
    local cmd_1="$1"
    shift
    echo "cmd_1='$cmd_1'"
    
    if [[ "$cmd_1" != "run" ]]; then
        echo "不是run命令，跳过"
        return
    fi
    
    # 处理第二个参数
    local opt_interactive=""
    local cmd_2=""
    
    if [[ "$1" == "-i" || "$1" == "--interactive" ]]; then
        echo "检测到交互式参数: $1"
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
    
    echo "解析结果:"
    echo "  cmd_1='$cmd_1'"
    echo "  cmd_2='$cmd_2'"
    echo "  opt_interactive='$opt_interactive'"
    
    # 模拟run()函数的逻辑
    echo
    echo "模拟run()函数逻辑:"
    if [[ "$opt_interactive" == "true" ]]; then
        echo "  ✓ 应该调用run_interactive()"
    else
        if [[ -n "$cmd_2" ]]; then
            echo "  ✓ 应该调用run_$cmd_2()"
        else
            echo "  ✗ 错误: run need be followed by a command"
        fi
    fi
}

simulate_env_parsing run -i

echo
echo "🔍 第三步：检查函数定义"
echo "检查关键函数是否正确定义："

# 检查函数定义的方法
check_function() {
    local func_name="$1"
    local file_path="$2"
    
    if grep -q "function $func_name\|$func_name()" "$file_path" 2>/dev/null; then
        echo "✓ $func_name 在 $file_path 中定义"
    else
        echo "✗ $func_name 在 $file_path 中未找到"
    fi
}

check_function "run" "bin/build.sh"
check_function "run_interactive" "bin/build.sh"
check_function "info" "bin/log.sh"
check_function "parse_params" "bin/env.sh"

echo
echo "🔍 第四步：检查脚本语法"
echo "检查关键脚本的语法："

check_syntax() {
    local file="$1"
    if bash -n "$file" 2>/dev/null; then
        echo "✓ $file 语法正确"
    else
        echo "✗ $file 语法错误："
        bash -n "$file"
    fi
}

check_syntax "bin/devops"
check_syntax "bin/env.sh"
check_syntax "bin/build.sh"

echo
echo "🔍 第五步：实际测试建议"
echo
echo "在服务器上运行以下命令进行逐步测试："
echo
echo "1. 测试参数解析："
echo "   DEBUG=true bash -c 'source bin/env.sh; echo \"cmd_1=\${env[cmd_1]}\"; echo \"opt_interactive=\${env[opt_interactive]}\"' run -i"
echo
echo "2. 测试函数定义："
echo "   bash -c 'source bin/build.sh; type run_interactive'"
echo
echo "3. 测试完整流程："
echo "   DEBUG=true devops run -i"
echo
echo "4. 如果仍然不工作，检查错误输出："
echo "   devops run -i 2>&1 | tee debug.log"
echo
echo "5. 检查是否有权限问题："
echo "   ls -la bin/devops"
echo "   chmod +x bin/devops"
echo

echo "🎯 预期的正确行为："
echo "当运行 'devops run -i' 时，应该看到："
echo "1. 埋点信息（工作空间信息）"
echo "2. 如果启用DEBUG，会看到调试信息"
echo "3. '进入交互式配置模式...' 消息"
echo "4. 部署类型选择菜单"
echo "5. 提示输入"
echo

echo "如果没有看到这些，问题可能在："
echo "- 工作空间配置文件缺失或损坏"
echo "- 脚本权限问题"
echo "- 环境变量作用域问题"
echo "- 函数定义加载问题"
echo

echo "测试完成后请删除此文件: rm full_diagnosis.sh"
