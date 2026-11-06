/// <reference types="@capacitor-firebase/messaging" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wgo.app',
  appName: 'WGO',
  webDir: 'dist',
  plugins: {
    // 앱을 보고 있을 때 온 푸시도 iOS 배너 · 소리 · 배지로 보여 준다
    FirebaseMessaging: {
      presentationOptions: ['alert', 'badge', 'sound'],
    },
  },
  experimental: {
    ios: {
      spm: {
        // Firebase 패키지 이름 충돌 방지 (@capacitor-firebase/messaging 안내)
        packageOptions: {
          '@capacitor-firebase/messaging': { symlink: true },
        },
      },
    },
  },
};

export default config;
