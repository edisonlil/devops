<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-section">
            <ProfessionalLogo />
          </div>
          <h1 class="login-title">远程主机登录</h1>
          <p class="login-subtitle">连接到您的 DevOps 服务器</p>
        </div>

        <div class="login-form">
          <n-form
            ref="formRef"
            :model="formData"
            :rules="rules"
            size="large"
            @submit.prevent="handleLogin"
          >
            <n-form-item path="host" label="主机地址">
              <n-input
                v-model:value="formData.host"
                placeholder="192.168.1.100"
                :disabled="loading"
              >
                <template #prefix>
                  <n-icon :component="Server" />
                </template>
              </n-input>
            </n-form-item>

            <n-form-item path="username" label="用户名">
              <n-input
                v-model:value="formData.username"
                placeholder="root"
                :disabled="loading"
              >
                <template #prefix>
                  <n-icon :component="Person" />
                </template>
              </n-input>
            </n-form-item>

            <n-form-item path="password" label="密码">
              <n-input
                v-model:value="formData.password"
                type="password"
                placeholder="请输入密码"
                :disabled="loading"
                @keyup.enter="handleLogin"
              >
                <template #prefix>
                  <n-icon :component="LockClosed" />
                </template>
              </n-input>
            </n-form-item>

            <n-form-item>
              <n-button
                type="primary"
                block
                size="large"
                :loading="loading"
                @click="handleLogin"
              >
                {{ loading ? '连接中...' : '登录' }}
              </n-button>
            </n-form-item>
          </n-form>
        </div>

        <div v-if="errorMessage" class="error-section">
          <n-alert type="error" :show-icon="false" class="error-alert">
            {{ errorMessage }}
          </n-alert>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { Server, Person, LockClosed } from '@vicons/ionicons5'
import ProfessionalLogo from '@/components/common/ProfessionalLogo.vue'
import { sshLogin } from '@/api/auth'

const router = useRouter()
const message = useMessage()
const formRef = ref()
const loading = ref(false)
const errorMessage = ref('')

const formData = reactive({
  host: '',
  username: '',
  password: ''
})

const rules = {
  host: [
    { required: true, message: '请输入主机地址', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  try {
    await formRef.value?.validate()
    
    loading.value = true
    errorMessage.value = ''

    const response = await sshLogin({
      host: formData.host,
      username: formData.username,
      password: formData.password
    })

    // 登录成功
    message.success('SSH连接成功')
    
    // 存储会话信息到localStorage（临时方案，实际应该使用更安全的方式）
    localStorage.setItem('ssh_session', JSON.stringify({
      host: formData.host,
      username: formData.username,
      connected: true,
      timestamp: Date.now(),
      defaultWorkspace: response.data.defaultWorkspace
    }))

    // 跳转到工作空间
    if (response.data.defaultWorkspace) {
      router.replace(`/workspace/${response.data.defaultWorkspace}`)
    } else {
      // 如果没有默认工作空间，跳转到工作空间选择页面
      router.replace('/workspace-select')
    }

  } catch (error: any) {
    console.error('SSH登录失败:', error)
    
    if (error.response?.data?.message) {
      errorMessage.value = error.response.data.message
    } else {
      errorMessage.value = 'SSH连接失败，请检查主机地址、用户名和密码是否正确'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif;
}

.login-container {
  width: 100%;
  max-width: 400px;
}

.login-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  padding: 40px;
  border: 1px solid #e8e8e8;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-section {
  margin-bottom: 24px;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.login-subtitle {
  font-size: 15px;
  color: #86868b;
  margin: 0;
  line-height: 1.4;
}

.login-form {
  margin-bottom: 20px;
}

.login-form :deep(.n-form-item-label) {
  font-weight: 500;
  color: #262626;
}

.login-form :deep(.n-input) {
  border-radius: 8px;
}

.login-form :deep(.n-button) {
  border-radius: 8px;
  font-weight: 500;
  height: 44px;
  margin-top: 8px;
}

.error-section {
  margin-top: 16px;
}

.error-alert {
  border-radius: 8px;
  border: 1px solid #ff4757;
  background: #fff5f5;
}

.error-alert :deep(.n-alert__content) {
  color: #d63031;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-card {
    padding: 24px;
  }

  .login-title {
    font-size: 20px;
  }

  .login-subtitle {
    font-size: 14px;
  }
}
</style>