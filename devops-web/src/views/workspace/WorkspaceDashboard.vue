<template>
  <div class="control-panel">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">控制台</h1>
      <p class="page-subtitle">管理您的 DevOps 资源和服务</p>
    </div>

    <!-- 服务卡片网格 -->
    <div class="services-grid">
      <!-- 中间件管理 -->
      <div class="service-card" @click="goToMiddleware">
        <div class="card-header">
          <div class="card-stats">
            <div class="stat-number">5</div>
            <div class="stat-number">4</div>
          </div>
        </div>
        <div class="card-icon">
          <div class="icon-bg middleware-icon"></div>
        </div>
        <div class="card-content">
          <h3 class="card-title">中间件管理</h3>
          <p class="card-description">管理数据库、缓存、消息队列等中间件服务</p>
        </div>
        <div class="card-stats-labels">
          <span class="stat-label">实例</span>
          <span class="stat-label">运行中</span>
        </div>
      </div>

      <!-- 应用管理 -->
      <div class="service-card" @click="goToApplication">
        <div class="card-header">
          <div class="card-stats">
            <div class="stat-number">12</div>
            <div class="stat-number">8</div>
          </div>
        </div>
        <div class="card-icon">
          <div class="icon-bg application-icon"></div>
        </div>
        <div class="card-content">
          <h3 class="card-title">应用管理</h3>
          <p class="card-description">部署和管理容器化应用程序</p>
        </div>
        <div class="card-stats-labels">
          <span class="stat-label">应用</span>
          <span class="stat-label">运行中</span>
        </div>
      </div>

      <!-- 远程部署 -->
      <div class="service-card" @click="goToRemoteDeploy">
        <div class="card-header">
          <div class="card-stats">
            <div class="stat-number">3</div>
            <div class="stat-number">2</div>
          </div>
        </div>
        <div class="card-icon">
          <div class="icon-bg remote-icon"></div>
        </div>
        <div class="card-content">
          <h3 class="card-title">远程部署</h3>
          <p class="card-description">远程执行devops命令，管理多服务器部署</p>
        </div>
        <div class="card-stats-labels">
          <span class="stat-label">服务器</span>
          <span class="stat-label">在线</span>
        </div>
      </div>

      <!-- 数据库 -->
      <div class="service-card" @click="goToDatabase">
        <div class="card-header">
          <div class="card-stats">
            <div class="stat-number">3</div>
            <div class="stat-number">45</div>
          </div>
        </div>
        <div class="card-icon">
          <div class="icon-bg database-icon"></div>
        </div>
        <div class="card-content">
          <h3 class="card-title">数据库</h3>
          <p class="card-description">MySQL、PostgreSQL、MongoDB 等数据库服务</p>
        </div>
        <div class="card-stats-labels">
          <span class="stat-label">实例</span>
          <span class="stat-label">连接数</span>
        </div>
      </div>

      <!-- 监控告警 -->
      <div class="service-card" @click="goToMonitoring">
        <div class="card-header">
          <div class="card-stats">
            <div class="stat-number">3</div>
            <div class="stat-number">45</div>
          </div>
        </div>
        <div class="card-icon">
          <div class="icon-bg monitoring-icon"></div>
        </div>
        <div class="card-content">
          <h3 class="card-title">监控告警</h3>
          <p class="card-description">系统监控、性能分析和告警通知</p>
        </div>
        <div class="card-stats-labels">
          <span class="stat-label">实例</span>
          <span class="stat-label">连接数</span>
        </div>
      </div>

      <!-- CI/CD -->
      <div class="service-card" @click="goToCI">
        <div class="card-header">
          <div class="card-stats">
            <div class="stat-number"></div>
            <div class="stat-number"></div>
          </div>
        </div>
        <div class="card-icon">
          <div class="icon-bg cicd-icon"></div>
        </div>
        <div class="card-content">
          <h3 class="card-title">CI/CD</h3>
          <p class="card-description">持续集成和持续部署流水线</p>
        </div>
        <div class="card-stats-labels">
          <span class="stat-label"></span>
          <span class="stat-label"></span>
        </div>
      </div>

      <!-- 存储管理 -->
      <div class="service-card" @click="goToStorage">
        <div class="card-header">
          <div class="card-stats">
            <div class="stat-number"></div>
            <div class="stat-number"></div>
          </div>
        </div>
        <div class="card-icon">
          <div class="icon-bg storage-icon"></div>
        </div>
        <div class="card-content">
          <h3 class="card-title">存储管理</h3>
          <p class="card-description">对象存储、文件系统和数据备份</p>
        </div>
        <div class="card-stats-labels">
          <span class="stat-label"></span>
          <span class="stat-label"></span>
        </div>
      </div>

      <!-- 网络服务 -->
      <div class="service-card" @click="goToNetwork">
        <div class="card-header">
          <div class="card-stats">
            <div class="stat-number"></div>
            <div class="stat-number"></div>
          </div>
        </div>
        <div class="card-icon">
          <div class="icon-bg network-icon"></div>
        </div>
        <div class="card-content">
          <h3 class="card-title">网络服务</h3>
          <p class="card-description">负载均衡、域名解析和网络安全</p>
        </div>
        <div class="card-stats-labels">
          <span class="stat-label"></span>
          <span class="stat-label"></span>
        </div>
      </div>

      <!-- 安全管理 -->
      <div class="service-card" @click="goToSecurity">
        <div class="card-header">
          <div class="card-stats">
            <div class="stat-number"></div>
            <div class="stat-number"></div>
          </div>
        </div>
        <div class="card-icon">
          <div class="icon-bg security-icon"></div>
        </div>
        <div class="card-content">
          <h3 class="card-title">安全管理</h3>
          <p class="card-description">访问控制、证书管理和安全审计</p>
        </div>
        <div class="card-stats-labels">
          <span class="stat-label"></span>
          <span class="stat-label"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const workspaceName = computed(() => route.params.workspaceName as string)

