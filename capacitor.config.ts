import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sheilasantosnails.agenda',
  appName: 'Sheila Santos Nails Designer',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#C71585'
    }
  }
};

export default config;
