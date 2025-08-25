#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
端口配置处理器
替代shell脚本的enhance_service_nodeport方法，提供更精确的端口配置处理
"""

import os
import sys
import yaml
import argparse
import logging
import re
from pathlib import Path
from typing import Dict, Any, Optional, List

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PortConfigHandler:
    """端口配置处理器"""
    
    def __init__(self, yaml_file: str):
        self.yaml_file = Path(yaml_file)
        self.content = ""
        self.documents = []
        
    def load_yaml(self) -> bool:
        """加载YAML文件"""
        try:
            if not self.yaml_file.exists():
                logger.error(f"YAML文件不存在: {self.yaml_file}")
                return False
                
            with open(self.yaml_file, 'r', encoding='utf-8') as f:
                self.content = f.read()
                
            # 解析多文档YAML
            self.documents = list(yaml.safe_load_all(self.content))
            return True
            
        except Exception as e:
            logger.error(f"加载YAML文件失败: {e}")
            return False
    
    def save_yaml(self) -> bool:
        """保存YAML文件"""
        try:
            # 重新生成YAML内容
            new_content = ""
            for i, doc in enumerate(self.documents):
                if i > 0:
                    new_content += "---\n"
                new_content += yaml.dump(doc, default_flow_style=False, allow_unicode=True)
            
            # 写入文件
            with open(self.yaml_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
                
            logger.info(f"YAML文件保存成功: {self.yaml_file}")
            return True
            
        except Exception as e:
            logger.error(f"保存YAML文件失败: {e}")
            return False
    
    def enhance_service_nodeport(self, expose_port: Optional[str] = None, force_override: bool = False) -> bool:
        """增强Service的NodePort配置"""
        try:
            if not self.load_yaml():
                return False
            
            modified = False
            
            for doc in self.documents:
                if doc.get('kind') == 'Service':
                    modified |= self._process_service_nodeport(doc, expose_port, force_override)
            
            if modified:
                return self.save_yaml()
            else:
                logger.info("无需修改NodePort配置")
                return True
                
        except Exception as e:
            logger.error(f"处理NodePort配置失败: {e}")
            return False
    
    def _process_service_nodeport(self, service_doc: Dict, expose_port: Optional[str], force_override: bool) -> bool:
        """处理单个Service的NodePort配置"""
        modified = False
        spec = service_doc.get('spec', {})
        ports = spec.get('ports', [])
        
        if not ports:
            logger.warn("Service中没有找到ports配置")
            return False
        
        # 查找HTTP端口
        http_port = None
        for port in ports:
            if port.get('name') == 'http' or port.get('protocol') == 'TCP':
                http_port = port
                break
        
        if not http_port:
            logger.warn("Service中没有找到HTTP端口")
            return False
        
        if expose_port:
            logger.info(f"处理NodePort配置: {expose_port}")
            
            # 检查是否已有nodePort配置
            if 'nodePort' in http_port:
                template_port = http_port['nodePort']
                if force_override:
                    # 强制覆盖
                    http_port['nodePort'] = int(expose_port)
                    service_doc['spec']['type'] = 'NodePort'
                    logger.info(f"强制覆盖模板NodePort为: {expose_port}")
                    modified = True
                else:
                    # 有固定值但用户未强制覆盖
                    logger.warn(f"模板已有固定NodePort: {template_port}，使用 --force-port 可强制覆盖为 {expose_port}")
            else:
                # 动态添加nodePort
                http_port['nodePort'] = int(expose_port)
                service_doc['spec']['type'] = 'NodePort'
                logger.info(f"动态添加NodePort: {expose_port}")
                modified = True
        else:
            # 用户未指定expose_port，移除nodePort配置
            if 'nodePort' in http_port:
                del http_port['nodePort']
                logger.info("移除未指定的NodePort配置")
                modified = True
        
        return modified
    
    def validate_ports(self) -> bool:
        """验证端口配置"""
        try:
            if not self.load_yaml():
                return False
            
            for doc in self.documents:
                if doc.get('kind') == 'Service':
                    if not self._validate_service_ports(doc):
                        return False
            
            logger.info("端口配置验证通过")
            return True
            
        except Exception as e:
            logger.error(f"端口配置验证失败: {e}")
            return False
    
    def _validate_service_ports(self, service_doc: Dict) -> bool:
        """验证单个Service的端口配置"""
        spec = service_doc.get('spec', {})
        ports = spec.get('ports', [])
        
        if not ports:
            logger.warn("Service中没有ports配置")
            return True
        
        for port in ports:
            # 验证端口号范围
            port_num = port.get('port')
            target_port = port.get('targetPort')
            node_port = port.get('nodePort')
            
            if port_num and not (1 <= int(port_num) <= 65535):
                logger.error(f"无效的port值: {port_num}")
                return False
            
            if target_port and not (1 <= int(target_port) <= 65535):
                logger.error(f"无效的targetPort值: {target_port}")
                return False
            
            if node_port and not (30000 <= int(node_port) <= 32767):
                logger.error(f"无效的nodePort值: {node_port}，NodePort范围应为30000-32767")
                return False
        
        return True
    
    def get_port_info(self) -> Dict[str, Any]:
        """获取端口信息"""
        try:
            if not self.load_yaml():
                return {}
            
            port_info = {
                'services': []
            }
            
            for doc in self.documents:
                if doc.get('kind') == 'Service':
                    service_info = self._get_service_port_info(doc)
                    if service_info:
                        port_info['services'].append(service_info)
            
            return port_info
            
        except Exception as e:
            logger.error(f"获取端口信息失败: {e}")
            return {}
    
    def _get_service_port_info(self, service_doc: Dict) -> Dict[str, Any]:
        """获取单个Service的端口信息"""
        metadata = service_doc.get('metadata', {})
        spec = service_doc.get('spec', {})
        ports = spec.get('ports', [])
        
        service_info = {
            'name': metadata.get('name', 'unknown'),
            'type': spec.get('type', 'ClusterIP'),
            'ports': []
        }
        
        for port in ports:
            port_info = {
                'name': port.get('name', ''),
                'port': port.get('port'),
                'targetPort': port.get('targetPort'),
                'nodePort': port.get('nodePort'),
                'protocol': port.get('protocol', 'TCP')
            }
            service_info['ports'].append(port_info)
        
        return service_info


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='端口配置处理器')
    parser.add_argument('--yaml-file', required=True, help='YAML文件路径')
    parser.add_argument('--expose-port', help='暴露端口号')
    parser.add_argument('--force-port', action='store_true', help='强制覆盖端口')
    parser.add_argument('--validate', action='store_true', help='验证端口配置')
    parser.add_argument('--info', action='store_true', help='显示端口信息')
    
    args = parser.parse_args()
    
    # 创建处理器
    handler = PortConfigHandler(args.yaml_file)
    
    # 根据参数执行相应操作
    if args.info:
        # 显示端口信息
        port_info = handler.get_port_info()
        if port_info:
            print("端口配置信息:")
            print(yaml.dump(port_info, default_flow_style=False, allow_unicode=True))
        return 0
    
    elif args.validate:
        # 验证端口配置
        if handler.validate_ports():
            return 0
        else:
            return 1
    
    else:
        # 处理NodePort配置
        if handler.enhance_service_nodeport(args.expose_port, args.force_port):
            return 0
        else:
            return 1


if __name__ == '__main__':
    sys.exit(main())
