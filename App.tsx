// App.tsx (최종 수정 버전)

import './src/i18n';
import './src/utils/logger'; // Firebase warning 필터링
import React, {useState, useEffect} from 'react';
import {View, TouchableOpacity, Text, Platform} from 'react-native';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BootSplash from 'react-native-bootsplash';
import firebase from '@react-native-firebase/app';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';
import mobileAds from 'react-native-google-mobile-ads';

import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import DetailScreen from './src/screens/DetailScreen';
import CodiDetailScreen from './src/screens/CodiDetailScreen';
import MallListScreen from './src/screens/MallListScreen';
import MallBrowserScreen from './src/screens/MallBrowserScreen';
import MallScanResultScreen from './src/screens/MallScanResultScreen';
import CommunityPostDetailScreen from './src/screens/CommunityPostDetailScreen';
import CommunityCreatePostScreen from './src/screens/CommunityCreatePostScreen';
import CommunityTryOnScreen from './src/screens/CommunityTryOnScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BodySizeScreen from './src/screens/BodySizeScreen';
import MainTabNavigator from './src/navigators/MainTabNavigator';
import Toast, {
  BaseToast,
  ErrorToast,
  ToastProps,
} from 'react-native-toast-message';
import {ActionSheetProvider} from '@expo/react-native-action-sheet';
import ShareToClosetHandler from './src/components/ShareToClosetHandler';
import {navigationRef} from './src/navigation/navigationRef';
import type {RootStackParamList} from './src/navigation/types';
import {isValidBodySizeProfile} from './src/services/sizeRecommendService';
import type {ClothingSizeLabel} from './src/types/bodySize';
import {
  initializePushNotifications,
  scheduleDailyAttendanceReminder,
} from './src/services/notificationService';
import {startReferralRewardListener} from './src/services/ticketService';

export type {RootStackParamList} from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const toastConfig = {
  success: (props: ToastProps) => (
    <View style={{position: 'relative'}}>
      <BaseToast
        {...props}
        style={{borderLeftColor: '#6A0DAD'}}
        contentContainerStyle={{paddingHorizontal: 15, paddingRight: 40}}
        text1Style={{
          fontSize: 16,
          fontWeight: '600',
        }}
        text2Style={{
          fontSize: 14,
        }}
      />
      <TouchableOpacity
        onPress={() => Toast.hide()}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          marginTop: -10,
          width: 20,
          height: 20,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
        <Text style={{color: '#666', fontSize: 18, fontWeight: '600'}}>×</Text>
      </TouchableOpacity>
    </View>
  ),
  error: (props: ToastProps) => (
    <ErrorToast
      {...props}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
      }}
      text2Style={{
        fontSize: 14,
      }}
    />
  ),
};

