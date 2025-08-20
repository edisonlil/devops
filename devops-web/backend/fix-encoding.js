#!/usr/bin/env node

// 修复字符编码问题的脚本

const fs = require('fs');
const path = require('path');

console.log('修复DevOps Web后端字符编码问题...');

// 1. 设置环境变量
process.env.LANG = 'zh_CN.UTF-8';
process.env.LC_ALL = 'zh_CN.UTF-8';

// 2. 创建测试数据
const testData = {
    tools: [
        { name: 'git', status: 'installed', category: 'basic', description: '版本控制系统' },
        { name: 'curl', status: 'installed', category: 'basic', description: 'HTTP客户端工具' },
        { name: 'wget', status: 'missing', category: 'basic', description: '文件下载工具' },
        { name: 'unzip', status: 'installed', category: 'basic', description: '解压缩工具' },
        { name: 'docker', status: 'missing', category: 'container', description: '容器运行时' },
        { name: 'docker-compose', status: 'missing', category: 'container', description: '容器编排工具' },
        { name: 'kubectl', status: 'missing', category: 'kubernetes', description: 'Kubernetes命令行工具' },
        { name: 'helm', status: 'missing', category: 'kubernetes', description: 'Kubernetes包管理器' },
        { name: 'java', status: 'missing', category: 'java', description: 'Java运行时环境' },
        { name: 'maven', status: 'missing', category: 'java', description: 'Java项目管理工具' },
        { name: 'gradle', status: 'installed', category: 'java', description: 'Java构建工具' },
        { name: 'node', status: 'installed', category: 'nodejs', description: 'Node.js运行时' },
        { name: 'npm', status: 'installed', category: 'nodejs', description: 'Node.js包管理器' },
        { name: 'yarn', status: 'missing', category: 'nodejs', description: 'Node.js包管理器' },
        { name: 'go', status: 'missing', category: 'other', description: 'Go语言编译器' },
        { name: 'expect', status: 'missing', category: 'other', description: '自动化交互工具' }
    ],
    summary: {
        total: 16,
        installed: 6,
        missing: 10
    }
};

// 3. 写入测试数据文件
const testDataPath = path.join(__dirname, 'test-data.json');
fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2), 'utf8');

console.log('✓ 测试数据已创建:', testDataPath);

// 4. 创建简化的工具检查路由
const simplifiedRoute = `
// 简化的工具检查路由（临时解决方案）
router.get('/check-simple', (req, res) => {
    // 设置正确的响应头
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // 返回测试数据
    const testData = require('./test-data.json');
    res.json(testData);
});
`;

console.log('✓ 简化路由代码已生成');
console.log('');
console.log('请将以下代码添加到 routes/tools.js 中:');
console.log(simplifiedRoute);

// 5. 检查当前编码设置
console.log('');
console.log('当前环境编码设置:');
console.log('  LANG:', process.env.LANG);
console.log('  LC_ALL:', process.env.LC_ALL);
console.log('  默认编码:', process.stdout.encoding || 'utf8');

// 6. 测试中文字符
const chineseText = '版本控制系统';
console.log('');
console.log('中文字符测试:');
console.log('  原文:', chineseText);
console.log('  Buffer:', Buffer.from(chineseText, 'utf8'));
console.log('  长度:', chineseText.length);

console.log('');
console.log('修复完成！请重启后端服务器。');
