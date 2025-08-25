#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DevOps 高级模板渲染器
使用Jinja2模板引擎，提供更强大的模板功能
"""

import os
import sys
import yaml
import argparse
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from jinja2 import Environment, FileSystemLoader, Template, StrictUndefined
import json

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AdvancedTemplateRenderer:
    """高级YAML模板渲染器，使用Jinja2引擎"""
    
    def __init__(self, template_dir: str = None):
        self.template_dir = Path(template_dir) if template_dir else None
        self.env = self._create_jinja_env()
        self.variables = {}
        
    def _create_jinja_env(self) -> Environment:
        """创建Jinja2环境"""
        env = Environment(
            loader=FileSystemLoader('.'),
            undefined=StrictUndefined,  # 严格模式，未定义变量会报错
            trim_blocks=True,
            lstrip_blocks=True,
            keep_trailing_newline=True
        )
        
        # 添加自定义过滤器
        env.filters['to_yaml'] = self._to_yaml_filter
        env.filters['to_json'] = self._to_json_filter
        env.filters['default'] = self._default_filter
        
        return env
    
    def _to_yaml_filter(self, value) -> str:
        """转换为YAML格式的过滤器"""
        return yaml.dump(value, default_flow_style=False, allow_unicode=True)
    
    def _to_json_filter(self, value) -> str:
        """转换为JSON格式的过滤器"""
        return json.dumps(value, ensure_ascii=False, indent=2)
    
    def _default_filter(self, value, default_value) -> Any:
        """默认值过滤器"""
        return value if value is not None else default_value
    
    def set_variables(self, variables: Dict[str, Any]):
        """设置模板变量"""
        self.variables = variables
        
    def render_template(self, template_path: str, output_path: str) -> bool:
        """渲染模板文件"""
        try:
            template_file = Path(template_path)
            if not template_file.exists():
                logger.error(f"模板文件不存在: {template_path}")
                return False
            
            # 读取模板内容
            with open(template_file, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            # 创建Jinja2模板
            template = self.env.from_string(template_content)
            
            # 渲染模板
            rendered_content = template.render(**self.variables)
            
            # 确保输出目录存在
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            # 写入渲染后的内容
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(rendered_content)
            
            logger.info(f"模板渲染成功: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"模板渲染失败: {e}")
            return False
    
    def render_string(self, template_string: str) -> str:
        """渲染模板字符串"""
        try:
            template = self.env.from_string(template_string)
            return template.render(**self.variables)
        except Exception as e:
            logger.error(f"模板字符串渲染失败: {e}")
            raise
    
    def validate_yaml(self, content: str) -> bool:
        """验证YAML语法"""
        try:
            # 尝试解析YAML
            yaml.safe_load_all(content)
            return True
        except yaml.YAMLError as e:
            logger.error(f"YAML语法错误: {e}")
            return False
    
    def get_template_variables(self, template_path: str) -> set:
        """获取模板中使用的变量"""
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            template = self.env.from_string(template_content)
            return set(template.module.__annotations__.keys())
        except Exception as e:
            logger.error(f"获取模板变量失败: {e}")
            return set()


def create_enhanced_template(template_type: str, platform: str) -> str:
    """创建增强的模板内容"""
    
    if template_type == "spring-boot" and platform == "k8s":
        return """apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ module_name }}
  namespace: {{ namespace }}
  labels:
    app: {{ module_name }}
    version: "{{ version | default('1.0') }}"
spec:
  replicas: {{ replicas | default(1) }}
  selector:
    matchLabels:
      app: {{ module_name }}
  template:
    metadata:
      labels:
        app: {{ module_name }}
        version: "{{ version | default('1.0') }}"
    spec:
      {% if enable_harbor and harbor_secret_name %}
      imagePullSecrets:
      - name: {{ harbor_secret_name }}
      {% endif %}
      containers:
      - name: {{ module_name }}
        image: {{ image_path }}
        ports:
        - containerPort: {{ app_port }}
          name: http
        {% if java_opts %}
        env:
        - name: JAVA_OPTS
          value: "{{ java_opts }}"
        - name: SERVER_PORT
          value: "{{ app_port }}"
        {% endif %}
        resources:
          requests:
            memory: "{{ memory_request | default('512Mi') }}"
            cpu: "{{ cpu_request | default('250m') }}"
          limits:
            memory: "{{ memory_limit | default('1Gi') }}"
            cpu: "{{ cpu_limit | default('500m') }}"
        livenessProbe:
          httpGet:
            path: {{ health_check_path | default('/actuator/health') }}
            port: {{ app_port }}
          initialDelaySeconds: {{ liveness_initial_delay | default(60) }}
          periodSeconds: {{ liveness_period | default(10) }}
        readinessProbe:
          httpGet:
            path: {{ health_check_path | default('/actuator/health') }}
            port: {{ app_port }}
          initialDelaySeconds: {{ readiness_initial_delay | default(30) }}
          periodSeconds: {{ readiness_period | default(5) }}
      restartPolicy: Always
---
apiVersion: v1
kind: Service
metadata:
  name: {{ module_name }}-service
  namespace: {{ namespace }}
  labels:
    app: {{ module_name }}
