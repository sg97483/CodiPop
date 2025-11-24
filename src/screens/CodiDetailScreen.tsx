// src/screens/CodiDetailScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  InteractionManager,
  Share,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import Toast from 'react-native-toast-message';
import { Platform, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, openSettings, Permission } from 'react-native-permissions';
import { captureRef } from 'react-native-view-shot';
import { useTranslation } from 'react-i18next';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type CodiDetailScreenRouteProp = RouteProp<{
  CodiDetail: {
    codiId: string;
    imageUrl: string;
    createdAt: any;
    isLiked?: boolean;
  };
}, 'CodiDetail'>;

type CodiDetailScreenNavigationProp = NativeStackNavigationProp<any>;

const CodiDetailScreen = () => {
  const navigation = useNavigation<CodiDetailScreenNavigationProp>();
  const { t } = useTranslation();
  const route = useRoute<CodiDetailScreenRouteProp>();
  const user = auth().currentUser;
  const insets = useSafeAreaInsets();

  const { codiId, imageUrl, createdAt, isLiked } = route.params;
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [currentIsLiked, setCurrentIsLiked] = useState(isLiked || false);
  const [isCapturing, setIsCapturing] = useState(false);
  const imageRef = useRef<View>(null);

  // 날짜 정보 계산
  const getDateInfo = () => {
    const date = createdAt?.toDate() || new Date();
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      fullDate: date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };
  };

  const dateInfo = getDateInfo();

  // 하트 버튼 토글 함수
  const toggleLike = async () => {
    if (!user) return;

    try {
      setCurrentIsLiked(!currentIsLiked);
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('recentResults')
        .doc(codiId)
        .update({
          isLiked: !currentIsLiked,
        });

      Toast.show({
        type: 'success',
        text1: currentIsLiked ? t('likeRemoved') : t('likeAdded'),
      });
    } catch (error) {
      console.error('좋아요 상태 업데이트 실패:', error);
      setCurrentIsLiked(currentIsLiked); // 실패 시 원래 상태로 복원
      Alert.alert(t('error'), t('likeUpdateError'));
    }
  };

  // 권한 체크 및 요청 함수
  const checkAndRequestPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'ios') {
        // iOS: 명시적으로 권한 요청
        const permission = PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY;
        const checkResult = await check(permission);

        if (checkResult === RESULTS.GRANTED || checkResult === RESULTS.LIMITED) {
          return true;
        }

        const requestResult = await request(permission);

        if (requestResult === RESULTS.GRANTED || requestResult === RESULTS.LIMITED) {
          return true;
        }

        if (requestResult === RESULTS.BLOCKED || checkResult === RESULTS.BLOCKED) {
          Alert.alert(
            t('permissionRequired'),
            t('photoPermissionMessage'),
            [
              {
                text: t('openSettings'),
                onPress: () => openSettings(),
              },
              { text: t('cancel'), style: 'cancel' },
            ],
          );
        }
        return false;
      } else {
        // Android: Android 13 이상에서는 CameraRoll.save가 자체적으로 권한을 처리
        // 직접 저장을 시도하고 에러가 발생하면 처리
        return true;
      }
    } catch (error) {
      console.error('권한 확인 실패:', error);
      // Android에서는 에러 발생 시에도 CameraRoll.save가 자체적으로 처리
      return Platform.OS === 'android';
    }
  };

  // 이미지 다운로드 함수
  const handleDownload = async () => {
    console.log('📥 [다운로드 시작] handleDownload 호출됨');

    if (!imageUrl) {
      console.error('❌ [다운로드 실패] imageUrl이 없습니다');
      return;
    }

    console.log('📥 [다운로드] imageUrl:', imageUrl);

    // iOS는 권한 체크, Android는 바로 시도 (CameraRoll.save가 자체 처리)
    if (Platform.OS === 'ios') {
      console.log('📥 [다운로드] iOS 권한 체크 시작');
      try {
        const hasPermission = await checkAndRequestPermission();
        console.log('📥 [다운로드] 권한 체크 결과:', hasPermission);
        if (!hasPermission) {
          console.log('❌ [다운로드] 권한이 없어서 종료');
          return;
        }
        console.log('✅ [다운로드] 권한 확인 완료');
      } catch (error: any) {
        console.error('❌ [다운로드] 권한 확인 중 오류:', error);
        console.error('❌ [다운로드] 권한 확인 오류 상세:', {
          message: error?.message,
          code: error?.code,
          stack: error?.stack,
        });
        Alert.alert(t('error'), t('likeUpdateError'));
        return;
      }
    } else {
      console.log('📥 [다운로드] Android - 권한 체크 건너뜀');
    }

    console.log('📥 [다운로드] 로딩 상태 설정 시작');
    setLoading(true);
    setIsCapturing(false); // 초기화
    let localFile: string | null = null;

    try {
      console.log('📥 [다운로드] imageRef.current 확인:', !!imageRef.current);

      // iOS에서는 captureRef가 크래시를 일으키므로 원본 이미지 다운로드만 사용
      // Android에서는 워터마크가 포함된 이미지 캡처 시도
      const useCapture = Platform.OS === 'android' && imageRef.current;

      if (useCapture) {
        console.log('📥 [다운로드] 이미지 캡처 시도 (Android)');
        try {
          // 워터마크를 임시로 표시하고 캡처
          setIsCapturing(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          if (!imageRef.current) {
            throw new Error('이미지 참조가 유효하지 않습니다.');
          }

          const uri = await captureRef(imageRef.current, {
            format: 'jpg',
            quality: 0.9,
          });

          setIsCapturing(false);

          await CameraRoll.save(uri, { type: 'photo' });
          Toast.show({ type: 'success', text1: t('imageSavedToGallery') });
          setLoading(false);
          return; // 성공 시 함수 종료
        } catch (captureError: any) {
          console.error('❌ [다운로드] 이미지 캡처 실패:', captureError);
          console.error('❌ [다운로드] 캡처 오류 상세:', {
            message: captureError?.message,
            code: captureError?.code,
            stack: captureError?.stack,
            name: captureError?.name,
          });
          setIsCapturing(false);
          // 캡처 실패 시 원본 이미지 다운로드로 fallback
        }
      } else {
        if (Platform.OS === 'ios') {
          console.log('📥 [다운로드] iOS - 원본 이미지 다운로드로 진행 (captureRef 크래시 방지)');
        } else {
          console.log('📥 [다운로드] imageRef.current가 null, 원본 이미지 다운로드로 진행');
        }
      }

      // 캡처 실패 시 또는 imageRef가 없을 때 원본 이미지 다운로드
      localFile = `${RNFS.CachesDirectoryPath}/${Date.now()}_codi.jpeg`;
      await RNFS.downloadFile({ fromUrl: imageUrl, toFile: localFile }).promise;

      // iOS에서는 react-native-share를 사용하여 공유 시트 표시 (크래시 방지)
      // Android는 기존대로 CameraRoll.save 사용
      if (Platform.OS === 'ios') {
        await Share.share({
          url: `file://${localFile}`,
        });
        Toast.show({ type: 'success', text1: t('imageShared') });
      } else {
        // Android는 기존대로 CameraRoll.save 사용
        await CameraRoll.save(`file://${localFile}`, { type: 'photo' });
        Toast.show({ type: 'success', text1: t('imageSavedToGallery') });
      }
    } catch (error: any) {
      console.error('❌ [다운로드] 전체 프로세스 실패:', error);
      console.error('❌ [다운로드] 오류 상세 정보:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        name: error?.name,
        platform: Platform.OS,
        imageUrl: imageUrl,
        localFile: localFile,
      });
      setIsCapturing(false);

      // iOS/Android 권한 관련 에러 처리
      if (error?.message?.includes('permission') || error?.code === 'E_PERMISSION_MISSING' || error?.code === 'E_PERMISSION_DENIED') {
        console.error('❌ [다운로드] 권한 관련 오류 감지');
        Alert.alert(
          t('permissionRequired'),
          t('photoPermissionMessage'),
          [
            {
              text: t('openSettings'),
              onPress: () => openSettings(),
            },
            { text: t('cancel'), style: 'cancel' },
          ],
        );
      } else {
        console.error('❌ [다운로드] 일반 오류 - Toast 표시');
        Toast.show({
          type: 'error',
          text1: t('downloadFailed'),
          text2: error?.message || t('saveImageFailed'),
        });
      }
    } finally {
      console.log('📥 [다운로드] finally 블록 실행 - 정리 시작');
      setLoading(false);
      setIsCapturing(false);
      // 임시 파일 정리
      if (localFile) {
        try {
          console.log('📥 [다운로드] 임시 파일 삭제 시도:', localFile);
          const exists = await RNFS.exists(localFile);
          if (exists) {
            await RNFS.unlink(localFile);
            console.log('✅ [다운로드] 임시 파일 삭제 완료');
          } else {
            console.log('📥 [다운로드] 임시 파일이 이미 없음');
          }
        } catch (err: any) {
          console.error('❌ [다운로드] 임시 파일 삭제 실패:', err);
          console.error('❌ [다운로드] 삭제 오류 상세:', {
            message: err?.message,
            code: err?.code,
          });
        }
      }
      console.log('📥 [다운로드] finally 블록 완료');
    }
  };

  // 삭제 함수
  const handleDelete = () => {
    Alert.alert('삭제 확인', '정말로 이 코디를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        onPress: async () => {
          if (!user) return;

          try {
            await firestore()
              .collection('users')
              .doc(user.uid)
              .collection('recentResults')
              .doc(codiId)
              .delete();

            Toast.show({
              type: 'success',
              text1: t('deleteComplete'),
              text2: t('codiDeleted'),
            });

            navigation.goBack();
          } catch (error) {
            console.error('삭제 실패:', error);
            Alert.alert(t('error'), t('deleteError'));
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.dateText}>{dateInfo.fullDate}</Text>
        </View>

        <TouchableOpacity
          style={styles.heartButton}
          onPress={toggleLike}>
          <Text style={styles.heartIcon}>
            {currentIsLiked ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 이미지 영역 */}
      <View style={styles.imageContainer}>
        <View ref={imageRef} collapsable={false} style={styles.captureContainer}>
          {imageLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}

          <Image
            source={{ uri: imageUrl }}
            style={styles.fullImage}
            resizeMode="contain"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
          {/* 워터마크 이미지 - 캡처할 때만 표시됨 */}
          {isCapturing && (
            <View style={styles.watermarkContainer} pointerEvents="none">
              <Image
                source={require('../assets/images/watermark.png')}
                style={styles.watermarkImage}
                resizeMode="contain"
              />
            </View>
          )}
        </View>
      </View>

      {/* 하단 버튼 영역 */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          onPress={handleDownload}
          disabled={loading}
          activeOpacity={0.8}
          style={styles.downloadButtonContainer}>
          <LinearGradient
            colors={['#FF6B9D', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.downloadButton}>
            <View style={styles.downloadButtonContent}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.downloadIcon}>📥</Text>
                  <Text style={styles.downloadButtonText}>{t('download')}</Text>
                </>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}>
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteButtonText}>{t('delete')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    color: '#333333',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
  heartButton: {
    padding: 8,
  },
  heartIcon: {
    fontSize: 24,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  captureContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  fullImage: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  bottomContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    gap: 12,
  },
  downloadButtonContainer: {
    flex: 1.2, // 다운로드 버튼 너비를 조금 더 늘림 (1 → 1.2)
  },
  downloadButton: {
    paddingHorizontal: 0, // 좌우 패딩 제거 (내부에서 관리)
    paddingVertical: 0, // 상하 패딩 제거 (내부에서 관리)
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50, // 최소 높이 설정 (삭제 버튼과 동일하게)
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  downloadButtonContent: {
    flexDirection: 'row', // 아이콘과 텍스트가 가로로 나란히
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    gap: 8, // 아이콘과 텍스트 사이 간격
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 20,
    gap: 8,
    height: 50, // 고정 높이 설정 (다운로드 버튼과 동일하게)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  deleteButtonText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  downloadIcon: {
    fontSize: 18,
  },
  deleteIcon: {
    fontSize: 18,
  },
  watermarkContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    opacity: 0.3, // 2배 흐리게 표시
  },
  watermarkImage: {
    width: 80,
    height: 30,
  },
});

export default CodiDetailScreen;
