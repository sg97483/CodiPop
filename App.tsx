// App.tsx (최종 수정 버전)

import './src/i18n';
import './src/utils/logger'; // Firebase warning 필터링
import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BootSplash from 'react-native-bootsplash';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';

import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import DetailScreen from './src/screens/DetailScreen';
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
  }, [initializing]); // ✅ [수정] 의존성 배열에 initializing 추가하여 경고 해결

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

  // 로딩이 모두 끝날 때까지 스플래시 화면 유지
  if (isFirstLaunch === null || initializing) {
    return null;
  }

  // 디버깅을 위한 로그
  console.log('🎯 현재 상태:', {isFirstLaunch, user: !!user, initializing});

  return (
    <ActionSheetProvider>
      <>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{headerShown: false}}>
            {user ? (
              <>
                <Stack.Screen name="Main" component={MainTabNavigator} />
                <Stack.Screen name="Detail" component={DetailScreen} />
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
  );
}

export default App;
