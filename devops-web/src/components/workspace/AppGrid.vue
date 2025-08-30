<template>
  <div class="app-grid">
    <div class="grid-container">
      <div
        v-for="module in enabledModules"
        :key="module.id"
        class="app-card"
        @click="handleModuleClick(module)"
      >
        <div class="card-content">
          <div class="app-icon">{{ module.icon }}</div>
          <div class="app-name">{{ module.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Module {
  id: string
  name: string
  description: string
  icon: string
  route: string
  enabled: boolean
}

const props = defineProps<{
  modules: Module[]
}>()

const emit = defineEmits<{
  moduleClick: [module: Module]
}>()

// 只显示已启用的模块
const enabledModules = computed(() =>
  props.modules.filter(module => module.enabled)
)

const handleModuleClick = (module: Module) => {
  emit('moduleClick', module)
}
</script>

<style scoped>
.app-grid {
  background: transparent;
  padding: 0;
  max-width: 800px;
  margin: 0 auto;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 40px 32px;
  justify-items: center;
}

.app-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  width: 120px;
}

.app-card:hover {
  transform: translateY(-2px);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
}

.app-icon {
  width: 80px;
  height: 80px;
  background: #ffffff;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
  transition: all 0.2s ease;
}

.app-card:hover .app-icon {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.app-name {
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  margin-bottom: 0;
  color: #262626;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

@media (max-width: 768px) {
  .app-grid {
    max-width: 600px;
  }

  .grid-container {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px 20px;
  }

  .app-card {
    width: 100px;
  }

  .app-icon {
    width: 64px;
    height: 64px;
    font-size: 32px;
    border-radius: 14px;
  }

  .app-name {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .app-grid {
    max-width: 400px;
  }

  .grid-container {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px 16px;
  }

  .app-card {
    width: 80px;
  }

  .app-icon {
    width: 56px;
    height: 56px;
    font-size: 28px;
    border-radius: 12px;
  }

  .app-name {
    font-size: 12px;
  }
}
</style>
