#!/usr/bin/env node

/**
 * 验证 DevOps Web 不使用前端 Mock 数据
 * 确保所有数据都来自后端 API
 */

const fs = require('fs');
const path = require('path');

// 需要检查的文件
const filesToCheck = [
  'devops-web/frontend/src/views/TemplateManagement.vue',
  'devops-web/frontend/src/views/WorkspaceList.vue',
  'devops-web/frontend/src/api/index.js'
];

// 不应该出现的 Mock 数据模式
const mockPatterns = [
  /const\s+mock\w+\s*=\s*\[/i,           // const mockData = [
  /\/\/\s*暂时使用模拟数据/i,              // // 暂时使用模拟数据
  /\/\/\s*使用模拟数据/i,                 // // 使用模拟数据
  /templates\.value\s*=\s*\[.*{.*}/i,    // templates.value = [{ ... }] (包含对象的数组)
];

// 应该出现的 API 调用模式
const apiPatterns = [
  /templatesApi\./,                      // templatesApi.
  /workspaceApi\./,                      // workspaceApi.
  /await.*Api\./,                        // await xxxApi.
  /\.get\(|\.post\(|\.put\(|\.delete\(/  // HTTP 方法调用
];

let hasIssues = false;

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`⚠️  文件不存在: ${filePath}`, 'warning');
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  log(`\n📁 检查文件: ${filePath}`, 'info');
  
  // 检查是否有 Mock 数据
  let foundMockData = false;
  mockPatterns.forEach((pattern, index) => {
    lines.forEach((line, lineNum) => {
      if (pattern.test(line)) {
        foundMockData = true;
        hasIssues = true;
        log(`   ❌ 第 ${lineNum + 1} 行发现 Mock 数据: ${line.trim()}`, 'error');
      }
    });
  });
  
  // 检查是否有 API 调用
  let foundApiCalls = false;
  apiPatterns.forEach((pattern) => {
    lines.forEach((line, lineNum) => {
      if (pattern.test(line)) {
        foundApiCalls = true;
        log(`   ✅ 第 ${lineNum + 1} 行发现 API 调用: ${line.trim()}`, 'success');
      }
    });
  });
  
  if (!foundMockData && foundApiCalls) {
    log(`   ✅ 文件检查通过: 使用真实 API，无 Mock 数据`, 'success');
  } else if (foundMockData) {
    log(`   ❌ 文件检查失败: 发现 Mock 数据`, 'error');
  } else if (!foundApiCalls) {
    log(`   ⚠️  文件检查警告: 未发现 API 调用`, 'warning');
  }
}

function checkBackendTemplates() {
  const backendFile = 'devops-web/backend/routes/templates.js';
  
  if (!fs.existsSync(backendFile)) {
    log(`❌ 后端模板文件不存在: ${backendFile}`, 'error');
    hasIssues = true;
    return;
  }
  
  const content = fs.readFileSync(backendFile, 'utf8');
  
  log(`\n🔧 检查后端模板配置`, 'info');
  
  // 检查是否有 Java 和 Vue 模板
  const hasSpringBoot = /Spring Boot/i.test(content);
  const hasVue = /Vue\.js|Vue/i.test(content);
  const hasDockerfile = /dockerfile.*FROM/i.test(content);
  const hasDeployYaml = /deployYaml.*apiVersion/i.test(content);
  
  if (hasSpringBoot) {
    log(`   ✅ 发现 Spring Boot 模板`, 'success');
  } else {
    log(`   ❌ 缺少 Spring Boot 模板`, 'error');
    hasIssues = true;
  }
  
  if (hasVue) {
    log(`   ✅ 发现 Vue.js 模板`, 'success');
  } else {
    log(`   ❌ 缺少 Vue.js 模板`, 'error');
    hasIssues = true;
  }
  
  if (hasDockerfile) {
    log(`   ✅ 模板包含 Dockerfile`, 'success');
  } else {
    log(`   ❌ 模板缺少 Dockerfile`, 'error');
    hasIssues = true;
  }
  
  if (hasDeployYaml) {
    log(`   ✅ 模板包含部署 YAML`, 'success');
  } else {
    log(`   ❌ 模板缺少部署 YAML`, 'error');
    hasIssues = true;
  }
}

function checkApiEndpoints() {
  const backendFile = 'devops-web/backend/routes/templates.js';
  
  if (!fs.existsSync(backendFile)) {
    return;
  }
  
  const content = fs.readFileSync(backendFile, 'utf8');
  
  log(`\n🌐 检查 API 端点`, 'info');
  
  const endpoints = [
    { method: 'GET', path: '/', description: '获取模板列表' },
    { method: 'GET', path: '/:templateId', description: '获取模板详情' },
    { method: 'POST', path: '/', description: '创建模板' },
    { method: 'PUT', path: '/:templateId', description: '更新模板' },
    { method: 'DELETE', path: '/:templateId', description: '删除模板' }
  ];
  
  endpoints.forEach(endpoint => {
    const pattern = new RegExp(`router\\.${endpoint.method.toLowerCase()}\\(['"]${endpoint.path.replace(/:/g, '\\:')}['"]`, 'i');
    if (pattern.test(content)) {
      log(`   ✅ ${endpoint.method} ${endpoint.path} - ${endpoint.description}`, 'success');
    } else {
      log(`   ❌ 缺少端点: ${endpoint.method} ${endpoint.path} - ${endpoint.description}`, 'error');
      hasIssues = true;
    }
  });
}

function main() {
  log('🔍 验证 DevOps Web 不使用前端 Mock 数据', 'info');
  log('=' .repeat(60), 'info');
  
  // 检查前端文件
  filesToCheck.forEach(checkFile);
  
  // 检查后端配置
  checkBackendTemplates();
  checkApiEndpoints();
  
  // 输出结果
  log('\n' + '=' .repeat(60), 'info');
  
  if (!hasIssues) {
    log('🎉 验证通过！', 'success');
    log('✅ 前端正确调用后端 API', 'success');
    log('✅ 后端提供完整的模板数据', 'success');
    log('✅ 模板包含 Dockerfile + 部署文件', 'success');
    log('✅ API 端点完整', 'success');
    
    log('\n📋 使用说明:', 'info');
    log('1. 启动后端: cd devops-web/backend && npm start', 'info');
    log('2. 启动前端: cd devops-web/frontend && npm run dev', 'info');
    log('3. 访问: http://localhost:5173', 'info');
    log('4. 测试 API: node test-templates-api.js', 'info');
    
  } else {
    log('❌ 验证失败！发现以下问题:', 'error');
    log('- 前端可能仍在使用 Mock 数据', 'error');
    log('- 后端模板配置可能不完整', 'error');
    log('- API 端点可能缺失', 'error');
    
    log('\n🔧 修复建议:', 'warning');
    log('1. 确保前端调用 templatesApi.getTemplates()', 'warning');
    log('2. 确保后端返回正确的数据结构', 'warning');
    log('3. 确保模板包含 files.dockerfile 和 files.deployYaml', 'warning');
    
    process.exit(1);
  }
}

main();
