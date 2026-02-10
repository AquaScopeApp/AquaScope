/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_GIT_COMMIT?: string
  readonly VITE_BUILD_DATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