function App(): React.JSX.Element | null {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [needsBodySize, setNeedsBodySize] = useState<boolean | null>(null);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(userState => {
      console.log(
        '🔥 Firebase 인증 상태 변경:',
        userState ? '로그인됨' : '로그아웃됨',
      );
      setUser(userState);
      if (!userState) {
        setNeedsBodySize(null);
      }
      if (initializing) {
        setInitializing(false);
      }
    });
    return subscriber;
  }, [initializing]);

  useEffect(() => {
    if (!user) {
      setNeedsBodySize(null);
      return;
    }

    const unsubscribeBodySize = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(
        snap => {
          const data = snap.data()?.bodySize;
          const profile = data
            ? {
                heightCm: Number(data.heightCm),
                weightKg: Number(data.weightKg),
                usualSize: data.usualSize as ClothingSizeLabel,
              }
            : null;
          setNeedsBodySize(!isValidBodySizeProfile(profile));
        },
        error => {
          console.error('bodySize profile listen failed', error);
          setNeedsBodySize(true);
        },
      );

    const unsubscribeReferral = startReferralRewardListener(user.uid);

    return () => {
      unsubscribeBodySize();
      unsubscribeReferral();
    };
  }, [user]);

  useEffect(() => {
    AsyncStorage.getItem('hasOnboarded').then(value => {
      const isFirst = value === null;
      console.log('📱 첫 실행 여부:', isFirst);
      setIsFirstLaunch(isFirst);
    });
  }, []);

  useEffect(() => {
    if (isFirstLaunch !== null && !initializing) {
      BootSplash.hide({fade: true});
    }
  }, [isFirstLaunch, initializing]);

  useEffect(() => {
    async function initAdsAndPermissions() {
      if (Platform.OS === 'ios') {
        try {
          const status = await check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
          if (status === RESULTS.DENIED || status === RESULTS.UNAVAILABLE) {
            const reqStatus = await request(
              PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY,
            );
            console.log('📱 [ATT Permission Result]:', reqStatus);
          } else {
            console.log('📱 [ATT Permission Status]:', status);
          }
        } catch (e) {
          console.warn('ATT request error:', e);
        }
      }
      mobileAds()
        .initialize()
        .then(adapterStatuses => {
          console.log('📱 Google Mobile Ads 초기화 완료:', adapterStatuses);
        })
        .catch(error => {
          console.error('❌ Google Mobile Ads 초기화 실패:', error);
        });
    }
    initAdsAndPermissions();

    // 푸시 알림 초기화 및 출석체크 알림 예약
    initializePushNotifications().then(token => {
      if (token) {
        console.log('🔔 [App FCM Token Ready]:', token);
      }
    });
    scheduleDailyAttendanceReminder();
  }, []);

  if (
    isFirstLaunch === null ||
    initializing ||
    (user && needsBodySize === null)
  ) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
        }}>
        <LottieView
          source={require('./src/assets/animations/Bubbles.json')}
          autoPlay
          loop
          style={{width: 300, height: 300}}
        />
      </View>
    );
  }

  console.log('🎯 현재 상태:', {
    isFirstLaunch,
    user: !!user,
    initializing,
    needsBodySize,
  });

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{flex: 1}}>
        <ActionSheetProvider>
          <>
            <NavigationContainer ref={navigationRef}>
              <Stack.Navigator
                key={
                  !user
                    ? 'auth'
                    : needsBodySize
                      ? 'body-size-gate'
                      : 'main'
                }
                screenOptions={{headerShown: false}}>
                {user ? (
                  needsBodySize ? (
                    <Stack.Screen name="BodySize" component={BodySizeScreen} />
                  ) : (
                    <>
                      <Stack.Screen name="Main" component={MainTabNavigator} />
                      <Stack.Screen name="Profile" component={ProfileScreen} />
                      <Stack.Screen name="BodySize" component={BodySizeScreen} />
                      <Stack.Screen name="Detail" component={DetailScreen} />
                      <Stack.Screen
                        name="CodiDetail"
                        component={CodiDetailScreen}
                      />
                      <Stack.Screen name="MallList" component={MallListScreen} />
                      <Stack.Screen
                        name="MallBrowser"
                        component={MallBrowserScreen}
                      />
                      <Stack.Screen
                        name="MallScanResult"
                        component={MallScanResultScreen}
                      />
                      <Stack.Screen
                        name="CommunityPostDetail"
                        component={CommunityPostDetailScreen}
                      />
                      <Stack.Screen
                        name="CommunityCreatePost"
                        component={CommunityCreatePostScreen}
                      />
                      <Stack.Screen
                        name="CommunityTryOn"
                        component={CommunityTryOnScreen}
                      />
                    </>
                  )
                ) : isFirstLaunch ? (
                  <>
                    <Stack.Screen
                      name="Onboarding"
                      component={OnboardingScreen}
                    />
                    <Stack.Screen name="Login" component={LoginScreen} />
                  </>
                ) : (
                  <Stack.Screen name="Login" component={LoginScreen} />
                )}
              </Stack.Navigator>
            </NavigationContainer>

            {!initializing && (
              <ShareToClosetHandler isLoggedIn={!!user} />
            )}

            <Toast config={toastConfig} />
          </>
        </ActionSheetProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default App;
