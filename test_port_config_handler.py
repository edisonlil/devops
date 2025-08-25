#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试端口配置处理器
"""

import sys
import os
import yaml

# 添加bin目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'bin'))

def create_test_yaml():
    """创建测试YAML文件"""
    test_yaml = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
      - name: test-app
        image: test-app:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: test-app-service
  namespace: default
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
    
    return 'test_service.yaml'

def test_port_config_handler():
    """测试端口配置处理器"""
    print("测试端口配置处理器...")
    
    try:
        from port_config_handler import PortConfigHandler
        
        # 创建测试YAML文件
        test_file = create_test_yaml()
        
        # 创建处理器
        handler = PortConfigHandler(test_file)
        
        # 测试1: 获取端口信息
        print("\n1. 测试获取端口信息...")
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
            
            # 验证结果
            updated_info = handler.get_port_info()
            print("更新后的端口信息:")
            print(yaml.dump(updated_info, default_flow_style=False, allow_unicode=True))
        else:
            print("❌ NodePort添加失败")
            return False
        
        # 测试4: 强制覆盖NodePort
        print("\n4. 测试强制覆盖NodePort...")
        if handler.enhance_service_nodeport("30002", True):
            print("✅ NodePort强制覆盖成功")
            
            # 验证结果
            final_info = handler.get_port_info()
            print("最终端口信息:")
            print(yaml.dump(final_info, default_flow_style=False, allow_unicode=True))
        else:
            print("❌ NodePort强制覆盖失败")
            return False
        
        # 清理测试文件
        os.remove(test_file)
        
        print("\n🎉 所有端口配置处理器测试通过！")
        return True
        
    except Exception as e:
        print(f"❌ 端口配置处理器测试异常: {e}")
        return False

def test_invalid_ports():
    """测试无效端口处理"""
    print("\n测试无效端口处理...")
    
    try:
        from port_config_handler import PortConfigHandler
        
        # 创建包含无效端口的测试YAML
        invalid_yaml = """apiVersion: v1
kind: Service
metadata:
  name: invalid-service
spec:
  ports:
  - port: 70000
    targetPort: 8080
    nodePort: 20000
  type: ClusterIP"""
        
        with open('test_invalid.yaml', 'w', encoding='utf-8') as f:
            f.write(invalid_yaml)
        
        handler = PortConfigHandler('test_invalid.yaml')
        
        # 测试验证
        if not handler.validate_ports():
            print("✅ 无效端口检测成功")
        else:
            print("❌ 无效端口检测失败")
            return False
        
        # 清理测试文件
        os.remove('test_invalid.yaml')
        
        return True
        
    except Exception as e:
        print(f"❌ 无效端口测试异常: {e}")
        return False

def main():
    """主测试函数"""
    print("开始测试端口配置处理器...")
    
    # 检查依赖
    try:
        import yaml
        print("✅ PyYAML 已安装")
    except ImportError:
        print("❌ PyYAML 未安装，请运行: pip install PyYAML")
        return False
    
    # 运行测试
    basic_result = test_port_config_handler()
    invalid_result = test_invalid_ports()
    
    if basic_result and invalid_result:
        print("\n🎉 所有端口配置处理器测试通过！")
        return True
    else:
        print("\n❌ 部分端口配置处理器测试失败")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
