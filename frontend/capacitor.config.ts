import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.aquascope.app',
  appName: 'AquaScope',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#f0f9ff',
      showSpinner: true,
      spinnerColor: '#0284c7',
    },
    Keyboard: {
      resize: 'body',
      style: 'LIGHT',
    },
  },
}

export default config
