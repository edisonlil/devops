#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DevOps 模板渲染器
替代shell脚本的sed模板渲染，提供更精确和安全的YAML模板处理
"""

import os
import sys
import yaml
import argparse
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import re

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TemplateRenderer:
    """YAML模板渲染器"""
    
    def __init__(self, template_path: str, output_path: str):
        self.template_path = Path(template_path)
        self.output_path = Path(output_path)
        self.variables = {}
        
    def set_variables(self, variables: Dict[str, Any]):
        """设置模板变量"""
        self.variables = variables
        
    def render_template(self) -> bool:
        """渲染模板文件"""
        try:
            if not self.template_path.exists():
                logger.error(f"模板文件不存在: {self.template_path}")
                return False
                
            # 读取模板内容
            with open(self.template_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # 替换占位符
            rendered_content = self._replace_placeholders(content)
            
            # 确保输出目录存在
            self.output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # 写入渲染后的内容
            with open(self.output_path, 'w', encoding='utf-8') as f:
                f.write(rendered_content)
                
            logger.info(f"模板渲染成功: {self.output_path}")
            return True
            
        except Exception as e:
            logger.error(f"模板渲染失败: {e}")
            return False
    
    def _replace_placeholders(self, content: str) -> str:
        """替换模板中的占位符"""
        # 定义占位符映射
        placeholder_mapping = {
            '?module_name': self.variables.get('module_name', ''),
            '?image_path': self.variables.get('image_path', ''),
            '?namespace': self.variables.get('namespace', ''),
            '?network': self.variables.get('network', ''),
            '?app_port': str(self.variables.get('app_port', 80)),
            '?harbor_secret_name': self.variables.get('harbor_secret_name', ''),
            '?java_opts': self.variables.get('java_opts', ''),
            '?expose_port': str(self.variables.get('expose_port', 80)),
        }
        
        # 替换占位符
        for placeholder, value in placeholder_mapping.items():
            content = content.replace(placeholder, str(value))
            
        # 处理Harbor Secret的特殊逻辑
        content = self._handle_harbor_secret(content)
        
        return content
    
    def _handle_harbor_secret(self, content: str) -> str:
        """处理Harbor Secret的特殊逻辑"""
        harbor_secret_name = self.variables.get('harbor_secret_name', '')
        enable_harbor = self.variables.get('enable_harbor', False)
        build_platform = self.variables.get('build_platform', '')
        
        # 如果没有Harbor Secret或未启用Harbor，移除相关配置
        if not harbor_secret_name or not enable_harbor:
            # 移除imagePullSecrets配置
            content = re.sub(
                r'^\s*imagePullSecrets:\s*\n\s*-\s*name:\s*\?harbor_secret_name\s*\n',
                '',
                content,
                flags=re.MULTILINE
            )
            # 移除空的imagePullSecrets行
            content = re.sub(r'^\s*imagePullSecrets:\s*\n', '', content, flags=re.MULTILINE)
        
        return content
    
    def validate_yaml(self, content: str) -> bool:
        """验证YAML语法"""
        try:
            # 尝试解析YAML
            yaml.safe_load_all(content)
            return True
        except yaml.YAMLError as e:
            logger.error(f"YAML语法错误: {e}")
            return False


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='DevOps 模板渲染器')
    parser.add_argument('--template', required=True, help='模板文件路径')
    parser.add_argument('--output', required=True, help='输出文件路径')
    parser.add_argument('--module-name', required=True, help='模块名称')
    parser.add_argument('--image-path', required=True, help='镜像路径')
    parser.add_argument('--namespace', required=True, help='命名空间')
    parser.add_argument('--app-port', type=int, default=80, help='应用端口')
    parser.add_argument('--network', help='网络名称')
    parser.add_argument('--harbor-secret-name', help='Harbor Secret名称')
    parser.add_argument('--enable-harbor', action='store_true', help='启用Harbor')
    parser.add_argument('--build-platform', help='构建平台')
    parser.add_argument('--java-opts', help='Java选项')
    parser.add_argument('--expose-port', type=int, help='暴露端口')
    parser.add_argument('--validate', action='store_true', help='验证YAML语法')
    
    args = parser.parse_args()
    
    # 创建渲染器
    renderer = TemplateRenderer(args.template, args.output)
    
    # 设置变量
    variables = {
        'module_name': args.module_name,
        'image_path': args.image_path,
        'namespace': args.namespace,
        'app_port': args.app_port,
        'network': args.network or '',
        'harbor_secret_name': args.harbor_secret_name or '',
        'enable_harbor': args.enable_harbor,
        'build_platform': args.build_platform or '',
        'java_opts': args.java_opts or '',
        'expose_port': args.expose_port or args.app_port,
    }
    
    renderer.set_variables(variables)
    
    # 渲染模板
    if renderer.render_template():
        # 如果需要验证，读取渲染后的内容进行验证
        if args.validate:
            with open(args.output, 'r', encoding='utf-8') as f:
                content = f.read()
            if renderer.validate_yaml(content):
                logger.info("YAML语法验证通过")
                return 0
            else:
                logger.error("YAML语法验证失败")
                return 1
        return 0
    else:
        return 1


if __name__ == '__main__':
    sys.exit(main())
