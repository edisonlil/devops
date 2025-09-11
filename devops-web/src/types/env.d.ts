/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_USE_HTTPS: string
  readonly VITE_COOKIE_DOMAIN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
