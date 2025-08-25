#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
统一端口配置处理器
支持传统单端口配置和新的多端口配置
处理NodePort到ServicePort的正确对应关系
"""

import os
import sys
import yaml
import argparse
import logging
import re
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class UnifiedPortConfigHandler:
    """统一端口配置处理器"""

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

    def parse_port_config(self, port_config: str) -> List[Dict[str, Any]]:
        """解析端口配置字符串

        支持的格式：
        1. 单端口：8080
        2. 多端口：8080,9090,3000
        3. 命名端口：http:8080,admin:9090
        4. 混合格式：8080,admin:9090,3000
        """
        if not port_config:
            return []

        ports = []
        port_items = [item.strip() for item in port_config.split(',')]

        for port_item in port_items:
            if ':' in port_item:
                # 命名端口格式：name:port
                parts = port_item.split(':', 1)
                if len(parts) == 2:
                    port_name = parts[0].strip()
                    port_number = parts[1].strip()

                    if port_number.isdigit():
                        ports.append({
                            'name': port_name,
                            'port': int(port_number),
                            'targetPort': int(port_number),
                            'protocol': 'TCP'
                        })
                    else:
                        logger.warning(f"无效的端口号: {port_number}")
            elif port_item.isdigit():
                # 纯数字端口
                port_number = int(port_item)
                ports.append({
                    'name': f'port-{port_number}',
                    'port': port_number,
                    'targetPort': port_number,
                    'protocol': 'TCP'
                })
            else:
                logger.warning(f"无效的端口格式: {port_item}")

        return ports

    def validate_port_range(self, port: int, port_type: str) -> bool:
        """验证端口号范围"""
        if port_type == 'service':
            return 1 <= port <= 65535
        elif port_type == 'export':
            return 30000 <= port <= 32767
        return False

    def create_port_mapping(self, service_ports: List[Dict], export_ports: List[Dict]) -> List[Dict]:
        """创建服务端口和导出端口的正确映射关系

        规则：
        1. 如果服务端口和导出端口数量相同，按顺序一一对应
        2. 如果只有一个导出端口，映射到第一个服务端口
        3. 如果导出端口多于服务端口，多余的导出端口被忽略
        4. 如果服务端口多于导出端口，多余的服务端口不暴露NodePort
        """
        if not service_ports and not export_ports:
            return []

        # 如果只有服务端口，没有导出端口
        if service_ports and not export_ports:
            return service_ports

        # 如果只有导出端口，没有服务端口，创建对应的服务端口
        if export_ports and not service_ports:
            mapped_ports = []
            for export_port in export_ports:
                # 导出端口直接作为服务端口，但移除nodePort
                service_port = export_port.copy()
                if 'nodePort' in service_port:
                    del service_port['nodePort']
                mapped_ports.append(service_port)
            return mapped_ports

        # 服务端口和导出端口都存在，创建映射
        mapped_ports = []

        # 先处理服务端口
        for i, service_port in enumerate(service_ports):
            port_config = service_port.copy()

            # 如果有对应的导出端口，添加nodePort
            if i < len(export_ports):
                export_port = export_ports[i]
                port_config['nodePort'] = export_port['port']
                logger.info(f"映射端口: {service_port['name']}:{service_port['port']} -> NodePort:{export_port['port']}")

            mapped_ports.append(port_config)

        return mapped_ports

    def update_multi_ports(self, service_ports: Optional[str] = None,
                          export_ports: Optional[str] = None) -> bool:
        """更新多端口配置"""
        try:
            if not self.load_yaml():
                return False

            modified = False

            for doc in self.documents:
                if doc and doc.get('kind') == 'Service':
                    modified |= self._process_multi_ports(doc, service_ports, export_ports)

            if modified:
                return self.save_yaml()
            else:
                logger.info("无需修改端口配置")
                return True

        except Exception as e:
            logger.error(f"处理多端口配置失败: {e}")
            return False

    def _process_multi_ports(self, service_doc: Dict, service_ports: Optional[str],
                            export_ports: Optional[str]) -> bool:
        """处理单个Service的多端口配置"""
        modified = False
        spec = service_doc.get('spec', {})

        # 解析端口配置
        parsed_service_ports = self.parse_port_config(service_ports) if service_ports else []
        parsed_export_ports = self.parse_port_config(export_ports) if export_ports else []

        # 验证端口范围
        for port_info in parsed_service_ports:
            if not self.validate_port_range(port_info['port'], 'service'):
                logger.error(f"无效的服务端口: {port_info['port']}")
                return False

        for port_info in parsed_export_ports:
            if not self.validate_port_range(port_info['port'], 'export'):
                logger.error(f"无效的导出端口: {port_info['port']} (NodePort范围: 30000-32767)")
                return False

        # 创建端口映射
        if parsed_service_ports or parsed_export_ports:
            mapped_ports = self.create_port_mapping(parsed_service_ports, parsed_export_ports)

            if mapped_ports:
                spec['ports'] = mapped_ports
                modified = True

                # 如果有导出端口，设置Service类型为NodePort
                if parsed_export_ports:
                    spec['type'] = 'NodePort'
                    logger.info(f"设置Service类型为NodePort")

                logger.info(f"更新端口配置: 服务端口 {len(parsed_service_ports)} 个，导出端口 {len(parsed_export_ports)} 个")

        return modified
    
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
    parser = argparse.ArgumentParser(description='统一端口配置处理器')
    parser.add_argument('--yaml-file', required=True, help='YAML文件路径')

    # 传统单端口参数（向后兼容）
    parser.add_argument('--expose-port', help='暴露端口号（传统模式）')
    parser.add_argument('--force-port', action='store_true', help='强制覆盖端口')

    # 新的多端口参数
    parser.add_argument('--service-port', help='服务端口配置 (格式: 8080 或 http:8080,admin:9090)')
    parser.add_argument('--export-port', help='导出端口配置 (格式: 30080 或 http:30080,admin:30090)')

    # 功能参数
    parser.add_argument('--validate', action='store_true', help='验证端口配置')
    parser.add_argument('--info', action='store_true', help='显示端口信息')

    args = parser.parse_args()

    # 创建处理器
    handler = UnifiedPortConfigHandler(args.yaml_file)
    
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
        # 优先处理多端口配置
        if args.service_port or args.export_port:
            logger.info("使用多端口配置模式")
            if handler.update_multi_ports(args.service_port, args.export_port):
                return 0
            else:
                return 1

        # 传统单端口配置（向后兼容）
        elif args.expose_port:
            logger.info("使用传统单端口配置模式")
            if handler.enhance_service_nodeport(args.expose_port, args.force_port):
                return 0
            else:
                return 1

        else:
            logger.warning("未指定端口配置参数")
            return 0


if __name__ == '__main__':
    sys.exit(main())
