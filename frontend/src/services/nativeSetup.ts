/**
 * Native Platform Setup
 *
 * Configures Capacitor plugins for native iOS/Android:
 * - Status bar styling
 * - Splash screen handling
 * - Keyboard configuration
 */

import { Capacitor } from '@capacitor/core'

export async function initializeNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  // Status bar — ocean theme
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Light })
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0284c7' })
    }
  } catch {
    // Status bar plugin not available
  }

  // Hide splash screen after initialization
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    // Splash screen plugin not available
  }
}
