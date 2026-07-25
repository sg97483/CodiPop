// src/services/notificationService.ts
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  TriggerType,
  RepeatFrequency,
  TimestampTrigger,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';
import Toast from 'react-native-toast-message';

const FCM_TOKEN_KEY = '@codipop_fcm_token';
const CHANNEL_ID = 'codipop_vip_channel_v1';

/**
 * 1. 알림 채널 생성 (Android 필수)
 */
export async function createNotificationChannel(): Promise<string> {
  if (Platform.OS === 'android') {
    const channelId = await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'CodiPop VIP 중요 알림 (팝업)',
      description: '출석체크 보상, 친구 초대 보너스, 피팅 완료 등의 고중요도 팝업 알림입니다.',
      importance: AndroidImportance.HIGH,
      vibration: true,
      vibrationPattern: [300, 500],
      sound: 'default',
    });
    return channelId;
  }
  return CHANNEL_ID;
}

/**
 * 2. 푸시 알림 권한 요청 및 FCM 토큰 발급 초기화
 */
export async function initializePushNotifications(): Promise<string | null> {
  try {
    // 1) 명시적 권한 요청 (Android 13+ 시스템 팝업 및 iOS)
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const androidResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      console.log('🔔 [Android 13+ POST_NOTIFICATIONS Status]:', androidResult);
    }

    const notifeeSettings = await notifee.requestPermission();
    console.log('🔔 [Notifee Permission Status]:', notifeeSettings.authorizationStatus);

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL ||
      notifeeSettings.authorizationStatus >= 1;

    console.log('🔔 [Push Permission Summary]:', enabled ? '권한 허용됨' : '권한 거부됨/대기중');

    await createNotificationChannel();

    if (!enabled) {
      console.warn('⚠️ 알림 권한이 허용되지 않았습니다.');
      return null;
    }

    // 2) FCM 기기 토큰 발급 (iOS는 APNs 토큰 등록까지 대기 필요)
    if (Platform.OS === 'ios') {
      let apnsToken = await messaging().getAPNSToken();
      let retries = 0;
      while (!apnsToken && retries < 10) {
        console.log(`⏳ [iOS APNs Token 대기 중... ${retries + 1}/10] Apple 서버로부터 APNs 토큰 수신 중`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        apnsToken = await messaging().getAPNSToken();
        retries++;
      }
      if (apnsToken) {
        console.log('🍎 [APNs Device Token 수신 완료]:', apnsToken);
      } else {
        console.warn('⚠️ [APNs Token] APNs 토큰 수신 지연. (Wi-Fi/네트워크 또는 실기기 여부 확인 필요)');
      }
    }

    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      console.log('🔥 [FCM Device Token]:', fcmToken);
      await AsyncStorage.setItem(FCM_TOKEN_KEY, fcmToken);
    } else {
      console.warn('⚠️ FCM 토큰을 가져올 수 없습니다.');
    }

    // 3) 토큰 갱신 리스너 등록
    messaging().onTokenRefresh(async newToken => {
      console.log('🔄 [FCM Token Refreshed]:', newToken);
      await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
    });

    // 4) 포그라운드 수신 리스너 등록 (앱 화면을 보고 있을 때 알림 수신)
    messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('💌 [Foreground FCM Message Received]:', remoteMessage);

      const rawTitle = remoteMessage.notification?.title ?? remoteMessage.data?.title;
      const rawBody = remoteMessage.notification?.body ?? remoteMessage.data?.body ?? remoteMessage.data?.message;

      if (!rawTitle && !rawBody) {
        return;
      }

      const title: string = typeof rawTitle === 'string' ? rawTitle : String(rawTitle);
      const body: string = typeof rawBody === 'string' ? rawBody : String(rawBody);

      // 앱 내부 상단에 화려한 토스트 메시지 표시
      if (title || body) {
        Toast.show({
          type: 'success',
          text1: `💌 ${title}`,
          text2: body,
          visibilityTime: 4000,
        });

        // 동시에 휴대폰 상단 알림창(Drawer)에도 로컬 푸시 표시
        await notifee.displayNotification({
          title: `✨ ${title}`,
          body: body,
          android: {
            channelId: CHANNEL_ID,
            importance: AndroidImportance.HIGH,
            pressAction: {
              id: 'default',
            },
          },
        });
      }
    });

    // 5) 백그라운드/종료 상태에서 알림 터치로 앱 진입 시 처리
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('🚀 [FCM Notification Opened App]:', remoteMessage);
    });

    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification) {
      console.log('🚀 [FCM Initial Notification (Quit State)]: ', initialNotification);
    }

    return fcmToken;
  } catch (error) {
    console.error('❌ [initializePushNotifications Error]:', error);
    return null;
  }
}

/**
 * 3. 즉시 로컬 푸시 알림 발송 함수 (예: 친구 초대 성공 +20장 지급 안내 등)
 */
export async function sendLocalNotification(title: string, body: string, data?: Record<string, string>) {
  try {
    await createNotificationChannel();
    await notifee.displayNotification({
      title: `🎁 ${title}`,
      body: body,
      data: data,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
      },
    });
  } catch (error) {
    console.error('❌ [sendLocalNotification Error]:', error);
  }
}

/**
 * 4. 일일 출석체크 리마인더 로컬 푸시 예약 (매일 저녁 7시)
 * - 앱 접속 및 출석체크 완료 시 다음 날 저녁 7시로 알림을 재예약합니다.
 */
export async function scheduleDailyAttendanceReminder() {
  try {
    await createNotificationChannel();

    // 기존 출석체크 알림 취소 (중복 예약 방지)
    await notifee.cancelNotification('daily_attendance_reminder');

    // 다음 날 저녁 7시(19:00) 타임스탬프 계산
    const now = new Date();
    const nextDay = new Date(now);
    nextDay.setDate(now.getDate() + 1);
    nextDay.setHours(19, 0, 0, 0);

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: nextDay.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
    };

    await notifee.createTriggerNotification(
      {
        id: 'daily_attendance_reminder',
        title: '🎁 [CodiPop AI] 오늘의 무료 피팅 보너스가 기다리고 있어요!',
        body: '출석체크하고 무료 티켓(+3장) 받아가세요! 오늘 뭐 입을지 AI 가상피팅으로 3초 만에 확인해 보세요 ✨',
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
        },
      },
      trigger,
    );

    console.log('⏰ [출석체크 리마인더 푸시 예약 완료]:', nextDay.toLocaleString());
  } catch (error) {
    console.error('❌ [scheduleDailyAttendanceReminder Error]:', error);
  }
}
