<template>
  <n-config-provider :theme="theme" :locale="zhCN" :date-locale="dateZhCN">
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
</script>

<style>
#app {
  height: 100vh;
  width: 100vw;
}
</style>
