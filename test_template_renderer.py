#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试Python模板渲染器
"""

import sys
import os

# 添加bin目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'bin'))

def test_basic_renderer():
    """测试基础模板渲染器"""
    print("测试基础模板渲染器...")
    
    try:
        from template_renderer import TemplateRenderer
        
        # 创建测试模板
        test_template = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: ?module_name
  namespace: ?namespace
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ?module_name
  template:
    metadata:
      labels:
        app: ?module_name
    spec:
      containers:
      - name: ?module_name
        image: ?image_path
        ports:
        - containerPort: ?app_port
---
apiVersion: v1
kind: Service
metadata:
  name: ?module_name-service
  namespace: ?namespace
spec:
  selector:
    app: ?module_name
  ports:
  - port: 80
    targetPort: ?app_port
  type: ClusterIP"""
        
        # 写入测试模板文件
        with open('test_template.yaml', 'w', encoding='utf-8') as f:
            f.write(test_template)
        
        # 创建渲染器
        renderer = TemplateRenderer('test_template.yaml', 'test_output.yaml')
        
        # 设置变量
        variables = {
            'module_name': 'test-app',
            'image_path': 'harbor.example.com/test/test-app:latest',
            'namespace': 'default',
            'app_port': 8080,
            'harbor_secret_name': 'harbor-secret',
            'enable_harbor': True,
            'build_platform': 'KUBERNETES',
            'java_opts': '-Xmx512m',
        }
        
        renderer.set_variables(variables)
        
        # 渲染模板
        if renderer.render_template():
            print("✅ 基础模板渲染器测试通过")
            
            # 验证输出
            with open('test_output.yaml', 'r', encoding='utf-8') as f:
                content = f.read()
                if 'test-app' in content and 'harbor.example.com/test/test-app:latest' in content:
                    print("✅ 输出内容验证通过")
                else:
                    print("❌ 输出内容验证失败")
                    
            # 清理测试文件
            os.remove('test_template.yaml')
            os.remove('test_output.yaml')
            
            return True
        else:
            print("❌ 基础模板渲染器测试失败")
            return False
            
    except Exception as e:
        print(f"❌ 基础模板渲染器测试异常: {e}")
        return False

def test_advanced_renderer():
    """测试高级模板渲染器"""
    print("测试高级模板渲染器...")
    
    try:
        from advanced_template_renderer import AdvancedTemplateRenderer
        
        # 创建测试模板
        test_template = """apiVersion: apps/v1
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
      {% if enable_harbor and harbor_secret_name %}
      imagePullSecrets:
      - name: {{ harbor_secret_name }}
      {% endif %}
      containers:
      - name: {{ module_name }}
        image: {{ image_path }}
        ports:
        - containerPort: {{ app_port }}
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
    targetPort: {{ app_port }}
  type: {{ service_type | default('ClusterIP') }}"""
        
        # 写入测试模板文件
        with open('test_advanced_template.yaml', 'w', encoding='utf-8') as f:
            f.write(test_template)
        
        # 创建渲染器
        renderer = AdvancedTemplateRenderer()
        
        # 设置变量
        variables = {
            'module_name': 'test-app',
            'image_path': 'harbor.example.com/test/test-app:latest',
            'namespace': 'default',
            'app_port': 8080,
            'service_port': 80,
            'service_type': 'ClusterIP',
            'replicas': 2,
            'harbor_secret_name': 'harbor-secret',
            'enable_harbor': True,
        }
        
        renderer.set_variables(variables)
        
        # 渲染模板
        if renderer.render_template('test_advanced_template.yaml', 'test_advanced_output.yaml'):
            print("✅ 高级模板渲染器测试通过")
            
            # 验证输出
            with open('test_advanced_output.yaml', 'r', encoding='utf-8') as f:
                content = f.read()
                if 'test-app' in content and 'harbor.example.com/test/test-app:latest' in content:
                    print("✅ 高级输出内容验证通过")
                else:
                    print("❌ 高级输出内容验证失败")
                    
            # 清理测试文件
            os.remove('test_advanced_template.yaml')
            os.remove('test_advanced_output.yaml')
            
            return True
        else:
            print("❌ 高级模板渲染器测试失败")
            return False
            
    except Exception as e:
        print(f"❌ 高级模板渲染器测试异常: {e}")
        return False

def main():
    """主测试函数"""
    print("开始测试Python模板渲染器...")
    
    # 检查依赖
    try:
        import yaml
        print("✅ PyYAML 已安装")
    except ImportError:
        print("❌ PyYAML 未安装，请运行: pip install PyYAML")
        return False
    
    try:
        import jinja2
        print("✅ Jinja2 已安装")
    except ImportError:
        print("❌ Jinja2 未安装，请运行: pip install Jinja2")
        return False
    
    # 运行测试
    basic_result = test_basic_renderer()
    advanced_result = test_advanced_renderer()
    
    if basic_result and advanced_result:
        print("🎉 所有测试通过！Python模板渲染器工作正常")
        return True
    else:
        print("❌ 部分测试失败")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
