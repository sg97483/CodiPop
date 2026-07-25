/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, {AndroidImportance} from '@notifee/react-native';
import App from './App';
import {name as appName} from './app.json';

// Notifee 백그라운드 이벤트 핸들러 필수 등록 (이게 없으면 백그라운드에서 displayNotification이 차단됨)
notifee.onBackgroundEvent(async ({type, detail}) => {
  console.log('🔔 [Notifee Background Event]:', type, detail.notification?.title);
});

// FCM 백그라운드 및 종료 상태 메시지 핸들러 등록
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📥 [FCM Background Message Received]:', remoteMessage);

  // 만약 Firebase Console이나 서버에서 notification 페이로드({notification: {title, body}})를 함께 보낸 경우,
  // 안드로이드 네이티브 FCM SDK가 이미 시스템 알림을 자동으로 1개 표시하므로 Notifee 중복 발송을 방지합니다.
  if (remoteMessage.notification) {
    console.log('🔔 [Background] 네이티브 FCM SDK 자동 알림 처리됨 (중복 Notifee 팝업 생략)');
    return;
  }

  // data-only 메시지({data: {title, body}})에서 실제 텍스트 내용이 있는 경우에만 Notifee로 직접 헤드업 알림 생성
  const rawTitle = remoteMessage.data?.title;
  const rawBody = remoteMessage.data?.body ?? remoteMessage.data?.message;

  // 실제 텍스트 내용이 없는 빈 데이터 페이로드(또는 FCM 네이티브 알림과 동반된 핑)인 경우 중복/유령 발송 방지
  if (!rawTitle && !rawBody) {
    console.log('🔔 [Background] 표시할 데이터 텍스트가 없어 Notifee 팝업 생략');
    return;
  }

  const title = typeof rawTitle === 'string' ? rawTitle : String(rawTitle);
  const body = typeof rawBody === 'string' ? rawBody : String(rawBody);

  if (title || body) {
    const channelId = await notifee.createChannel({
      id: 'codipop_vip_channel_v1',
      name: 'CodiPop VIP 중요 알림 (팝업)',
      importance: AndroidImportance.HIGH,
      vibration: true,
      vibrationPattern: [300, 500],
      sound: 'default',
    });

    await notifee.displayNotification({
      title: `✨ ${title}`,
      body: body,
      data: remoteMessage.data || {},
      android: {
        channelId: channelId,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
      },
    });
  }
});

AppRegistry.registerComponent(appName, () => App);