spec:
  selector:
    app: {{ module_name }}
  ports:
  - port: {{ service_port | default(80) }}
    targetPort: {{ app_port }}
    protocol: TCP
    name: http
  type: {{ service_type | default('ClusterIP') }}
{% if service_type == 'NodePort' and node_port %}
  - port: {{ service_port | default(80) }}
    targetPort: {{ app_port }}
    nodePort: {{ node_port }}
    protocol: TCP
    name: http
{% endif %}
{% if ingress_enabled %}
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ module_name }}-ingress
  namespace: {{ namespace }}
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: {{ ingress_host | default(module_name + '.example.com') }}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: {{ module_name }}-service
            port:
              number: {{ service_port | default(80) }}
{% endif %}"""
    
    elif template_type == "vue-nginx" and platform == "k8s":
        return """apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ module_name }}
  namespace: {{ namespace }}
  labels:
    app: {{ module_name }}
spec:
  replicas: {{ replicas | default(1) }}
  selector:
    matchLabels:
      app: {{ module_name }}
  template:
    metadata:
      labels:
        app: {{ module_name }}
    spec:
      {% if enable_harbor and harbor_secret_name %}
      imagePullSecrets:
      - name: {{ harbor_secret_name }}
      {% endif %}
      containers:
      - name: {{ module_name }}
        image: {{ image_path }}
        ports:
        - containerPort: {{ app_port | default(80) }}
          name: http
        resources:
          requests:
            memory: "{{ memory_request | default('128Mi') }}"
            cpu: "{{ cpu_request | default('100m') }}"
          limits:
            memory: "{{ memory_limit | default('256Mi') }}"
            cpu: "{{ cpu_limit | default('200m') }}"
---
apiVersion: v1
kind: Service
metadata:
  name: {{ module_name }}-service
  namespace: {{ namespace }}
spec:
  selector:
    app: {{ module_name }}
  ports:
  - port: {{ service_port | default(80) }}
    targetPort: {{ app_port | default(80) }}
    protocol: TCP
    name: http
  type: {{ service_type | default('ClusterIP') }}"""
    
    else:
        return """# 基础模板
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ module_name }}
  namespace: {{ namespace }}
spec:
  replicas: {{ replicas | default(1) }}
  selector:
    matchLabels:
      app: {{ module_name }}
  template:
    metadata:
      labels:
        app: {{ module_name }}
    spec:
      containers:
      - name: {{ module_name }}
        image: {{ image_path }}
        ports:
        - containerPort: {{ app_port | default(80) }}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ module_name }}-service
  namespace: {{ namespace }}
spec:
  selector:
    app: {{ module_name }}
  ports:
  - port: {{ service_port | default(80) }}
    targetPort: {{ app_port | default(80) }}
  type: ClusterIP"""


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='DevOps 高级模板渲染器')
    parser.add_argument('--template', required=True, help='模板文件路径')
    parser.add_argument('--output', required=True, help='输出文件路径')
    parser.add_argument('--module-name', required=True, help='模块名称')
    parser.add_argument('--image-path', required=True, help='镜像路径')
    parser.add_argument('--namespace', required=True, help='命名空间')
    parser.add_argument('--app-port', type=int, default=80, help='应用端口')
    parser.add_argument('--service-port', type=int, help='服务端口')
    parser.add_argument('--service-type', default='ClusterIP', help='服务类型')
    parser.add_argument('--replicas', type=int, default=1, help='副本数')
    parser.add_argument('--version', help='版本号')
    parser.add_argument('--harbor-secret-name', help='Harbor Secret名称')
    parser.add_argument('--enable-harbor', action='store_true', help='启用Harbor')
    parser.add_argument('--java-opts', help='Java选项')
    parser.add_argument('--memory-request', help='内存请求')
    parser.add_argument('--memory-limit', help='内存限制')
    parser.add_argument('--cpu-request', help='CPU请求')
    parser.add_argument('--cpu-limit', help='CPU限制')
    parser.add_argument('--health-check-path', help='健康检查路径')
    parser.add_argument('--ingress-enabled', action='store_true', help='启用Ingress')
    parser.add_argument('--ingress-host', help='Ingress主机名')
    parser.add_argument('--validate', action='store_true', help='验证YAML语法')
    parser.add_argument('--create-template', action='store_true', help='创建新模板')
    parser.add_argument('--template-type', help='模板类型')
    parser.add_argument('--platform', help='平台类型')
    
    args = parser.parse_args()
    
    # 创建渲染器
    renderer = AdvancedTemplateRenderer()
    
    # 设置变量
    variables = {
        'module_name': args.module_name,
        'image_path': args.image_path,
        'namespace': args.namespace,
        'app_port': args.app_port,
        'service_port': args.service_port,
        'service_type': args.service_type,
        'replicas': args.replicas,
        'version': args.version,
        'harbor_secret_name': args.harbor_secret_name or '',
        'enable_harbor': args.enable_harbor,
        'java_opts': args.java_opts or '',
        'memory_request': args.memory_request,
        'memory_limit': args.memory_limit,
        'cpu_request': args.cpu_request,
        'cpu_limit': args.cpu_limit,
        'health_check_path': args.health_check_path,
        'ingress_enabled': args.ingress_enabled,
        'ingress_host': args.ingress_host,
    }
    
    renderer.set_variables(variables)
    
    # 如果需要创建新模板
    if args.create_template and args.template_type and args.platform:
        template_content = create_enhanced_template(args.template_type, args.platform)
        with open(args.template, 'w', encoding='utf-8') as f:
            f.write(template_content)
        logger.info(f"创建模板成功: {args.template}")
        return 0
    
    # 渲染模板
    if renderer.render_template(args.template, args.output):
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
