#!/bin/bash

# 测试中间件交互式部署功能
# 这个脚本用于验证新的动态模板选择和变量收集功能

# 设置测试环境
export DEVOPS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export DEBUG="true"

# 模拟环境变量
declare -A env
env[cfg_platform]="KUBERNETES"
env[cfg_k8s_namespace]="default"

# 导入必要的函数
source "${DEVOPS_ROOT}/bin/build.sh"

echo "🧪 测试中间件交互式部署功能"
echo "================================"

# 测试1: 扫描可用模板
echo
echo "📋 测试1: 扫描可用的中间件模板"
list_available_middleware_templates

echo "发现的模板:"
for i in "${!available_templates[@]}"; do
    echo "  $((i+1)). ${available_templates[i]} - ${available_descriptions[i]}"
done

# 测试2: 解析模板变量
echo
echo "📋 测试2: 解析 redis-standalone 模板变量"
parse_template_variables "redis-standalone"

echo "解析到的变量:"
for var in "${template_variables[@]}"; do
    IFS='|' read -r name type default desc required <<< "$var"
    echo "  - $name ($type): $desc"
    if [[ -n "$default" ]]; then
        echo "    默认值: $default"
    fi
    if [[ "$required" == "true" ]]; then
        echo "    必填项: 是"
    fi
done

# 测试3: 解析 mysql-standalone 模板变量
echo
echo "📋 测试3: 解析 mysql-standalone 模板变量"
parse_template_variables "mysql-standalone"

echo "解析到的变量:"
for var in "${template_variables[@]}"; do
    IFS='|' read -r name type default desc required <<< "$var"
    echo "  - $name ($type): $desc"
    if [[ -n "$default" ]]; then
        echo "    默认值: $default"
    fi
    if [[ "$required" == "true" ]]; then
        echo "    必填项: 是"
    fi
done

echo
echo "✅ 测试完成！"
echo
echo "💡 使用方法:"
echo "  devops run middleware -i"
echo "  或者"
echo "  devops run middleware redis-standalone my-redis -i"
