#!/usr/bin/env node

/**
 * DevOps Web 模板 API 测试脚本
 * 测试模板管理的所有 API 端点
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 测试结果统计
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// 日志函数
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // 青色
    success: '\x1b[32m', // 绿色
    error: '\x1b[31m',   // 红色
    warning: '\x1b[33m', // 黄色
    reset: '\x1b[0m'     // 重置
  };
  
  console.log(`${colors[type]}${message}${colors.reset}`);
}

// 测试函数
async function runTest(testName, testFn) {
  testResults.total++;
  try {
    log(`\n🧪 测试: ${testName}`, 'info');
    await testFn();
    testResults.passed++;
    log(`✅ 通过: ${testName}`, 'success');
  } catch (error) {
    testResults.failed++;
    log(`❌ 失败: ${testName}`, 'error');
    log(`   错误: ${error.message}`, 'error');
  }
}

// 测试健康检查
async function testHealth() {
  const response = await api.get('/health');
  if (response.status !== 200) {
    throw new Error(`健康检查失败，状态码: ${response.status}`);
  }
  log(`   响应: ${JSON.stringify(response.data)}`, 'info');
}

// 测试获取模板列表
async function testGetTemplates() {
  const response = await api.get('/templates');
  
  if (response.status !== 200) {
    throw new Error(`获取模板列表失败，状态码: ${response.status}`);
  }
  
  const { data } = response.data;
  if (!data.templates || !Array.isArray(data.templates)) {
    throw new Error('响应数据格式错误，缺少 templates 数组');
  }
  
  if (!data.categories || !Array.isArray(data.categories)) {
    throw new Error('响应数据格式错误，缺少 categories 数组');
  }
  
  log(`   找到 ${data.templates.length} 个模板`, 'info');
  log(`   找到 ${data.categories.length} 个分类`, 'info');
  
  // 验证模板数据结构
  const template = data.templates[0];
  if (template) {
    const requiredFields = ['id', 'name', 'description', 'category', 'files'];
    for (const field of requiredFields) {
      if (!template[field]) {
        throw new Error(`模板缺少必需字段: ${field}`);
      }
    }
    
    // 验证 files 字段
    if (!template.files.dockerfile || !template.files.deployYaml) {
      throw new Error('模板 files 字段缺少 dockerfile 或 deployYaml');
    }
    
    log(`   模板结构验证通过`, 'info');
  }
}

// 测试获取单个模板
async function testGetTemplate() {
  const response = await api.get('/templates/1');
  
  if (response.status !== 200) {
    throw new Error(`获取模板详情失败，状态码: ${response.status}`);
  }
  
  const { data } = response.data;
  if (!data.template) {
    throw new Error('响应数据格式错误，缺少 template 对象');
  }
  
  log(`   模板名称: ${data.template.name}`, 'info');
  log(`   模板分类: ${data.template.category}`, 'info');
}

// 测试创建模板
async function testCreateTemplate() {
  const newTemplate = {
    name: '测试模板',
    description: '这是一个测试模板',
    category: 'backend',
    scope: 'workspace',
    platformTypes: ['KUBERNETES'],
    author: 'Test User',
    files: {
      dockerfile: 'FROM node:16\nWORKDIR /app\nCOPY . .\nRUN npm install\nEXPOSE 3000\nCMD ["npm", "start"]',
      deployYaml: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: test-app'
    },
    tags: ['test', 'demo']
  };
  
  const response = await api.post('/templates', newTemplate);
  
  if (response.status !== 201) {
    throw new Error(`创建模板失败，状态码: ${response.status}`);
  }
  
  const { data } = response.data;
  if (!data.template || !data.template.id) {
    throw new Error('创建模板响应格式错误');
  }
  
  log(`   创建的模板 ID: ${data.template.id}`, 'info');
  return data.template.id;
}

// 测试更新模板
async function testUpdateTemplate(templateId) {
  const updateData = {
    name: '更新后的测试模板',
    description: '这是一个更新后的测试模板'
  };
  
  const response = await api.put(`/templates/${templateId}`, updateData);
  
  if (response.status !== 200) {
    throw new Error(`更新模板失败，状态码: ${response.status}`);
  }
  
  log(`   模板更新成功`, 'info');
}

// 测试删除模板
async function testDeleteTemplate(templateId) {
  const response = await api.delete(`/templates/${templateId}`);
  
  if (response.status !== 200) {
    throw new Error(`删除模板失败，状态码: ${response.status}`);
  }
  
  log(`   模板删除成功`, 'info');
}

// 测试筛选功能
async function testTemplateFiltering() {
  // 测试按分类筛选
  const categoryResponse = await api.get('/templates?category=backend');
  if (categoryResponse.status !== 200) {
    throw new Error('按分类筛选失败');
  }
  
  // 测试搜索功能
  const searchResponse = await api.get('/templates?search=Spring');
  if (searchResponse.status !== 200) {
    throw new Error('搜索功能失败');
  }
  
  log(`   筛选和搜索功能正常`, 'info');
}

// 主测试函数
async function runAllTests() {
  log('🚀 开始 DevOps Web 模板 API 测试', 'info');
  log('=' .repeat(50), 'info');
  
  // 基础功能测试
  await runTest('健康检查', testHealth);
  await runTest('获取模板列表', testGetTemplates);
  await runTest('获取单个模板', testGetTemplate);
  await runTest('模板筛选和搜索', testTemplateFiltering);
  
  // CRUD 操作测试
  let createdTemplateId;
  await runTest('创建模板', async () => {
    createdTemplateId = await testCreateTemplate();
  });
  
  if (createdTemplateId) {
    await runTest('更新模板', () => testUpdateTemplate(createdTemplateId));
    await runTest('删除模板', () => testDeleteTemplate(createdTemplateId));
  }
  
  // 输出测试结果
  log('\n' + '=' .repeat(50), 'info');
  log('📊 测试结果统计:', 'info');
  log(`   总计: ${testResults.total}`, 'info');
  log(`   通过: ${testResults.passed}`, 'success');
  log(`   失败: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
  log(`   成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 
      testResults.failed === 0 ? 'success' : 'warning');
  
  if (testResults.failed === 0) {
    log('\n🎉 所有测试通过！模板 API 工作正常。', 'success');
    process.exit(0);
  } else {
    log('\n⚠️  部分测试失败，请检查后端服务。', 'warning');
    process.exit(1);
  }
}

// 错误处理
process.on('unhandledRejection', (error) => {
  log(`未处理的错误: ${error.message}`, 'error');
  process.exit(1);
});

// 检查后端服务是否运行
async function checkBackendService() {
  try {
    await api.get('/health');
    log('✅ 后端服务运行正常', 'success');
  } catch (error) {
    log('❌ 无法连接到后端服务', 'error');
    log('   请确保后端服务在 http://localhost:3000 运行', 'warning');
    log('   启动命令: cd devops-web/backend && npm start', 'info');
    process.exit(1);
  }
}

// 启动测试
async function main() {
  await checkBackendService();
  await runAllTests();
}

main().catch(error => {
  log(`测试执行失败: ${error.message}`, 'error');
  process.exit(1);
});