// 导航函数
const goToMiddleware = () => {
  router.push(`/workspace/${workspaceName.value}/middleware`)
}

const goToApplication = () => {
  router.push(`/workspace/${workspaceName.value}/application`)
}

const goToRemoteDeploy = () => {
  router.push(`/workspace/${workspaceName.value}/deploy`)
}

const goToDatabase = () => {
  // 跳转到中间件管理的数据库分类
  router.push(`/workspace/${workspaceName.value}/middleware`)
}

const goToMonitoring = () => {
  // 跳转到中间件管理的监控分类
  router.push(`/workspace/${workspaceName.value}/middleware`)
}

const goToCI = () => {
  // 预留CI/CD功能入口
  console.log('CI/CD功能开发中...')
}

const goToStorage = () => {
  // 预留存储管理功能入口
  console.log('存储管理功能开发中...')
}

const goToNetwork = () => {
  // 预留网络服务功能入口
  console.log('网络服务功能开发中...')
}

const goToSecurity = () => {
  // 预留安全管理功能入口
  console.log('安全管理功能开发中...')
}
</script>

<style scoped>
.control-panel {
  padding: 24px;
  background: #f6f8fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.page-subtitle {
  font-size: 14px;
  color: #6e7781;
  margin: 0;
  font-weight: 400;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.service-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #e1e4e8;
  transition: all 0.2s ease;
  position: relative;
  min-height: 140px;
  display: flex;
  flex-direction: column;
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.card-header {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
}

.card-stats {
  display: flex;
  gap: 8px;
}

.stat-number {
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
  min-width: 20px;
  text-align: center;
}

.card-icon {
  margin: 8px 0 12px 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.icon-bg {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
  position: relative;
}

/* 不同服务的图标颜色 */
.middleware-icon {
  background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
}

.application-icon {
  background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
}

.remote-icon {
  background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
}

.database-icon {
  background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
}

.monitoring-icon {
  background: linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%);
}

.cicd-icon {
  background: linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%);
}

.storage-icon {
  background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
}

.network-icon {
  background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
}

.security-icon {
  background: linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%);
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 6px 0;
  line-height: 1.2;
}

.card-description {
  font-size: 12px;
  color: #6e7781;
  line-height: 1.4;
  margin: 0;
  flex: 1;
}

.card-stats-labels {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
}

.stat-label {
  font-size: 10px;
  color: #8c959f;
  font-weight: 500;
  min-width: 20px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .services-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .control-panel {
    padding: 24px;
  }
  
  .page-title {
    font-size: 28px;
  }
  
  .services-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .service-card {
    padding: 20px;
    min-height: 160px;
  }
  
  .card-title {
    font-size: 18px;
  }
  
  .card-description {
    font-size: 13px;
  }
  
  .icon-bg {
    width: 56px;
    height: 56px;
  }
  
  .stat-number {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .control-panel {
    padding: 16px;
  }
  
  .page-header {
    margin-bottom: 32px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .service-card {
    padding: 16px;
  }
}
</style>
