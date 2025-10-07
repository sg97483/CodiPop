// src/utils/logger.ts
// 개발 환경에서만 로그를 출력하고, 프로덕션에서는 필터링

const isDevelopment = __DEV__;

export const logger = {
  log: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.warn(message, ...args);
    }
  },
  
  error: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.error(message, ...args);
    }
  },
  
  // Firebase deprecation warning 필터링
  filterFirebaseWarnings: () => {
    if (isDevelopment) {
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        const message = args[0];
        if (typeof message === 'string' && 
            (message.includes('deprecated') || 
             message.includes('Firebase') ||
             message.includes('getApp()'))) {
          return; // Firebase deprecation warning 무시
        }
        originalWarn.apply(console, args);
      };
    }
  }
};

// 앱 시작 시 Firebase warning 필터링 활성화
logger.filterFirebaseWarnings();
