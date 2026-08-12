// src/screens/CodiDetailScreen.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
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
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import Toast from 'react-native-toast-message';
import { check, request, PERMISSIONS, RESULTS, openSettings, Permission } from 'react-native-permissions';
import { captureRef } from 'react-native-view-shot';
import { useTranslation } from 'react-i18next';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { TICKET_REWARD_REFERRAL } from '../services/ticketService';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { AdEventType, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import ProductInfoModal from '../components/ProductInfoModal';
import {
  addCodiItemsToWishlist,
  addToWishlist,
  syncWishlistProductInfo,
} from '../services/wishlistService';
import { calculateTotalPrice } from '../services/codiPresetsService';
import { createCommunityPost } from '../services/communityService';
import { getUserReferralCode } from '../services/ticketService';
import { CodiPopViralWatermark } from '../components/CodiPopViralWatermark';
import type { CodiClothingItem } from '../types/shopping';

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

const adUnitId = __DEV__
  ? TestIds.REWARDED
  : Platform.OS === 'ios'
  ? 'ca-app-pub-6990308526694074/4347779439'
  : 'ca-app-pub-6990308526694074/7899285287';

const rewarded = RewardedAd.createForAdRequest(adUnitId, {
  keywords: ['fashion', 'clothing', 'shopping', 'style'],
});

const CodiDetailScreen = () => {
  const navigation = useNavigation<CodiDetailScreenNavigationProp>();
  const { t } = useTranslation();
  const route = useRoute<CodiDetailScreenRouteProp>();
  const user = auth().currentUser;
  const insets = useSafeAreaInsets();
  const { showActionSheetWithOptions } = useActionSheet();

  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setAdLoaded(true);
      },
    );
    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      reward => {
        console.log('User earned reward for HD Download (CodiDetail):', reward);
        processDownloadImage(false);
      },
    );
    const unsubscribeClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setAdLoaded(false);
        rewarded.load();
      },
    );

    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
    };
  }, []);

  const showRewardAd = () => {
    if (adLoaded) {
      rewarded.show();
    } else {
      Toast.show({
        type: 'info',
        text1: '광고를 불러오는 중입니다...',
        text2: '잠시 후 다시 시도해 주세요.',
      });
      rewarded.load();
    }
  };

  const { codiId, imageUrl, createdAt, isLiked } = route.params;
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [currentIsLiked, setCurrentIsLiked] = useState(isLiked || false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [clothingItems, setClothingItems] = useState<CodiClothingItem[]>([]);
  const [clothingImageUrls, setClothingImageUrls] = useState<string[]>([]);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [sharingCommunity, setSharingCommunity] = useState(false);
  const [userReferralCode, setUserReferralCode] = useState<string>('CODI20');
  const imageRef = useRef<View>(null);

  useEffect(() => {
    try {
      Image.prefetch(Image.resolveAssetSource(require('../assets/images/codipop_logo.png')).uri);
    } catch (e) {
      console.warn('Logo prefetch error:', e);
    }
    getUserReferralCode().then(code => {
      if (code) setUserReferralCode(code);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('recentResults')
      .doc(codiId)
      .onSnapshot(doc => {
        if (!doc.exists) {
          return;
        }
        const data = doc.data();
        setClothingItems(data?.clothingItems || []);
        setClothingImageUrls(data?.clothingImageUrls || []);
        if (typeof data?.isLiked === 'boolean') {
          setCurrentIsLiked(data.isLiked);
        }
      });

    return () => unsubscribe();
  }, [codiId, user]);

  const totalPrice = useMemo(
    () => calculateTotalPrice(clothingItems),
    [clothingItems],
  );

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

  const handleShareToCommunity = async () => {
    if (!user || sharingCommunity) {
      return;
    }
    setSharingCommunity(true);
    try {
      const postId = await createCommunityPost({
        authorId: user.uid,
        authorName: user.displayName || user.email || 'CodiPOP',
        authorPhotoUrl: user.photoURL,
        imageUrl,
        clothingImageUrls,
        clothingItems,
        sourceCodiId: codiId,
      });
      Toast.show({ type: 'success', text1: t('communityPublished') });
      navigation.navigate('CommunityPostDetail', { postId });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: t('communityPublishFailed') });
    } finally {
      setSharingCommunity(false);
    }
  };

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

  // 실제 이미지 다운로드 처리 함수 (isWatermarked: true -> 일반(워터마크), false -> HD 고화질 원본)
  const processDownloadImage = async (isWatermarked: boolean) => {
    console.log('📥 [다운로드 프로세스 시작] isWatermarked:', isWatermarked);

    if (!imageUrl) {
      console.error('❌ [다운로드 실패] imageUrl이 없습니다');
      return;
    }

    if (Platform.OS === 'ios') {
      try {
        const hasPermission = await checkAndRequestPermission();
        if (!hasPermission) return;
      } catch (error: any) {
        console.error('❌ [다운로드] 권한 확인 오류:', error);
        Alert.alert(t('error'), t('likeUpdateError'));
        return;
      }
    }

    setLoading(true);
    let localFile: string | null = null;

    try {
      if (isWatermarked && imageRef.current) {
        console.log('📥 [다운로드] 워터마크 이미지 캡처 시도');
        try {
          setIsCapturing(true);
          await new Promise(resolve => setTimeout(resolve, 300));

          if (!imageRef.current) {
            throw new Error('이미지 참조가 유효하지 않습니다.');
          }

          const uri = await captureRef(imageRef.current, {
            format: 'jpg',
            quality: 0.9,
          });

          setIsCapturing(false);

          await CameraRoll.save(uri, { type: 'photo' });
          Toast.show({
            type: 'success',
            text1: '갤러리에 저장했어요',
            text2: `SNS 에 공유하면 친구 초대 보상 티켓 ${TICKET_REWARD_REFERRAL}장을 받을 수 있어요`,
          });
          setLoading(false);
          return;
        } catch (captureError: any) {
          console.error('❌ [다운로드] 이미지 캡처 실패, 원본 다운로드로 진행:', captureError);
          setIsCapturing(false);
        }
      }

      // HD 고화질 원본 (워터마크 없음) 다운로드 및 저장
      console.log('📥 [다운로드] HD 고화질 원본 다운로드 진행');
      localFile = `${RNFS.CachesDirectoryPath}/${Date.now()}_codi_hd.jpeg`;
      await RNFS.downloadFile({ fromUrl: imageUrl, toFile: localFile }).promise;

      if (Platform.OS === 'ios') {
        await Share.share({
          url: `file://${localFile}`,
        });
        Toast.show({ type: 'success', text1: t('imageShared') });
      } else {
        await CameraRoll.save(`file://${localFile}`, { type: 'photo' });
        Toast.show({ type: 'success', text1: t('imageSavedToGallery') });
      }
    } catch (error: any) {
      console.error('❌ [다운로드] 전체 프로세스 실패:', error);
      setIsCapturing(false);

      if (error?.message?.includes('permission') || error?.code === 'E_PERMISSION_MISSING' || error?.code === 'E_PERMISSION_DENIED') {
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
        Toast.show({
          type: 'error',
          text1: t('downloadFailed'),
          text2: error?.message || t('saveImageFailed'),
        });
      }
    } finally {
      setLoading(false);
      setIsCapturing(false);
      if (localFile) {
        try {
          await RNFS.unlink(localFile);
        } catch (e) {}
      }
    }
  };

  // 이미지 다운로드 클릭 시 ActionSheet로 화질 옵션 선택
  const handleDownload = async () => {
    if (!imageUrl) return;

    // 문구 최소화 + 컬러 이모지 제거 (기획 요청 0812). 피팅 화면과 같은 표현을 씁니다.
    const options = [
      '고화질 다운받기 (광고시청)',
      '일반 다운받기',
      t('cancel'),
    ];
    const cancelButtonIndex = 2;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: '저장 방식 선택',
      },
      async (selectedIndex?: number) => {
        if (selectedIndex === undefined || selectedIndex === cancelButtonIndex) {
          return;
        }

        if (selectedIndex === 0) {
          Alert.alert(
            '고화질 다운받기',
            '짧은 광고를 보시면 워터마크 없는 고화질 원본이 저장됩니다.',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '광고 보고 저장',
                onPress: () => showRewardAd(),
              },
            ],
          );
        } else if (selectedIndex === 1) {
          // 일반 저장 — 코디팝 워터마크(QR·초대코드)가 함께 들어갑니다.
          await processDownloadImage(true);
        }
      },
    );
  };

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

  const handleOpenProduct = async (url?: string) => {
    if (!url) {
      Toast.show({ type: 'info', text1: t('productLinkMissing') });
      return;
    }

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Toast.show({ type: 'error', text1: t('productLinkInvalid') });
      return;
    }
    await Linking.openURL(url);
  };

  const handleSaveProductInfo = async (product: {
    productName?: string;
    productPrice?: number;
    productUrl?: string;
    shopName?: string;
    productSize?: string;
  }) => {
    if (!user || editingItemIndex === null) {
      return;
    }

    const nextItems = [...clothingItems];
    nextItems[editingItemIndex] = {
      ...nextItems[editingItemIndex],
      ...product,
    };

    await firestore()
      .collection('users')
      .doc(user.uid)
      .collection('recentResults')
      .doc(codiId)
      .update({ clothingItems: nextItems });

    if (nextItems[editingItemIndex].closetItemId) {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('closet')
        .doc(nextItems[editingItemIndex].closetItemId as string)
        .update({
          productName: product.productName || '',
          productPrice: product.productPrice || 0,
          productUrl: product.productUrl || '',
          shopName: product.shopName || '',
          productSize: product.productSize || '',
        });
    }

    // 위시리스트에 이미 담겨 있던 항목도 상품명 등 최신 정보로 동기화
    await syncWishlistProductInfo({
      userId: user.uid,
      imageUrl: nextItems[editingItemIndex].imageUrl,
      closetItemId: nextItems[editingItemIndex].closetItemId,
      productUrl: product.productUrl || nextItems[editingItemIndex].productUrl,
      product,
    });

    setClothingItems(nextItems);
    setProductModalVisible(false);
    setEditingItemIndex(null);
    Toast.show({ type: 'success', text1: t('productInfoSaved') });
  };

  const handleAddItemToWishlist = async (item: CodiClothingItem) => {
    if (!user) {
      return;
    }

    await addToWishlist({
      userId: user.uid,
      imageUrl: item.imageUrl,
      product: item,
      closetItemId: item.closetItemId,
      codiId,
    });

    Toast.show({ type: 'success', text1: t('wishlistAdded') });
  };

  const handleAddAllToWishlist = async () => {
    if (!user) {
      return;
    }

    const addedCount = await addCodiItemsToWishlist({
      userId: user.uid,
      codiId,
      items: clothingItems,
    });

    Toast.show({
      type: 'success',
      text1: t('wishlistBulkAdded', { count: addedCount }),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces>
        {/* 이미지 영역 */}
        <View
          style={[
            styles.imageContainer,
            isCapturing && { height: screenHeight * 0.75, backgroundColor: '#000000' },
          ]}>
          <View
            ref={imageRef}
            collapsable={false}
            style={[
              styles.captureContainer,
              isCapturing && { backgroundColor: '#000000' },
            ]}>
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
            {/* CodiPop 바이럴 워터마크 배너 (QR코드 + 초대코드 합성) - 상시 마운트로 로고 캐시 유지 */}
            <CodiPopViralWatermark referralCode={userReferralCode} isVisible={isCapturing} />
          </View>
        </View>

        <View style={styles.shoppingSection}>
          <View style={styles.shoppingHeader}>
            <Text style={styles.shoppingTitle}>{t('shoppingCardsTitle')}</Text>
            {totalPrice > 0 && (
              <Text style={styles.totalPriceText}>
                {t('estimatedTotalPrice', { price: totalPrice.toLocaleString() })}
              </Text>
            )}
          </View>

          {clothingItems.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled>
              {clothingItems.map((item, index) => (
                <View key={`${item.imageUrl}-${index}`} style={styles.productCard}>
                  <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.productName || t('productNameMissing')}
                  </Text>
                  <Text style={styles.productMeta} numberOfLines={1}>
                    {item.shopName || t('shopNameMissing')}
                  </Text>
                  {item.productPrice ? (
                    <Text style={styles.productPrice}>
                      {item.productPrice.toLocaleString()}원
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.productAction}
                    onPress={() => handleOpenProduct(item.productUrl)}>
                    <Text style={styles.productActionText}>{t('buyNow')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={() => handleAddItemToWishlist(item)}>
                    <Text style={styles.secondaryActionText}>{t('addToWishlist')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={() => {
                      setEditingItemIndex(index);
                      setProductModalVisible(true);
                    }}>
                    <Text style={styles.secondaryActionText}>{t('editProductInfo')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyShoppingText}>{t('shoppingCardsEmpty')}</Text>
          )}

          {clothingItems.length > 0 && (
            <TouchableOpacity style={styles.wishlistAllButton} onPress={handleAddAllToWishlist}>
              <Text style={styles.wishlistAllText}>{t('addAllToWishlist')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 하단 버튼 영역 */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.communityShareButton}
            onPress={handleShareToCommunity}
            disabled={sharingCommunity}
            activeOpacity={0.85}>
            {sharingCommunity ? (
              <ActivityIndicator size="small" color="#6A0DAD" />
            ) : (
              <Text style={styles.communityShareText}>{t('communityShareFromCodi')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomRow}>
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
                      <DownloadIcon size={20} color="#6A0DAD" strokeWidth={2} />
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
        </View>
      </ScrollView>

      <ProductInfoModal
        visible={productModalVisible}
        initialValue={
          editingItemIndex !== null ? clothingItems[editingItemIndex] : undefined
        }
        onClose={() => {
          setProductModalVisible(false);
          setEditingItemIndex(null);
        }}
        onSave={handleSaveProductInfo}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
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
    height: screenHeight * 0.38,
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
    height: '100%',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    gap: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 12,
  },
  communityShareButton: {
    borderWidth: 1.5,
    borderColor: '#6A0DAD',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F1FC',
  },
  communityShareText: {
    color: '#6A0DAD',
    fontSize: 14,
    fontWeight: '700',
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
  shoppingSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFC',
    borderTopWidth: 1,
    borderTopColor: '#EFEFF4',
  },
  shoppingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shoppingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  totalPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6A0DAD',
  },
  productCard: {
    width: 160,
    marginRight: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#F4F4F4',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
  },
  productMeta: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6A0DAD',
    marginTop: 6,
  },
  productAction: {
    marginTop: 8,
    backgroundColor: '#6A0DAD',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  productActionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryAction: {
    marginTop: 6,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: '#6A0DAD',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyShoppingText: {
    fontSize: 13,
    color: '#777',
  },
  wishlistAllButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  wishlistAllText: {
    color: '#6A0DAD',
    fontWeight: '700',
    fontSize: 12,
  },
});

export default CodiDetailScreen;
