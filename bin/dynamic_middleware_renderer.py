#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DevOps 动态中间件模板渲染器
支持任意参数的动态模板渲染，无需预定义变量列表
"""

import os
import sys
import yaml
import argparse
import logging
import base64
import secrets
import string
import re
from pathlib import Path
from typing import Dict, Any, Optional

try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    JINJA2_AVAILABLE = True
except ImportError:
    JINJA2_AVAILABLE = False

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DynamicMiddlewareRenderer:
    """动态中间件Jinja2模板渲染器 - 支持任意参数"""
    
    def __init__(self, template_path: str, output_path: str):
        self.template_path = Path(template_path).resolve()  # 解析为绝对路径
        self.output_path = Path(output_path).resolve()      # 解析为绝对路径
        self.variables = {}

        logger.info(f"初始化渲染器: 模板={self.template_path}, 输出={self.output_path}")
        
        if not JINJA2_AVAILABLE:
            logger.error("Jinja2 未安装，请运行: pip3 install Jinja2")
            sys.exit(1)
            
        # 设置Jinja2环境
        template_dir = self.template_path.parent
        self.env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(['html', 'xml']),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # 添加自定义过滤器
        self.env.filters['b64encode'] = self._b64encode_filter
        self.env.filters['generate_password'] = self._generate_password_filter
        self.env.filters['default'] = self._default_filter
        
    def _b64encode_filter(self, value: str) -> str:
        """Base64编码过滤器"""
        if value == 'auto-generate':
            # 生成随机密码
            password = self._generate_random_password()
            return base64.b64encode(password.encode()).decode()
        return base64.b64encode(str(value).encode()).decode()
    
    def _generate_password_filter(self, length: int = 16) -> str:
        """生成随机密码过滤器"""
        return self._generate_random_password(length)
    
    def _default_filter(self, value, default_value) -> Any:
        """默认值过滤器"""
        return value if value is not None and value != '' else default_value
    
    def _generate_random_password(self, length: int = 16) -> str:
        """生成随机密码"""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def set_variables(self, variables: Dict[str, Any]):
        """设置模板变量"""
        self.variables = variables
        
        # 自动处理一些特殊变量
        self._process_special_variables()
        
    def _process_special_variables(self):
        """处理特殊变量（如资源计算、密码生成等）"""
        # 计算内存请求值
        if 'memory_limit' in self.variables:
            memory_request, cpu_request, cpu_limit = self._calculate_resource_requests(
                self.variables['memory_limit']
            )
            self.variables.setdefault('memory_request', memory_request)
            self.variables.setdefault('cpu_request', cpu_request)
            self.variables.setdefault('cpu_limit', cpu_limit)
        
        # 处理auto-generate密码
        for key, value in list(self.variables.items()):
            if isinstance(value, str) and value == 'auto-generate' and 'password' in key:
                self.variables[key] = self._generate_random_password()
                logger.info(f"自动生成密码: {key}")
    
    def _calculate_resource_requests(self, memory_limit: str) -> tuple:
        """计算资源请求值（通常是限制的70%）"""
        match = re.match(r'^(\d+)([MG])i?$', memory_limit)
        if match:
            value = int(match.group(1))
            unit = match.group(2)
            request_value = int(value * 0.7)
            memory_request = f"{request_value}{unit}i"
        else:
            memory_request = "256Mi"
        
        return memory_request, "100m", "500m"  # memory_request, cpu_request, cpu_limit
        
    def render_template(self) -> bool:
        """渲染模板文件"""
        try:
            if not self.template_path.exists():
                logger.error(f"模板文件不存在: {self.template_path.absolute()}")
                logger.error(f"请检查路径是否正确")
                return False
                
            # 加载模板
            template_name = self.template_path.name
            template = self.env.get_template(template_name)
            
            # 渲染模板
            rendered_content = template.render(**self.variables)
            
            # 确保输出目录存在
            self.output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # 写入渲染后的内容
            with open(self.output_path, 'w', encoding='utf-8') as f:
                f.write(rendered_content)
                
            logger.info(f"动态中间件模板渲染成功: {self.output_path}")
            return True
            
        except Exception as e:
            logger.error(f"动态中间件模板渲染失败: {e}")
            return False
    
    def validate_yaml(self, content: str) -> bool:
        """验证YAML语法"""
        try:
            # 尝试解析YAML
            list(yaml.safe_load_all(content))
            return True
        except yaml.YAMLError as e:
            logger.error(f"YAML语法错误: {e}")
            return False


def parse_dynamic_arguments():
    """动态解析命令行参数"""
    parser = argparse.ArgumentParser(
        description='动态中间件模板渲染器 - 支持任意参数',
        add_help=False  # 禁用默认帮助，因为我们要支持动态参数
    )
    
    # 只定义必需的基础参数
    parser.add_argument('--template', required=True, help='模板文件路径')
    parser.add_argument('--output', required=True, help='输出文件路径')
    parser.add_argument('--validate', action='store_true', help='验证生成的YAML文件')
    parser.add_argument('--help', '-h', action='store_true', help='显示帮助信息')
    
    # 解析已知参数和未知参数
    args, unknown_args = parser.parse_known_args()
    
    if args.help:
        print("动态中间件模板渲染器")
        print("支持任意 --参数名 值 的形式传递模板变量")
        print("\n必需参数:")
        print("  --template PATH    模板文件路径")
        print("  --output PATH      输出文件路径")
        print("\n可选参数:")
        print("  --validate         验证生成的YAML文件")
        print("  --help, -h         显示此帮助信息")
        print("\n动态参数:")
        print("  --任意参数名 值     传递给模板的变量")
        print("  例如: --instance-name redis --memory-limit 512Mi")
        sys.exit(0)
    
    # 动态解析所有未知参数
    variables = {}
    i = 0
    while i < len(unknown_args):
        if unknown_args[i].startswith('--'):
            param_name = unknown_args[i][2:]  # 移除 '--' 前缀
            # 将连字符转换为下划线（模板变量约定）
            var_name = param_name.replace('-', '_')
            
            # 获取参数值
            if i + 1 < len(unknown_args) and not unknown_args[i + 1].startswith('--'):
                var_value = unknown_args[i + 1]
                i += 2
            else:
                # 布尔参数（没有值）
                var_value = True
                i += 1
            
            # 尝试转换数值类型
            if isinstance(var_value, str):
                # 尝试转换为整数
                if var_value.isdigit():
                    var_value = int(var_value)
                # 尝试转换为布尔值
                elif var_value.lower() in ['true', 'false']:
                    var_value = var_value.lower() == 'true'
            
            variables[var_name] = var_value
            logger.info(f"动态参数: {var_name} = {var_value}")
        else:
            i += 1
    
    return args, variables


def main():
    """主函数"""
    try:
        # 动态解析参数
        args, variables = parse_dynamic_arguments()
        
        # 创建渲染器
        renderer = DynamicMiddlewareRenderer(args.template, args.output)
        
        # 设置变量
        renderer.set_variables(variables)
        
        # 渲染模板
        if not renderer.render_template():
            sys.exit(1)
        
        # 验证YAML（如果需要）
        if args.validate:
            with open(args.output, 'r', encoding='utf-8') as f:
                content = f.read()
            if not renderer.validate_yaml(content):
                logger.error("生成的YAML文件验证失败")
                sys.exit(1)
            logger.info("YAML文件验证通过")
        
        logger.info("动态中间件模板渲染完成")
        
    except Exception as e:
        logger.error(f"渲染过程出错: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
