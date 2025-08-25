#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
综合测试脚本
测试所有Python组件：模板渲染器和端口配置处理器
"""

import sys
import os
import yaml

# 添加bin目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'bin'))

def test_template_renderer():
    """测试模板渲染器"""
    print("=" * 50)
    print("测试模板渲染器")
    print("=" * 50)
    
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
  template:
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
            print("✅ 模板渲染成功")
            
            # 验证输出
            with open('test_output.yaml', 'r', encoding='utf-8') as f:
                content = f.read()
                if 'test-app' in content and 'harbor.example.com/test/test-app:latest' in content:
                    print("✅ 输出内容验证通过")
                else:
                    print("❌ 输出内容验证失败")
                    return False
            
            return True
        else:
            print("❌ 模板渲染失败")
            return False
            
    except Exception as e:
        print(f"❌ 模板渲染器测试异常: {e}")
        return False
    finally:
        # 清理测试文件
        for file in ['test_template.yaml', 'test_output.yaml']:
            if os.path.exists(file):
                os.remove(file)

def test_port_config_handler():
    """测试端口配置处理器"""
    print("\n" + "=" * 50)
    print("测试端口配置处理器")
    print("=" * 50)
    
    try:
        from port_config_handler import PortConfigHandler
        
        # 创建测试YAML
        test_yaml = """apiVersion: v1
kind: Service
metadata:
  name: test-service
spec:
  selector:
    app: test-app
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
  type: ClusterIP"""
        
        with open('test_service.yaml', 'w', encoding='utf-8') as f:
            f.write(test_yaml)
        
        # 创建处理器
        handler = PortConfigHandler('test_service.yaml')
        
        # 测试1: 获取端口信息
        print("1. 测试获取端口信息...")
        port_info = handler.get_port_info()
        print("端口信息:")
        print(yaml.dump(port_info, default_flow_style=False, allow_unicode=True))
        
        # 测试2: 验证端口配置
        print("\n2. 测试端口配置验证...")
        if handler.validate_ports():
            print("✅ 端口配置验证通过")
        else:
            print("❌ 端口配置验证失败")
            return False
        
        # 测试3: 添加NodePort
        print("\n3. 测试添加NodePort...")
        if handler.enhance_service_nodeport("30001", False):
            print("✅ NodePort添加成功")
        else:
            print("❌ NodePort添加失败")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ 端口配置处理器测试异常: {e}")
        return False
    finally:
        # 清理测试文件
        if os.path.exists('test_service.yaml'):
            os.remove('test_service.yaml')

def test_integration():
    """测试集成功能"""
    print("\n" + "=" * 50)
    print("测试集成功能")
    print("=" * 50)
    
    try:
        from template_renderer import TemplateRenderer
        from port_config_handler import PortConfigHandler
        
        # 创建包含Service的测试模板
        test_template = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: ?module_name
  namespace: ?namespace
spec:
  replicas: 1
  template:
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
    protocol: TCP
    name: http
  type: ClusterIP"""
        
        with open('integration_template.yaml', 'w', encoding='utf-8') as f:
            f.write(test_template)
        
        # 步骤1: 渲染模板
        print("步骤1: 渲染模板...")
        renderer = TemplateRenderer('integration_template.yaml', 'integration_output.yaml')
        variables = {
            'module_name': 'integration-app',
            'image_path': 'harbor.example.com/test/integration-app:latest',
            'namespace': 'default',
            'app_port': 8080,
            'enable_harbor': True,
        }
        renderer.set_variables(variables)
        
        if not renderer.render_template():
            print("❌ 模板渲染失败")
            return False
        
        print("✅ 模板渲染成功")
        
        # 步骤2: 处理端口配置
        print("\n步骤2: 处理端口配置...")
        handler = PortConfigHandler('integration_output.yaml')
        
        if handler.enhance_service_nodeport("30001", False):
            print("✅ 端口配置处理成功")
        else:
            print("❌ 端口配置处理失败")
            return False
        
        # 步骤3: 验证最终结果
        print("\n步骤3: 验证最终结果...")
        final_info = handler.get_port_info()
        print("最终配置:")
        print(yaml.dump(final_info, default_flow_style=False, allow_unicode=True))
        
        # 验证关键信息
        if (final_info.get('services') and 
            final_info['services'][0]['name'] == 'integration-app-service' and
            final_info['services'][0]['ports'][0].get('nodePort') == 30001):
            print("✅ 集成测试通过")
            return True
        else:
            print("❌ 集成测试失败")
            return False
        
    except Exception as e:
        print(f"❌ 集成测试异常: {e}")
        return False
    finally:
        # 清理测试文件
        for file in ['integration_template.yaml', 'integration_output.yaml']:
            if os.path.exists(file):
                os.remove(file)

def main():
    """主测试函数"""
    print("开始综合测试所有Python组件...")
    
    # 检查依赖
    try:
        import yaml
        print("✅ PyYAML 已安装")
    except ImportError:
        print("❌ PyYAML 未安装，请运行: pip install PyYAML")
        return False
    
    # 运行所有测试
    results = []
    
    results.append(test_template_renderer())
    results.append(test_port_config_handler())
    results.append(test_integration())
    
    # 汇总结果
    print("\n" + "=" * 50)
    print("测试结果汇总")
    print("=" * 50)
    
    test_names = ["模板渲染器", "端口配置处理器", "集成功能"]
    for i, result in enumerate(results):
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{test_names[i]}: {status}")
    
    if all(results):
        print("\n🎉 所有测试通过！Python组件工作正常")
        return True
    else:
        print("\n❌ 部分测试失败")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
