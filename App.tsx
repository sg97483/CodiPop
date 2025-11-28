// App.tsx (최종 수정 버전)

import './src/i18n';
import './src/utils/logger'; // Firebase warning 필터링
import React, {useState, useEffect} from 'react';
import {View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BootSplash from 'react-native-bootsplash';
import firebase from '@react-native-firebase/app';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';
import mobileAds from 'react-native-google-mobile-ads';

import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import DetailScreen from './src/screens/DetailScreen';
import CodiDetailScreen from './src/screens/CodiDetailScreen';
import MainTabNavigator from './src/navigators/MainTabNavigator'; // ✅ 새로 만든 내비게이터 import
import Toast, {
  BaseToast,
  ErrorToast,
  ToastProps,
} from 'react-native-toast-message';
import {ActionSheetProvider} from '@expo/react-native-action-sheet';

// RootStackParamList 정의
export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Main: undefined; // ✅ MainTabNavigator를 위한 타입
  Detail: {imageUrl: string};
  CodiDetail: {
    codiId: string;
    imageUrl: string;
    createdAt: any;
    isLiked?: boolean;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ✅ 2. 새로운 Toast 디자인을 정의하는 설정 객체를 만듭니다.
const toastConfig = {
  /*
  성공 메시지 (success)의 디자인을 재정의합니다.
  BaseToast 컴포넌트를 기반으로 스타일만 수정합니다.
*/
  success: (
    props: ToastProps, // ✅ props에 ToastProps 타입 적용
  ) => (
    <BaseToast
      {...props}
      style={{borderLeftColor: '#6A0DAD'}} // 왼쪽 보라색 선
      contentContainerStyle={{paddingHorizontal: 15}}
      text1Style={{
        fontSize: 16, // 메인 텍스트 크기
        fontWeight: '600',
      }}
      text2Style={{
        fontSize: 14, // 서브 텍스트 크기
      }}
    />
  ),
  /*
  에러 메시지 (error)의 디자인을 재정의합니다.
  ErrorToast 컴포넌트를 기반으로 스타일만 수정합니다.
*/
  error: (
    props: ToastProps, // ✅ props에 ToastProps 타입 적용
  ) => (
    <ErrorToast
      {...props}
      text1Style={{
        fontSize: 16, // 메인 텍스트 크기
        fontWeight: '600',
      }}
      text2Style={{
        fontSize: 14, // 서브 텍스트 크기
      }}
    />
  ),
};

function App(): React.JSX.Element | null {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initializing, setInitializing] = useState(true);

  // ✅ 1. 로그인 상태 감시 전용 useEffect
  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(userState => {
      console.log(
        '🔥 Firebase 인증 상태 변경:',
        userState ? '로그인됨' : '로그아웃됨',
      );
      setUser(userState);
      if (initializing) {
        setInitializing(false);
      }
    });
    return subscriber; // cleanup on unmount
  }, [initializing]); // 컴포넌트 마운트 시 Firebase Auth 상태 구독

  // ✅ 2. 첫 실행 여부 확인 전용 useEffect
  useEffect(() => {
    AsyncStorage.getItem('hasOnboarded').then(value => {
      const isFirst = value === null;
      console.log('📱 첫 실행 여부:', isFirst);
      setIsFirstLaunch(isFirst);
    });
  }, []); // 이 로직도 앱 마운트 시 딱 한 번만 실행되면 충분합니다.

  // ✅ 3. 스플래시 화면 숨기기 전용 useEffect
  useEffect(() => {
    if (isFirstLaunch !== null && !initializing) {
      BootSplash.hide({fade: true});
    }
  }, [isFirstLaunch, initializing]);

  // ✅ 4. Google Mobile Ads 초기화
  useEffect(() => {
    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log('📱 Google Mobile Ads 초기화 완료:', adapterStatuses);
      });
  }, []);

  // 로딩이 모두 끝날 때까지 Lottie 애니메이션 표시
  if (isFirstLaunch === null || initializing) {
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

  // 디버깅을 위한 로그
  console.log('🎯 현재 상태:', {isFirstLaunch, user: !!user, initializing});

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{flex: 1}}>
        <ActionSheetProvider>
          <>
            <NavigationContainer>
            <Stack.Navigator screenOptions={{headerShown: false}}>
              {user ? (
                <>
                  <Stack.Screen name="Main" component={MainTabNavigator} />
                  <Stack.Screen name="Detail" component={DetailScreen} />
                  <Stack.Screen name="CodiDetail" component={CodiDetailScreen} />
                </>
              ) : isFirstLaunch ? (
                <>
                  <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                  <Stack.Screen name="Login" component={LoginScreen} />
                </>
              ) : (
                <Stack.Screen name="Login" component={LoginScreen} />
              )}
            </Stack.Navigator>
          </NavigationContainer>

          {/* ✅ Toast 컴포넌트는 NavigationContainer와 나란히 둡니다. */}
          <Toast config={toastConfig} />
        </>
        </ActionSheetProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default App;
