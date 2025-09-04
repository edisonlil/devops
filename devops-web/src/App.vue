<template>
  <n-config-provider
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-global-style />
    <n-loading-bar-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-message-provider>
            <router-view />
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  NConfigProvider, 
  NGlobalStyle, 
  NLoadingBarProvider, 
  NDialogProvider, 
  NNotificationProvider, 
  NMessageProvider,
  zhCN, 
  dateZhCN,
  darkTheme
} from 'naive-ui'
import { useThemeStore } from './stores/theme'

const themeStore = useThemeStore()

const theme = computed(() => {
  return themeStore.isDark ? darkTheme : null
})

// 主题覆盖配置 - 确保按钮无边框
const themeOverrides = {
  Button: {
    border: 'none',
    borderHover: 'none',
    borderPressed: 'none',
    borderFocus: 'none',
    borderDisabled: 'none',
    colorPrimary: '#007AFF',
    colorHoverPrimary: '#0056CC',
    colorPressedPrimary: '#0056CC',
    colorFocusPrimary: '#007AFF',
    borderPrimary: 'none',
    borderHoverPrimary: 'none',
    borderPressedPrimary: 'none',
    borderFocusPrimary: 'none',
    borderDisabledPrimary: 'none'
  }
}
</script>

<style>
#app {
  height: 100vh;
  width: 100vw;
}
</style>
