// src/screens/CodiDetailScreen.tsx

import React, {useState, useEffect, useRef} from 'react';
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
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import Toast from 'react-native-toast-message';
import {Platform, Linking} from 'react-native';
import {check, request, PERMISSIONS, RESULTS, openSettings, Permission} from 'react-native-permissions';
import {captureRef} from 'react-native-view-shot';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

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
  const route = useRoute<CodiDetailScreenRouteProp>();
  const user = auth().currentUser;
  const insets = useSafeAreaInsets();

  const {codiId, imageUrl, createdAt, isLiked} = route.params;
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
        text1: currentIsLiked ? '찜 해제됨' : '찜 추가됨',
      });
    } catch (error) {
      console.error('좋아요 상태 업데이트 실패:', error);
      setCurrentIsLiked(currentIsLiked); // 실패 시 원래 상태로 복원
      Alert.alert('오류', '좋아요 상태를 업데이트하는 중 문제가 발생했습니다.');
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
            '권한 필요',
            '이미지를 저장하려면 사진 라이브러리 접근 권한이 필요합니다.\n설정에서 권한을 허용해주세요.',
            [
              {
                text: '설정 열기',
                onPress: () => openSettings(),
              },
              {text: '취소', style: 'cancel'},
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
    if (!imageUrl) return;

    // iOS는 권한 체크, Android는 바로 시도 (CameraRoll.save가 자체 처리)
    if (Platform.OS === 'ios') {
      const hasPermission = await checkAndRequestPermission();
      if (!hasPermission) {
        return;
      }
    }

    setLoading(true);
    let localFile: string | null = null;
    try {
      // 워터마크가 포함된 이미지 캡처
      if (imageRef.current) {
        // 워터마크를 임시로 표시하고 캡처
        setIsCapturing(true);
        // 워터마크가 렌더링될 시간을 주기 위해 약간의 딜레이
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const uri = await captureRef(imageRef.current, {
          format: 'jpg',
          quality: 0.9,
        });
        
        setIsCapturing(false);
        
        await CameraRoll.save(uri, {type: 'photo'});
        Toast.show({
          type: 'success',
          text1: '다운로드 완료',
          text2: '갤러리에 저장되었습니다.',
        });
      } else {
        // 캡처 실패 시 원본 이미지 다운로드
        localFile = `${RNFS.CachesDirectoryPath}/${Date.now()}_codi.jpeg`;
        await RNFS.downloadFile({fromUrl: imageUrl, toFile: localFile}).promise;
        await CameraRoll.save(`file://${localFile}`, {type: 'photo'});
        Toast.show({
          type: 'success',
          text1: '다운로드 완료',
          text2: '갤러리에 저장되었습니다.',
        });
      }
    } catch (error: any) {
      console.error('다운로드 실패:', error);
      // Android에서 권한 관련 에러인 경우
      if (Platform.OS === 'android' && (error?.message?.includes('permission') || error?.code === 'E_PERMISSION_MISSING')) {
        Alert.alert(
          '권한 필요',
          '이미지를 저장하려면 사진 라이브러리 접근 권한이 필요합니다.\n설정에서 권한을 허용해주세요.',
          [
            {
              text: '설정 열기',
              onPress: () => openSettings(),
            },
            {text: '취소', style: 'cancel'},
          ],
        );
      } else {
        Toast.show({
          type: 'error',
          text1: '다운로드 실패',
          text2: '이미지를 저장하는 데 실패했습니다.',
        });
      }
    } finally {
      setLoading(false);
      // 임시 파일 정리
      if (localFile) {
        await RNFS.unlink(localFile).catch(err =>
          console.error('임시 파일 삭제 실패', err),
        );
      }
    }
  };

  // 삭제 함수
  const handleDelete = () => {
    Alert.alert('삭제 확인', '정말로 이 코디를 삭제하시겠습니까?', [
      {text: '취소', style: 'cancel'},
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
              text1: '삭제 완료',
              text2: '코디가 삭제되었습니다.',
            });
            
            navigation.goBack();
          } catch (error) {
            console.error('삭제 실패:', error);
            Alert.alert('오류', '삭제 중 문제가 발생했습니다.');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
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
            source={{uri: imageUrl}}
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
      <View style={[styles.bottomContainer, {paddingBottom: insets.bottom + 20}]}>
        <TouchableOpacity
          onPress={handleDownload}
          disabled={loading}
          activeOpacity={0.8}
          style={styles.downloadButtonContainer}>
          <LinearGradient
            colors={['#FF6B9D', '#8B5CF6']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.downloadButton}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.downloadIcon}>📥</Text>
                <Text style={styles.downloadButtonText}>다운로드</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}>
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteButtonText}>삭제</Text>
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
    flex: 1,
  },
  downloadButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
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
