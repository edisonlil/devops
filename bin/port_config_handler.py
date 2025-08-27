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

    def parse_port_config(self, port_config: str, is_export_port: bool = False) -> List[Dict[str, Any]]:
        """解析端口配置字符串

        支持的格式：
        1. 单端口：8080
        2. 多端口：8080,9090,3000
        3. 命名端口：http:8080,admin:9090
        4. 混合格式：8080,admin:9090,3000
        5. 容器指定格式：container1:http:8080,container2:admin:9090
        6. 混合容器格式：http:8080,sidecar:metrics:9090
        7. 显式映射格式（仅export-port）：8080:30080,9090:30090
        """
        if not port_config:
            return []

        ports = []
        port_items = [item.strip() for item in port_config.split(',')]

        for port_item in port_items:
            port_parts = port_item.split(':')

            if len(port_parts) == 3:
                # 容器指定格式：container:name:port
                container_name = port_parts[0].strip()
                port_name = port_parts[1].strip()
                port_number = port_parts[2].strip()

                if port_number.isdigit():
                    ports.append({
                        'container': container_name,
                        'name': port_name,
                        'port': int(port_number),
                        'targetPort': int(port_number),
                        'protocol': 'TCP'
                    })
                else:
                    logger.warning(f"无效的端口号: {port_number}")
            elif len(port_parts) == 2:
                part1 = port_parts[0].strip()
                part2 = port_parts[1].strip()

                # 检查是否是显式映射格式 (servicePort:nodePort)
                if is_export_port and part1.isdigit() and part2.isdigit():
                    # 显式映射格式：servicePort:nodePort
                    service_port_num = int(part1)
                    node_port_num = int(part2)
                    ports.append({
                        'name': f'port-{node_port_num}',
                        'port': node_port_num,
                        'targetPort': node_port_num,
                        'protocol': 'TCP',
                        'service_port': service_port_num  # 标记这是显式映射
                    })
                    logger.info(f"解析显式映射: ServicePort {service_port_num} -> NodePort {node_port_num}")
                elif part2.isdigit():
                    # 命名端口格式：name:port
                    port_name = part1
                    port_number = int(part2)
                    ports.append({
                        'name': port_name,
                        'port': port_number,
                        'targetPort': port_number,
                        'protocol': 'TCP'
                    })
                else:
                    logger.warning(f"无效的端口号: {part2}")
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
            return True  # 移除NodePort范围限制
        return False

    def create_port_mapping(self, service_ports: List[Dict], export_ports: List[Dict]) -> List[Dict]:
        """创建服务端口和导出端口的正确映射关系

        规则：
        1. 优先使用显式映射 (serviceport:nodeport)
        2. 未显式映射的端口按顺序一一对应
        3. 如果只有一个导出端口，映射到第一个服务端口
        4. 如果导出端口多于服务端口，多余的导出端口被忽略
        5. 如果服务端口多于导出端口，多余的服务端口不暴露NodePort
        """
        if not service_ports and not export_ports:
            return []

        # 分离显式映射和顺序映射的导出端口
        explicit_export_map = {}
        sequential_exports = []
        for export_port in export_ports:
            if 'service_port' in export_port:
                # 显式映射项 (service_port: node_port)
                explicit_export_map[export_port['service_port']] = export_port['port']
                logger.info(f"显式映射配置: ServicePort {export_port['service_port']} -> NodePort {export_port['port']}")
            else:
                # 顺序映射项
                sequential_exports.append(export_port)

        # 如果只有服务端口，没有导出端口
        if service_ports and not export_ports:
            return service_ports

        # 如果只有导出端口，没有服务端口，创建对应的服务端口
        if export_ports and not service_ports:
            mapped_ports = []
            for export_port in export_ports:
                service_port = export_port.copy()
                if 'service_port' in service_port:
                    service_port['port'] = service_port.pop('service_port')
                if 'nodePort' in service_port:
                    del service_port['nodePort']
                mapped_ports.append(service_port)
            return mapped_ports

        # 服务端口和导出端口都存在，创建映射
        mapped_ports = []
        sequential_index = 0

        for service_port in service_ports:
            port_config = service_port.copy()
            service_port_num = service_port['port']

            # 1. 优先检查显式映射
            if service_port_num in explicit_export_map:
                port_config['nodePort'] = explicit_export_map[service_port_num]
                logger.info(f"显式映射端口: {service_port['name']}:{service_port_num} -> NodePort:{explicit_export_map[service_port_num]}")
            # 2. 再检查顺序映射
            elif sequential_index < len(sequential_exports):
                export_port = sequential_exports[sequential_index]
                port_config['nodePort'] = export_port['port']
                logger.info(f"顺序映射端口: {service_port['name']}:{service_port_num} -> NodePort:{export_port['port']}")
                sequential_index += 1

            mapped_ports.append(port_config)

        return mapped_ports

    def update_multi_ports(self, service_ports: Optional[str] = None,
                          export_ports: Optional[str] = None) -> bool:
        """更新多端口配置"""
        try:
            if not self.load_yaml():
                return False

            modified = False
            parsed_service_ports = self.parse_port_config(service_ports) if service_ports else []

            # 处理所有文档
            for doc in self.documents:
                if doc and doc.get('kind') == 'Deployment':
                    modified |= self._process_deployment_ports(doc, parsed_service_ports)
                elif doc and doc.get('kind') == 'Service':
                    modified |= self._process_multi_ports(doc, service_ports, export_ports)

            if modified:
                return self.save_yaml()
            else:
                logger.info("无需修改端口配置")
                return True

        except Exception as e:
            logger.error(f"处理多端口配置失败: {e}")
            return False

    def _identify_main_container(self, containers: List[Dict]) -> int:
        """识别主容器的索引"""
        if not containers:
            return -1

        # 常见的sidecar容器名称模式
        sidecar_patterns = [
            'istio-proxy', 'envoy', 'proxy', 'sidecar',
            'fluentd', 'filebeat', 'logstash', 'logging',
            'prometheus', 'metrics', 'monitoring',
            'jaeger', 'zipkin', 'tracing'
        ]

        # 查找非sidecar容器
        for i, container in enumerate(containers):
            container_name = container.get('name', '').lower()
            image = container.get('image', '').lower()

            # 检查是否是sidecar容器
            is_sidecar = any(pattern in container_name or pattern in image
                           for pattern in sidecar_patterns)

            if not is_sidecar:
                logger.info(f"识别主容器: {container.get('name', f'container-{i}')} (索引: {i})")
                return i

        # 如果没有找到明确的主容器，返回第一个
        logger.info(f"使用第一个容器作为主容器: {containers[0].get('name', 'container-0')}")
        return 0

    def _process_deployment_ports(self, deployment_doc: Dict, parsed_service_ports: List[Dict]) -> bool:
        """处理Deployment的containerPort配置"""
        if not parsed_service_ports:
            return False

        modified = False
        spec = deployment_doc.get('spec', {})
        template = spec.get('template', {})
        pod_spec = template.get('spec', {})
        containers = pod_spec.get('containers', [])

        if not containers:
            logger.warning("Deployment中没有找到containers配置")
            return False

        # 创建容器名称到索引的映射
        container_name_to_index = {}
        for i, container in enumerate(containers):
            container_name = container.get('name', f'container-{i}')
            container_name_to_index[container_name] = i

        # 识别主容器
        main_container_index = self._identify_main_container(containers)

        # 按容器分组端口配置
        container_ports = {}  # container_index -> [port_configs]

        for service_port in parsed_service_ports:
            target_container_index = main_container_index  # 默认使用主容器

            # 检查是否指定了容器
            if 'container' in service_port:
                container_name = service_port['container']
                if container_name in container_name_to_index:
                    target_container_index = container_name_to_index[container_name]
                    logger.info(f"端口 {service_port['name']} 指定到容器: {container_name}")
                else:
                    logger.warning(f"指定的容器 '{container_name}' 不存在，使用主容器")

            if target_container_index not in container_ports:
                container_ports[target_container_index] = []
            container_ports[target_container_index].append(service_port)

        # 处理每个容器的端口配置
        for container_index, port_configs in container_ports.items():
            if container_index >= len(containers):
                continue

            container = containers[container_index]
            container_name = container.get('name', f'container-{container_index}')
            existing_ports = container.get('ports', [])

            # 获取现有的containerPort列表
            existing_port_numbers = set()
            for port in existing_ports:
                if 'containerPort' in port:
                    existing_port_numbers.add(port['containerPort'])

            # 检查需要添加的端口
            for service_port in port_configs:
                port_number = service_port['targetPort']
                port_name = service_port['name']

                # 如果端口号不存在，添加新的containerPort
                if port_number not in existing_port_numbers:
                    new_container_port = {
                        'containerPort': port_number,
                        'name': port_name,
                        'protocol': service_port.get('protocol', 'TCP')
                    }
                    existing_ports.append(new_container_port)
                    logger.info(f"添加containerPort到 {container_name}: {port_name}:{port_number}")
                    modified = True
                else:
                    # 端口号存在，检查是否需要更新名称
                    for existing_port in existing_ports:
                        if existing_port.get('containerPort') == port_number:
                            if existing_port.get('name') != port_name:
                                existing_port['name'] = port_name
                                logger.info(f"更新 {container_name} containerPort名称: {port_number} -> {port_name}")
                                modified = True
                            break

            # 更新容器的ports配置
            if existing_ports:
                container['ports'] = existing_ports

        return modified

    def _process_multi_ports(self, service_doc: Dict, service_ports: Optional[str],
                            export_ports: Optional[str]) -> bool:
        """处理单个Service的多端口配置"""
        modified = False
        spec = service_doc.get('spec', {})

        # 解析端口配置
        parsed_service_ports = self.parse_port_config(service_ports) if service_ports else []
        parsed_export_ports = self.parse_port_config(export_ports, is_export_port=True) if export_ports else []

        # 创建端口映射 (已移除端口验证)
        if parsed_service_ports or parsed_export_ports:
            mapped_ports = self.create_port_mapping(parsed_service_ports, parsed_export_ports)

            if mapped_ports:
                spec['ports'] = mapped_ports
                modified = True

                # 检查是否有任何端口配置了nodePort，如有则设置Service类型为NodePort
                has_node_ports = any('nodePort' in port for port in spec['ports'])
                if has_node_ports:
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
            logger.warning("Service中没有找到ports配置")
            return False
        
        # 查找HTTP端口
        http_port = None
        for port in ports:
            if port.get('name') == 'http' or port.get('protocol') == 'TCP':
                http_port = port
                break
        
        if not http_port:
            logger.warning("Service中没有找到HTTP端口")
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
                    logger.warning(f"模板已有固定NodePort: {template_port}，使用 --force-port 可强制覆盖为 {expose_port}")
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
            logger.warning("Service中没有ports配置")
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
    parser.add_argument('--service-port', help='''服务端口配置，支持多种格式:
        - 简单格式: 8080 或 http:8080,admin:9090
        - 容器指定格式: container1:http:8080,container2:admin:9090
        - 混合格式: http:8080,sidecar:metrics:9090''')
    parser.add_argument('--export-port', help='''导出端口配置，支持多种格式:
        - 顺序映射: 30080,30090,30300
        - 命名映射: http:30080,admin:30090
        - 显式映射: 8080:30080,9090:30090 (servicePort:nodePort)
        - 混合格式: 9090:31090,30080,4000:31400,30300''')

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
