// src/screens/CodiDetailScreen.tsx

import React, {useState, useEffect} from 'react';
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
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import Toast from 'react-native-toast-message';

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

  const {codiId, imageUrl, createdAt, isLiked} = route.params;
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [currentIsLiked, setCurrentIsLiked] = useState(isLiked || false);

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

  // 이미지 다운로드 함수
  const handleDownload = async () => {
    if (!imageUrl) return;

    setLoading(true);
    try {
      const localFile = `${RNFS.CachesDirectoryPath}/${Date.now()}_codi.jpeg`;
      await RNFS.downloadFile({fromUrl: imageUrl, toFile: localFile}).promise;
      await CameraRoll.save(`file://${localFile}`, {type: 'photo'});
      
      Toast.show({
        type: 'success',
        text1: '다운로드 완료',
        text2: '갤러리에 저장되었습니다.',
      });
    } catch (error) {
      console.error('다운로드 실패:', error);
      Toast.show({
        type: 'error',
        text1: '다운로드 실패',
        text2: '이미지를 저장하는 데 실패했습니다.',
      });
    } finally {
      setLoading(false);
      // 임시 파일 정리
      const localFile = `${RNFS.CachesDirectoryPath}/${Date.now()}_codi.jpeg`;
      await RNFS.unlink(localFile).catch(err =>
        console.error('임시 파일 삭제 실패', err),
      );
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
      </View>

      {/* 하단 버튼 영역 */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.downloadButton]}
          onPress={handleDownload}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.downloadIcon}>📥</Text>
              <Text style={styles.actionButtonText}>다운로드</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}>
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.actionButtonText}>삭제</Text>
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
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  downloadButton: {
    backgroundColor: '#6A0DAD',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  downloadIcon: {
    fontSize: 18,
  },
  deleteIcon: {
    fontSize: 18,
  },
});

export default CodiDetailScreen;
