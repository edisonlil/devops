#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DevOps 快捷键管理器
负责快捷键的存储、读取和管理
"""

import json
import os
import sys
import argparse
import shlex
from pathlib import Path
from datetime import datetime

class ShortcutManager:
    """快捷键管理器"""
    
    def __init__(self, workspace_path):
        self.workspace_path = Path(workspace_path)
        self.shortcuts_dir = self.workspace_path / "shortcuts"
        self.shortcuts_dir.mkdir(exist_ok=True)
    
    def save_shortcut(self, name, command, description="", tags=None):
        """保存快捷键"""
        if not self._validate_name(name):
            raise ValueError(f"无效的快捷键名称: {name}")
        
        shortcut_data = {
            "name": name,
            "description": description or f"快捷键: {name}",
            "command": command.strip(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "tags": tags or [],
            "workspace": self.workspace_path.name
        }
        
        shortcut_file = self.shortcuts_dir / f"{name}.json"
        
        try:
            with open(shortcut_file, 'w', encoding='utf-8') as f:
                json.dump(shortcut_data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            raise RuntimeError(f"保存快捷键失败: {e}")
    
    def get_shortcut(self, name, override_args=""):
        """获取快捷键命令"""
        shortcut_file = self.shortcuts_dir / f"{name}.json"
        
        if not shortcut_file.exists():
            return None
        
        try:
            with open(shortcut_file, 'r', encoding='utf-8') as f:
                shortcut_data = json.load(f)
        except Exception as e:
            raise RuntimeError(f"读取快捷键失败: {e}")
        
        command = shortcut_data["command"]
        
        # 处理参数覆盖
        if override_args:
            command = self._apply_overrides(command, override_args)
        
        return command
    
    def list_shortcuts(self, tags=None, format_output=False):
        """列出快捷键"""
        shortcuts = []
        
        try:
            for shortcut_file in self.shortcuts_dir.glob("*.json"):
                with open(shortcut_file, 'r', encoding='utf-8') as f:
                    shortcut_data = json.load(f)
                
                # 标签过滤
                if tags and not any(tag in shortcut_data.get("tags", []) for tag in tags):
                    continue
                
                shortcuts.append(shortcut_data)
        except Exception as e:
            raise RuntimeError(f"读取快捷键列表失败: {e}")
        
        # 按名称排序
        shortcuts.sort(key=lambda x: x["name"])
        
        if format_output:
            return self._format_shortcuts_output(shortcuts)
        else:
            return shortcuts
    
    def delete_shortcut(self, name):
        """删除快捷键"""
        shortcut_file = self.shortcuts_dir / f"{name}.json"
        
        if not shortcut_file.exists():
            return False
        
        try:
            shortcut_file.unlink()
            return True
        except Exception as e:
            raise RuntimeError(f"删除快捷键失败: {e}")
    
    def shortcut_exists(self, name):
        """检查快捷键是否存在"""
        shortcut_file = self.shortcuts_dir / f"{name}.json"
        return shortcut_file.exists()
    
    def get_shortcut_info(self, name):
        """获取快捷键详细信息"""
        shortcut_file = self.shortcuts_dir / f"{name}.json"
        
        if not shortcut_file.exists():
            return None
        
        try:
            with open(shortcut_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            raise RuntimeError(f"读取快捷键信息失败: {e}")
    
    def update_shortcut(self, name, **kwargs):
        """更新快捷键"""
        shortcut_info = self.get_shortcut_info(name)
        if not shortcut_info:
            return False
        
        # 更新字段
        for key, value in kwargs.items():
            if key in ['command', 'description', 'tags']:
                shortcut_info[key] = value
        
        shortcut_info['updated_at'] = datetime.now().isoformat()
        
        shortcut_file = self.shortcuts_dir / f"{name}.json"
        try:
            with open(shortcut_file, 'w', encoding='utf-8') as f:
                json.dump(shortcut_info, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            raise RuntimeError(f"更新快捷键失败: {e}")
    
    def _validate_name(self, name):
        """验证快捷键名称"""
        if not name or not isinstance(name, str):
            return False
        
        # 只允许字母、数字、连字符和下划线
        import re
        return re.match(r'^[a-zA-Z0-9_-]+$', name) is not None
    
    def _apply_overrides(self, command, override_args):
        """应用参数覆盖"""
        # 简单实现：解析覆盖参数并追加到命令后
        try:
            # 解析覆盖参数
            override_parts = shlex.split(override_args)
            
            # 如果覆盖参数以--override开头，去掉它
            if override_parts and override_parts[0] == '--override':
                override_parts = override_parts[1:]
            
            if override_parts:
                return f"{command} {' '.join(shlex.quote(part) for part in override_parts)}"
            else:
                return command
        except Exception:
            # 如果解析失败，直接追加
            return f"{command} {override_args}"
    
    def _format_shortcuts_output(self, shortcuts):
        """格式化快捷键输出"""
        if not shortcuts:
            return "没有找到快捷键"
        
        output_lines = []
        output_lines.append("可用的快捷键:")
        output_lines.append("-" * 50)
        
        for shortcut in shortcuts:
            name = shortcut["name"]
            desc = shortcut.get("description", "")
            tags = shortcut.get("tags", [])
            
            line = f"  {name}"
            if desc and desc != f"快捷键: {name}":
                line += f" - {desc}"
            if tags:
                line += f" [{', '.join(tags)}]"
            
            output_lines.append(line)
        
        return "\n".join(output_lines)

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='DevOps快捷键管理器')
    parser.add_argument('action', choices=['save', 'get', 'list', 'delete', 'exists', 'info', 'update'])
    parser.add_argument('--name', help='快捷键名称')
    parser.add_argument('--command', help='要保存的命令')
    parser.add_argument('--workspace', help='工作空间路径', required=True)
    parser.add_argument('--override', help='覆盖参数')
    parser.add_argument('--description', help='快捷键描述')
    parser.add_argument('--tags', help='标签（逗号分隔）')
    parser.add_argument('--format', action='store_true', help='格式化输出')
    
    args = parser.parse_args()
    
    try:
        manager = ShortcutManager(args.workspace)
        
        if args.action == 'save':
            if not args.name or not args.command:
                print("错误：保存快捷键需要名称和命令", file=sys.stderr)
                sys.exit(1)
            
            tags = [tag.strip() for tag in args.tags.split(',')] if args.tags else []
            manager.save_shortcut(args.name, args.command, args.description or "", tags)
            print(f"快捷键 '{args.name}' 保存成功")
        
        elif args.action == 'get':
            if not args.name:
                print("错误：需要指定快捷键名称", file=sys.stderr)
                sys.exit(1)
            
            command = manager.get_shortcut(args.name, args.override or "")
            if command:
                print(command)
            else:
                print(f"错误：快捷键 '{args.name}' 不存在", file=sys.stderr)
                sys.exit(1)
        
        elif args.action == 'list':
            tags = [tag.strip() for tag in args.tags.split(',')] if args.tags else None
            
            if args.format:
                output = manager.list_shortcuts(tags, format_output=True)
                print(output)
            else:
                shortcuts = manager.list_shortcuts(tags)
                for shortcut in shortcuts:
                    print(f"{shortcut['name']}: {shortcut.get('description', shortcut['command'])}")
        
        elif args.action == 'delete':
            if not args.name:
                print("错误：需要指定快捷键名称", file=sys.stderr)
                sys.exit(1)
            
            if manager.delete_shortcut(args.name):
                print(f"快捷键 '{args.name}' 删除成功")
            else:
                print(f"错误：快捷键 '{args.name}' 不存在", file=sys.stderr)
                sys.exit(1)
        
        elif args.action == 'exists':
            if not args.name:
                print("错误：需要指定快捷键名称", file=sys.stderr)
                sys.exit(1)
            
            if manager.shortcut_exists(args.name):
                sys.exit(0)  # 存在
            else:
                sys.exit(1)  # 不存在
        
        elif args.action == 'info':
            if not args.name:
                print("错误：需要指定快捷键名称", file=sys.stderr)
                sys.exit(1)
            
            info = manager.get_shortcut_info(args.name)
            if info:
                print(json.dumps(info, indent=2, ensure_ascii=False))
            else:
                print(f"错误：快捷键 '{args.name}' 不存在", file=sys.stderr)
                sys.exit(1)
        
        elif args.action == 'update':
            if not args.name:
                print("错误：需要指定快捷键名称", file=sys.stderr)
                sys.exit(1)
            
            update_data = {}
            if args.command:
                update_data['command'] = args.command
            if args.description:
                update_data['description'] = args.description
            if args.tags:
                update_data['tags'] = [tag.strip() for tag in args.tags.split(',')]
            
            if not update_data:
                print("错误：没有指定要更新的内容", file=sys.stderr)
                sys.exit(1)
            
            if manager.update_shortcut(args.name, **update_data):
                print(f"快捷键 '{args.name}' 更新成功")
            else:
                print(f"错误：快捷键 '{args.name}' 不存在", file=sys.stderr)
                sys.exit(1)
    
    except Exception as e:
        print(f"错误：{e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
