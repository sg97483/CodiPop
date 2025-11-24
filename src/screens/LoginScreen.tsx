// src/screens/LoginScreen.tsx

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import auth from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {appleAuth} from '@invertase/react-native-apple-authentication';

// ✅ [변경] 밝은 테마에 맞는 색상 변수 (필요시 사용)
const BRAND_PRIMARY = '#6A0DAD'; // 피그마의 보라색
const BRAND_TEXT = '#222222';
const BRAND_TEXT_MUTED = '#666666';
const BORDER_COLOR = '#E0E0E0';

const LoginScreen = () => {
  const {t} = useTranslation();
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '19675128705-m94gah4hdkv2vqfmbvuk8s17rb413jcj.apps.googleusercontent.com',
    });
  }, []);

  const onGoogleButtonPress = async () => {
    if (loading) {
      return;
    }
    setLoading(true);

    try {
      // hasPlayServices는 Android 전용이므로 iOS에서는 체크하지 않음
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      }
      const {idToken} = await GoogleSignin.signIn();
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);
    } catch (error: any) {
      console.log('Google 로그인 에러', error);
      Alert.alert('로그인 실패', error.message);
      setLoading(false);
    }
  };

  const onAppleButtonPress = async () => {
    if (loading) {
      return;
    }
    setLoading(true);

    try {
      // Apple 로그인 시작
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // Apple 로그인 취소 확인
      if (!appleAuthRequestResponse.identityToken) {
        throw new Error('Apple Sign In was cancelled');
      }

      // Apple 인증서 생성
      const {identityToken, nonce} = appleAuthRequestResponse;
      const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);

      // Firebase에 로그인
      await auth().signInWithCredential(appleCredential);
    } catch (error: any) {
      console.log('Apple 로그인 에러', error);
      if (error.code !== appleAuth.Error.CANCELED) {
        Alert.alert('로그인 실패', error.message || 'Apple 로그인에 실패했습니다.');
      }
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ✅ [변경] 밝은 배경에 맞게 상태바 스타일 변경 */}
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        <Image
          source={require('../assets/images/codipop_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>{t('appName')}</Text>
        <Text style={styles.subtitle}>{t('welcomeSubtitle')}</Text>
      </View>

      <View style={[styles.footer, {paddingBottom: insets.bottom + 16}]}>
        {loading ? (
          <ActivityIndicator size="large" color={BRAND_PRIMARY} />
        ) : (
          <>
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.8}
              onPress={onGoogleButtonPress}>
              <View style={styles.buttonInner}>
                {/* ✅ [변경] 아이콘 경로를 로컬 에셋으로 변경 */}
                <Image
                  source={require('../assets/icons/googleicon.png')}
                  style={styles.icon}
                />
                <Text style={styles.buttonText}>{t('googleLogin')}</Text>
              </View>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.button}
                activeOpacity={0.8}
                onPress={onAppleButtonPress}>
                <View style={styles.buttonInner}>
                  {/* ✅ [변경] 아이콘 경로를 로컬 에셋으로 변경 */}
                  <Image
                    source={require('../assets/icons/appleicon.png')}
                    style={styles.icon}
                  />
                  <Text style={styles.buttonText}>{t('appleLogin')}</Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ✅ [변경] 전체적인 스타일을 피그마 디자인에 맞게 수정
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // 흰색 배경
  },
  content: {
    flex: 1, // 버튼을 제외한 영역을 모두 차지
    justifyContent: 'center', // 세로 중앙 정렬
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 24,
  },
  title: {
    color: BRAND_TEXT,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: BRAND_TEXT_MUTED,
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    gap: 12,
  },
  button: {
    height: 52,
    borderRadius: 26, // 더 둥글게
    justifyContent: 'center',
    backgroundColor: '#FFFFFF', // 흰색 배경
    borderWidth: 1, // 테두리 추가
    borderColor: BORDER_COLOR, // 테두리 색상
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: BRAND_TEXT,
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    width: 22,
    height: 22,
  },
});

export default LoginScreen;
