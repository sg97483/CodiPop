// src/screens/VirtualFittingScreen.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
  Animated as RNAnimated,
  Dimensions,
  Share,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import {
  useNavigation,
  useIsFocused,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import Toast from 'react-native-toast-message';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import { useActionSheet } from '@expo/react-native-action-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import { check, request, PERMISSIONS, RESULTS, openSettings, Permission } from 'react-native-permissions';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import Share from 'react-native-share'; // ❌ 충돌 발생으로 제거
import { AdEventType, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { CLOSET_FILTER_CATEGORIES, ClosetSaveCategory, MAX_CLOSET_ITEMS } from '../constants/closet';
import {
  ClosetFullError,
  saveClosetItem,
} from '../services/closetService';
import {
  buildClothingItemsFromSelection,
  saveCodiResult,
} from '../services/codiPresetsService';
import type { ClosetItemRecord } from '../types/shopping';
import type { BodySizeProfile } from '../types/bodySize';
import { getBodySizeProfile } from '../services/bodySizeService';
import {
  getTicketBalance,
  addTickets,
  deductTickets,
  isDevBypassUser,
  getUserReferralCode,
  TICKET_COST_FITTING,
  TICKET_REWARD_AD,
  TICKET_REWARD_REFERRAL,
} from '../services/ticketService';
import { CodiPopLoadingAnimation } from '../components/CodiPopLoadingAnimation';
import { CodiPopViralWatermark } from '../components/CodiPopViralWatermark';
import {
  DownloadIcon,
  ShareIcon,
  RefreshIcon,
} from '../components/icons';
import { CircleIconButton } from '../components/CircleIconButton';
import { buildInviteUrl } from '../constants/appLinks';


/**
 * 앱 실행 1회를 식별하는 값.
 * 서버 리포트의 "1인당 평균 피팅"이 이 단위로 계산됩니다.
 * 로그인 전에도 필요하므로 uid 와 별개로 둡니다.
 */
const APP_SESSION_ID = `app_${Date.now().toString(36)}_${Math.random()
  .toString(36)
  .slice(2, 10)}`;

const adUnitId = __DEV__
  ? TestIds.REWARDED
  : Platform.OS === 'ios'
  ? 'ca-app-pub-6990308526694074/4347779439'
  : 'ca-app-pub-6990308526694074/7899285287';

const rewarded = RewardedAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

const CATEGORIES = [...CLOSET_FILTER_CATEGORIES];
const MAX_CLOTHING_SELECTION = 2; // 최대 옷 선택 개수
const MAX_DAILY_FITTING = 5; // 하루 최대 이미지 합성 횟수 (레거시 호환 유지)

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_MARGIN = 4;
const CONTAINER_PADDING = 10;
const ITEMS_PER_ROW = 5;
const ITEM_SIZE = (SCREEN_WIDTH - CONTAINER_PADDING * 2 - ITEM_MARGIN * ITEMS_PER_ROW * 2) / ITEMS_PER_ROW;

// 워크스루 단계
enum WorkthroughStep {
  NONE = 0,
  SELECT_PERSON = 1,
  SELECT_CLOTHING = 2,
  START_FITTING = 3,
}

// ✅ ClosetItem 타입을 파일 상단에 정의하여 재사용합니다.
type ClosetItem = ClosetItemRecord;

interface GridItem {
  id: string;
  isAddButton?: boolean;
  imageUrl?: string;
  category?: string;
}

const VirtualFittingScreen = () => {
  const navigation = useNavigation<any>();
  const route =
    useRoute<RouteProp<{ params: { clothingUrl?: string; clothingUrls?: string[] } }, 'params'>>();
  const isFocused = useIsFocused();
  const user = auth().currentUser;
  const { showActionSheetWithOptions } = useActionSheet(); // ✅ 훅 사용
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [personImage, setPersonImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const resultImageRef = useRef<View>(null);
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [loadingCloset, setLoadingCloset] = useState(true);
  const [selectedClothingImages, setSelectedClothingImages] = useState<string[]>([]);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [workthroughStep, setWorkthroughStep] = useState<WorkthroughStep>(WorkthroughStep.NONE);
  const [bodyProfile, setBodyProfile] = useState<BodySizeProfile | null>(null);

  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideUpAnim = useRef(new RNAnimated.Value(0)).current; // 하단 영역 슬라이드 업 애니메이션
  const panGestureRef = useRef<PanGestureHandler>(null);

  const [imageLoading, setImageLoading] = useState<{ [key: string]: boolean }>(
    {},
  ); // ✅ 이미지 로딩 state 추가
  const [ticketBalance, setTicketBalance] = useState<number>(0); // 보유 스타일 티켓
  const [remainingCount, setRemainingCount] = useState<number>(MAX_DAILY_FITTING); // 레거시 호환 유지
  const [userReferralCode, setUserReferralCode] = useState<string>('CODI20');
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const pendingAdRewardTypeRef = useRef<'RECHARGE' | 'HD_DOWNLOAD'>('RECHARGE');

  // 광고 로드 및 이벤트 리스너 설정
  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsAdLoaded(true);
    });
    
    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      reward => {
        console.log('User earned reward of ', reward);
        if (pendingAdRewardTypeRef.current === 'HD_DOWNLOAD') {
          pendingAdRewardTypeRef.current = 'RECHARGE';
          Toast.show({
            type: 'success',
            text1: '광고 시청 완료',
            text2: '워터마크 없는 HD 원본 저장을 시작합니다.',
          });
          processDownloadImage(false);
        } else {
          // 보상 지급 (티켓 1장 = 피팅 1회)
          addTickets(TICKET_REWARD_AD, 'REWARD_AD').then(newBalance => {
            setTicketBalance(newBalance);
            Toast.show({
              type: 'success',
              text1: `티켓 +${TICKET_REWARD_AD}장 충전 완료`,
              text2: `보유 ${newBalance}장 · 피팅 ${newBalance}회 가능`,
            });
          });
          decreaseDailyUsageCount(); // 레거시 일일 횟수도 함께 완화
        }
      },
    );

    // 광고가 닫힌 후 상태 리셋 및 다시 로드
    const unsubscribeClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        console.log('Rewarded ad closed');
        pendingAdRewardTypeRef.current = 'RECHARGE';
        setIsAdLoaded(false);
        rewarded.load();
      },
    );

    // 로드 실패 시 자동 재시도
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribeError = rewarded.addAdEventListener(
      AdEventType.ERROR,
      error => {
        console.error('보상형 광고 로드 실패:', error);
        pendingAdRewardTypeRef.current = 'RECHARGE';
        setIsAdLoaded(false);
        if (retryTimer) {
          clearTimeout(retryTimer);
        }
        retryTimer = setTimeout(() => {
          rewarded.load();
        }, 30000);
      },
    );

    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, []);

  // 광고 보여주기 함수
  const showRewardAd = async (rewardType: 'RECHARGE' | 'HD_DOWNLOAD' = 'RECHARGE') => {
    pendingAdRewardTypeRef.current = rewardType;
    try {
      if (isAdLoaded) {
        await rewarded.show();
      } else {
        Toast.show({ type: 'error', text1: '광고 준비 중', text2: '잠시 후 다시 시도해 주세요.' });
        rewarded.load();
      }
    } catch (error) {
      console.error('광고 표시 실패:', error);
      Toast.show({ type: 'error', text1: '광고 표시 실패', text2: '잠시 후 다시 시도해 주세요.' });
      pendingAdRewardTypeRef.current = 'RECHARGE';
      setIsAdLoaded(false);
      rewarded.load();
    }
  };

  // 워크스루 및 티켓 잔액 초기화 - 화면 포커스 시 체크
  useEffect(() => {
    if (isFocused) {
      checkAndStartWorkthrough();
      getTicketBalance().then(balance => {
        setTicketBalance(balance);
      });
      checkDailyUsage().then(({ remainingCount }) => {
        setRemainingCount(remainingCount);
      });
      getUserReferralCode().then(code => {
        if (code) setUserReferralCode(code);
      });
      try {
        Image.prefetch(Image.resolveAssetSource(require('../assets/images/codipop_logo.png')).uri);
      } catch (e) {
        console.warn('Logo prefetch error:', e);
      }
    }
  }, [isFocused]);

  // 워크스루 완료 여부 확인 및 시작
  const checkAndStartWorkthrough = async () => {
    try {
      const hasCompletedWorkthrough = await AsyncStorage.getItem('hasCompletedVirtualFittingWorkthrough');
      if (!hasCompletedWorkthrough) {
        // 워크스루 시작
        setWorkthroughStep(WorkthroughStep.SELECT_PERSON);
      }
    } catch (error) {
      console.error('워크스루 체크 실패:', error);
    }
  };

  // 워크스루 다음 단계로 이동
  const handleWorkthroughNext = () => {
    if (workthroughStep === WorkthroughStep.SELECT_PERSON) {
      // 2단계로 이동
      // setIsPanelExpanded(true);
      // RNAnimated.timing(slideUpAnim, {
      //   toValue: 1,
      //   duration: 300,
      //   useNativeDriver: true,
      //   useNativeDriver: true,
      // }).start();
      setWorkthroughStep(WorkthroughStep.SELECT_CLOTHING);
    } else if (workthroughStep === WorkthroughStep.SELECT_CLOTHING) {
      // 3단계로 이동
      setWorkthroughStep(WorkthroughStep.START_FITTING);
    } else if (workthroughStep === WorkthroughStep.START_FITTING) {
      // 워크스루 완료
      completeWorkthrough();
    }
  };

  // 워크스루 완료 처리
  const completeWorkthrough = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedVirtualFittingWorkthrough', 'true');
      setWorkthroughStep(WorkthroughStep.NONE);
    } catch (error) {
      console.error('워크스루 완료 저장 실패:', error);
    }
  };

  // 옷장에서 아이템을 선택했을 때 clothingImage 자동 설정
  useEffect(() => {
    if (!isFocused) {
      return;
    }
    if (route.params?.clothingUrls?.length) {
      setSelectedClothingImages(
        route.params.clothingUrls.slice(0, MAX_CLOTHING_SELECTION),
      );
      navigation.setParams({ clothingUrls: undefined, clothingUrl: undefined });
      return;
    }
    if (route.params?.clothingUrl) {
      setSelectedClothingImages([route.params.clothingUrl]);
      navigation.setParams({ clothingUrl: undefined });
    }
  }, [
    isFocused,
    route.params?.clothingUrl,
    route.params?.clothingUrls,
    navigation,
  ]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    getBodySizeProfile()
      .then(setBodyProfile)
      .catch(() => setBodyProfile(null));
  }, [isFocused]);

  // Firestore에서 옷장 데이터 가져오기
  useEffect(() => {
    if (isFocused && user) {
      setLoadingCloset(true);
      const subscriber = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('closet')
        .orderBy('createdAt', 'desc')
        .onSnapshot(querySnapshot => {
          const items: ClosetItem[] = [];
          querySnapshot.forEach(doc => {
            const data = doc.data();
            items.push({
              id: doc.id,
              imageUrl: data.imageUrl,
              category: data.category,
              productName: data.productName,
              productPrice: data.productPrice,
              productUrl: data.productUrl,
              shopName: data.shopName,
              source: data.source,
            });
          });
          setClosetItems(items);
          setLoadingCloset(false);
        });
      return () => subscriber();
    }
  }, [isFocused, user]);

  // 선택된 카테고리에 따라 보여줄 아이템 필터링
  const displayedItems = useMemo(() => {
    if (activeCategory === 'ALL') {
      return closetItems;
    }
    return closetItems.filter(item => item.category === activeCategory);
  }, [activeCategory, closetItems]);

  // 그리드 레이아웃을 위한 데이터 준비 (첫 번째 아이템은 추가 버튼용)
  const gridItems = useMemo((): GridItem[] => {
    return [{ id: 'add-button', isAddButton: true }, ...displayedItems.map(item => ({
      id: item.id,
      imageUrl: item.imageUrl,
      category: item.category,
    }))];
  }, [displayedItems]);

  // 아이템 개수에 따른 패널 높이 계산
  const panelHeight = useMemo(() => {
    const DRAG_HANDLE_HEIGHT = 50;
    const CATEGORY_HEIGHT = 44;
    const ROW_HEIGHT = ITEM_SIZE + ITEM_MARGIN * 2;
    const PADDING = 20;

    const numRows = Math.max(1, Math.ceil(gridItems.length / ITEMS_PER_ROW));
    // 최대 3줄분 확보, 나머지는 스크롤
    const visibleRows = Math.min(numRows, 3);
    const itemsHeight = visibleRows * ROW_HEIGHT;

    const calculatedHeight =
      DRAG_HANDLE_HEIGHT + CATEGORY_HEIGHT + itemsHeight + PADDING;

    const maxHeight = Math.min(Math.round(Dimensions.get('window').height * 0.5), 420);
    return Math.max(220, Math.min(calculatedHeight, maxHeight));
  }, [gridItems.length]);

  // 접었을 때 얼마나 보일지.
  //
  // 예전에는 높이의 20%를 남겼는데, 패널이 커질수록 남는 부분도 커져서
  // **결과 사진 아래를 가렸습니다.** 손잡이와 '내 옷장' 글자만 보이도록
  // 고정 높이로 바꿉니다 — 패널이 아무리 커져도 사진을 더 가리지 않습니다.
  const PANEL_PEEK_HEIGHT = 56;
  const panelTranslateY = useMemo(() => {
    return Math.max(0, panelHeight - PANEL_PEEK_HEIGHT);
  }, [panelHeight]);

  // 사람 이미지 선택 함수
  const handleSelectPerson = async () => {
    // 업로드 전 리사이즈: 원본(수 MB) 대신 최대 1536px로 줄여 전송 시간 단축
    const result = await launchImageLibrary({
      mediaType: 'photo',
      maxWidth: 1536,
      maxHeight: 1536,
      quality: 0.8,
    });
    if (result.assets && result.assets[0].uri) {
      setPersonImage(result.assets[0].uri);
      // 사람 이미지 선택 시 하단 영역이 위로 올라가는 애니메이션
      RNAnimated.timing(slideUpAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // 이미지를 Firebase Storage에 업로드하는 함수
  const uploadImageToStorage = async (localImageUri: string, folder: string): Promise<string> => {
    if (!user) throw new Error('사용자가 로그인되지 않았습니다.');

    const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const reference = storage().ref(`users/${user.uid}/${folder}/${filename}`);

    try {
      await reference.putFile(localImageUri);
      const downloadUrl = await reference.getDownloadURL();
      return downloadUrl;
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      throw error;
    }
  };

  // 옷장에 아이템을 저장하는 함수
  const handleSaveToCloset = async (imageUrl: string, category: string) => {
    if (!imageUrl || !user) {
      return;
    }

    try {
      const downloadUrl = await saveClosetItem({
        imageUri: imageUrl,
        category: category as ClosetSaveCategory,
        source: 'gallery',
      });

      Toast.show({ type: 'success', text1: t('addedToCloset') });
      setSelectedClothingImages([downloadUrl]);
    } catch (error) {
      if (error instanceof ClosetFullError) {
        Toast.show({
          type: 'error',
          text1: t('closetFull'),
          text2: t('closetFullMessage', { max: MAX_CLOSET_ITEMS }),
        });
        return;
      }

      console.error('옷장 저장 실패:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('closetSaveError'),
      });
    }
  };

  // 갤러리에서 새 옷을 선택하고 저장하는 함수
  const handleSelectClothing = async () => {
    const sourceOptions = [
      t('mallFromGallery'),
      t('mallFromShoppingSite'),
      t('cancel'),
    ];
    const sourceCancelIndex = 2;

    showActionSheetWithOptions(
      {
        options: sourceOptions,
        cancelButtonIndex: sourceCancelIndex,
        title: t('mallAddClothingTitle'),
      },
      async (sourceIndex?: number) => {
        if (sourceIndex === undefined || sourceIndex === sourceCancelIndex) {
          return;
        }

        if (sourceIndex === 1) {
          navigation.navigate('MallList' as never);
          return;
        }

        // 업로드 전 리사이즈: 옷 이미지도 최대 1536px로 줄여 전송
        const result = await launchImageLibrary({
          mediaType: 'photo',
          maxWidth: 1536,
          maxHeight: 1536,
          quality: 0.8,
        });
        if (result.assets && result.assets[0].uri) {
          const newClothingUrl = result.assets[0].uri;

          const options = ['TOPS', 'BOTTOMS', 'SHOES', 'OUTER', t('cancel')];
          const cancelButtonIndex = 4;

          showActionSheetWithOptions(
            {
              options,
              cancelButtonIndex,
              title: t('selectCategoryTitle'),
            },
            (selectedIndex?: number) => {
              if (
                selectedIndex !== undefined &&
                selectedIndex !== cancelButtonIndex
              ) {
                const category = options[selectedIndex];
                handleSaveToCloset(newClothingUrl, category);
                setSelectedClothingImages([newClothingUrl]);
              }
            },
          );
        }
      },
    );
  };

  // 일일 사용 횟수 확인 및 관리 함수
  const checkDailyUsage = async (): Promise<{ canUse: boolean; remainingCount: number }> => {
    if (isDevBypassUser()) {
      return { canUse: true, remainingCount: 9999 };
    }
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
      const storageKey = 'virtualFittingDailyUsage';
      const storedData = await AsyncStorage.getItem(storageKey);

      if (!storedData) {
        // 저장된 데이터가 없으면 오늘 처음 사용
        await AsyncStorage.setItem(storageKey, JSON.stringify({ date: today, count: 0 }));
        return { canUse: true, remainingCount: MAX_DAILY_FITTING };
      }

      // JSON 파싱 안전 처리
      let parsedData;
      try {
        parsedData = JSON.parse(storedData);
      } catch (parseError) {
        console.error('JSON 파싱 실패, 데이터 초기화:', parseError);
        await AsyncStorage.setItem(storageKey, JSON.stringify({ date: today, count: 0 }));
        return { canUse: true, remainingCount: MAX_DAILY_FITTING };
      }
      const { date, count } = parsedData;

      // 날짜가 다르면 리셋 (새로운 하루)
      if (date !== today) {
        await AsyncStorage.setItem(storageKey, JSON.stringify({ date: today, count: 0 }));
        return { canUse: true, remainingCount: MAX_DAILY_FITTING };
      }

      // 오늘 날짜이고 사용 횟수 확인
      if (count >= MAX_DAILY_FITTING) {
        return { canUse: false, remainingCount: 0 };
      }

      return { canUse: true, remainingCount: MAX_DAILY_FITTING - count };
    } catch (error) {
      console.error('일일 사용 횟수 확인 실패:', error);
      // 에러 발생 시 사용 허용 (서비스 중단 방지)
      return { canUse: true, remainingCount: MAX_DAILY_FITTING };
    }
  };

  // 일일 사용 횟수 증가 함수
  const incrementDailyUsage = async (): Promise<void> => {
    if (isDevBypassUser()) {
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = 'virtualFittingDailyUsage';
      const storedData = await AsyncStorage.getItem(storageKey);

      if (!storedData) {
        await AsyncStorage.setItem(storageKey, JSON.stringify({ date: today, count: 1 }));
        return;
      }

      // JSON 파싱 안전 처리
      let parsedData;
      try {
        parsedData = JSON.parse(storedData);
      } catch (parseError) {
        console.error('JSON 파싱 실패, 데이터 초기화:', parseError);
        await AsyncStorage.setItem(storageKey, JSON.stringify({ date: today, count: 1 }));
        return;
      }
      const { date, count } = parsedData;

      // 날짜가 다르면 새로 시작
      if (date !== today) {
        await AsyncStorage.setItem(storageKey, JSON.stringify({ date: today, count: 1 }));
        return;
      }

      // 오늘 날짜면 횟수 증가
      await AsyncStorage.setItem(storageKey, JSON.stringify({ date: today, count: count + 1 }));
    } catch (error) {
      console.error('일일 사용 횟수 증가 실패:', error);
    }
  };

  // 일일 사용 횟수 차감 함수 (보상 지급용)
  const decreaseDailyUsageCount = async (): Promise<void> => {
    if (isDevBypassUser()) {
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = 'virtualFittingDailyUsage';
      const storedData = await AsyncStorage.getItem(storageKey);

      let count = 0;
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          if (parsedData.date === today) {
            count = parsedData.count;
          }
        } catch (parseError) {
          console.error('JSON 파싱 실패:', parseError);
        }
      }
      // 충전 시 count를 1 감소 (음수 허용하여 최대 10회 보유 = count -5 까지 가능)
      const newCount = Math.max(-5, count - 1);
      await AsyncStorage.setItem(storageKey, JSON.stringify({ date: today, count: newCount }));
    } catch (error) {
      console.error('일일 사용 횟수 차감 실패:', error);
    }
  };

  // '피팅 시작' 버튼을 눌렀을 때 실행될 함수
  const handleTryOn = async () => {
    if (!personImage || selectedClothingImages.length === 0) {
      Alert.alert(t('selectionLimitTitle'), t('selectPersonAndClothing'));
      return;
    }

    // 2단계 스타일 티켓 잔액 확인 및 차감 여부 검사
    const currentBalance = await getTicketBalance();
    if (currentBalance < TICKET_COST_FITTING) {
      setTicketBalance(currentBalance);
      Alert.alert(
        '스타일 티켓 부족',
        `피팅 1회에 티켓 ${TICKET_COST_FITTING}장이 필요합니다.\n(현재 보유: ${currentBalance}장)\n\n짧은 광고를 보고 티켓 ${TICKET_REWARD_AD}장을 받으시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: `광고 보고 티켓 ${TICKET_REWARD_AD}장 받기`,
            onPress: () => showRewardAd('RECHARGE'),
            style: 'default',
          },
        ],
      );
      return;
    }
    setTicketBalance(currentBalance);

    // 피팅 시작 시 내 옷장 패널 접기
    setIsPanelExpanded(false);
    RNAnimated.timing(slideUpAnim, {
      toValue: 0.05,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setIsProcessing(true);
    setResultImage(null);

    const formData = new FormData();
    formData.append('person', {
      uri: personImage,
      name: 'person.jpg',
      type: 'image/jpeg',
    });

    // 모든 선택된 옷 이미지를 전송 (서버에서 다중 옷 이미지 지원)
    selectedClothingImages.forEach((clothingUrl, index) => {
      formData.append('clothing', {
        uri: clothingUrl,
        name: `clothing_${index}.jpg`,
        type: 'image/jpeg',
      });
    });

    // 옷 개수 정보도 함께 전송
    formData.append('clothing_count', selectedClothingImages.length.toString());

    // MY 사이즈가 있으면 피팅 합성 프롬프트에 반영
    if (bodyProfile) {
      formData.append('heightCm', String(bodyProfile.heightCm));
      formData.append('weightKg', String(bodyProfile.weightKg));
      formData.append('usualSize', bodyProfile.usualSize);
    }

    // 어떤 옷을 입어봤는지 서버 리포트에 남긴다.
    //
    // 이 값이 없으면 앱 피팅이 전부 한 덩어리로 뭉쳐서, "앱에서 어느 몰 상품이
    // 많이 피팅되는가"를 알 수 없다. **그게 곧 다음 영업 리스트다** — 우리 앱에서
    // 이미 수요가 확인된 몰이기 때문이다.
    //
    // mallId 는 보내지 않는다. 그 값은 우리 제휴 고객사(테넌트)를 가리키는 것이라,
    // 사용자가 옷을 담아온 몰 이름을 넣으면 제휴하지도 않은 몰이 고객사 통계로 잡힌다.
    const primaryItem = buildClothingItemsFromSelection(
      selectedClothingImages,
      closetItems,
    )[0];
    if (primaryItem) {
      if (primaryItem.closetItemId) {
        formData.append('productId', primaryItem.closetItemId);
      }
      if (primaryItem.productName) {
        formData.append('productName', primaryItem.productName);
      }
      if (primaryItem.shopName) {
        formData.append('shopName', primaryItem.shopName);
      }
    }
    formData.append('sessionId', APP_SESSION_ID);
    if (user?.uid) {
      formData.append('userId', user.uid);
    }

    // 로그인 토큰. **이게 있어야 서버가 티켓을 검증하고 직접 차감합니다.**
    //
    // 그동안 티켓은 앱에서만 막았고 서버는 쳐다보지도 않았습니다. `/try-on` 을 직접
    // 호출하면 티켓 없이 무제한이었고, 건당 56.2원이 그대로 나갔습니다.
    // 앱에 심어둔 키는 바이너리에서 추출되므로 키로는 막을 수 없고,
    // 남의 계정 토큰은 만들 수 없으므로 토큰이 보안 경계가 됩니다.
    let serverChargedTickets = false;
    try {
      const idToken = await auth().currentUser?.getIdToken();
      if (idToken) {
        formData.append('idToken', idToken);
        serverChargedTickets = true;
      }
    } catch (tokenError) {
      // 토큰을 못 얻어도 피팅은 진행합니다. 서버가 레거시 경로로 받아 주고,
      // 티켓은 아래에서 앱이 차감합니다.
      console.warn('ID 토큰 발급 실패, 로컬 차감으로 진행:', tokenError);
    }

    try {
      const response = await fetch(
        'https://codipop-backend.onrender.com/try-on',
        {
          // 🚨 IP 주소 확인
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      const result = await response.json();

      // 서버가 돌려주는 거절 사유를 그대로 안내합니다.
      // 이 값들이 없으면 전부 "피팅 실패"로만 보여 사용자가 무엇을 해야 할지 모릅니다.
      if (response.status === 402) {
        // 로딩 해제는 아래 finally 블록이 처리합니다.
        if (typeof result.ticketBalance === 'number') {
          setTicketBalance(result.ticketBalance);
        }
        Alert.alert(t('ticketShortage'), result.message || t('ticketShortageMessage'));
        return;
      }
      if (response.status === 429) {
        Alert.alert(t('tooManyRequests'), result.message || t('tooManyRequestsMessage'));
        return;
      }
      if (response.status === 401) {
        Alert.alert(t('loginRequired'), result.message || t('loginExpiredMessage'));
        return;
      }

      if (result.success && result.imageUrl) {
        // 티켓 차감. **서버가 이미 차감했으면 앱은 차감하지 않습니다** — 안 그러면 두 번 빠집니다.
        let nextBalance: number;
        if (serverChargedTickets && typeof result.ticketBalance === 'number') {
          nextBalance = result.ticketBalance;
        } else {
          nextBalance = (await deductTickets(TICKET_COST_FITTING, 'AI_FITTING')).balance;
        }
        setTicketBalance(nextBalance);
        await incrementDailyUsage();
        const { remainingCount: newRemaining } = await checkDailyUsage();
        setRemainingCount(newRemaining);

        setResultImage(result.imageUrl);
        Toast.show({ type: 'success', text1: t('fittingComplete'), text2: `티켓 ${TICKET_COST_FITTING}장 사용 · 남은 ${nextBalance}장` });
        if (user) {
          try {
            const clothingItems = buildClothingItemsFromSelection(
              selectedClothingImages,
              closetItems,
            );
            await saveCodiResult({
              userId: user.uid,
              resultImageUrl: result.imageUrl,
              clothingImageUrls: selectedClothingImages,
              clothingItems,
            });
          } catch (saveError) {
            console.error('코디 결과 저장 실패:', saveError);
            // 한 번 더 재시도
            try {
              const clothingItems = buildClothingItemsFromSelection(
                selectedClothingImages,
                closetItems,
              );
              await saveCodiResult({
                userId: user.uid,
                resultImageUrl: result.imageUrl,
                clothingImageUrls: selectedClothingImages,
                clothingItems,
              });
            } catch (retryError) {
              console.error('코디 결과 저장 재시도 실패:', retryError);
              Toast.show({
                type: 'error',
                text1: t('saveFailed'),
                text2: '피팅은 완료됐지만 코디북 저장에 실패했어요. 다시 피팅해 주세요.',
              });
            }
          }
        }
      } else {
        throw new Error(result.message || 'fitting failed');
      }
    } catch (error) {
      console.error('피팅 실패:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('fittingFailed'),
      });
    } finally {
      setIsProcessing(false);
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

  // 결과 이미지를 실제 저장/공유하는 내부 처리 함수 (일반 워터마크 vs HD 옵션)
  const processDownloadImage = async (isWatermarked: boolean) => {
    if (!resultImage) {
      return;
    }

    let localFile: string | null = null;
    try {
      if (isWatermarked) {
        try {
          setIsCapturing(true);
          await new Promise(resolve => setTimeout(resolve, 300));

          if (!resultImageRef.current) {
            throw new Error('이미지 참조가 유효하지 않습니다.');
          }

          const uri = await captureRef(resultImageRef.current, {
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
          return;
        } catch (captureError) {
          console.error('이미지 캡처 실패:', captureError);
          setIsCapturing(false);
          // 캡처 실패 시 원본 다운로드로 fallback
        }
      }

      localFile = `${RNFS.CachesDirectoryPath}/${Date.now()}_result.jpeg`;
      await RNFS.downloadFile({ fromUrl: resultImage, toFile: localFile }).promise;

      if (Platform.OS === 'ios') {
        await Share.share({
          url: `file://${localFile}`,
        });
        Toast.show({
          type: 'success',
          text1: isWatermarked ? t('imageShared') : '고화질 원본을 저장·공유했어요',
        });
      } else {
        // Android에서는 갤러리 저장 수행
        await CameraRoll.save(`file://${localFile}`, { type: 'photo' });
        Toast.show({
          type: 'success',
          text1: isWatermarked ? t('imageSavedToGallery') : '고화질 원본을 갤러리에 저장했어요',
        });
      }
    } catch (error: any) {
      console.error('저장 실패:', error);
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
          text1: t('saveFailed'),
          text2: error?.message || t('saveImageFailed'),
        });
      }
    } finally {
      setIsCapturing(false);
      if (localFile) {
        try {
          await RNFS.unlink(localFile);
        } catch (err) {
          console.error('임시 파일 삭제 실패', err);
        }
      }
    }
  };

  /**
   * 결과를 링크로 공유합니다. '저장'과 다른 동작입니다 —
   * 저장은 갤러리에 넣고, 공유는 초대 링크를 함께 보내 사람을 데려옵니다.
   * 초대 링크에는 내 추천 코드가 들어가 있어 가입 시 양쪽이 티켓을 받습니다.
   */
  const handleShareImage = async () => {
    if (!resultImage) {
      return;
    }
    try {
      await Share.share({
        message: [
          '코디팝으로 입어봤어요',
          resultImage,
          userReferralCode ? buildInviteUrl(userReferralCode) : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (error) {
      // 사용자가 공유 시트를 닫은 경우도 여기로 옵니다. 알릴 것이 없습니다.
      console.log('공유 취소 또는 실패:', error);
    }
  };

  /**
   * 결과 화면에서 '다른 옷' 버튼.
   *
   * **결과 사진은 지우지 않습니다.** 옷장을 열고 선택만 비웁니다 —
   * 다음 옷을 고르는 동안에도 방금 입어본 모습이 화면에 남아 있어야
   * 두 벌을 비교할 수 있습니다. 옷을 고르면 '이 옷으로 다시 피팅' 버튼이 나타납니다.
   */
  const openClosetForNextFitting = () => {
    setSelectedClothingImages([]);
    setIsPanelExpanded(true);
    RNAnimated.timing(slideUpAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  /** 내 사진 썸네일을 누르면 뜨는 메뉴. 구글 쇼핑의 '기존 사진 바꾸기 / 삭제'와 같습니다. */
  const handlePersonMenu = () => {
    const options = ['다른 사진으로 바꾸기', '사진 삭제', t('cancel')];
    showActionSheetWithOptions(
      { options, cancelButtonIndex: 2, destructiveButtonIndex: 1 },
      (selectedIndex?: number) => {
        if (selectedIndex === 0) {
          handleSelectPerson();
        } else if (selectedIndex === 1) {
          setPersonImage(null);
          setResultImage(null);
        }
      },
    );
  };

  // 결과 이미지 다운로드/공유 버튼 클릭 시 호출되는 함수 (ActionSheet로 화질 선택)
  const handleDownloadImage = async () => {
    if (!resultImage) {
      return;
    }

    const hasPermission = await checkAndRequestPermission();
    if (!hasPermission) {
      return;
    }

    // 문구를 최소화합니다 (기획 요청).
    // 예전에는 한 줄에 워터마크·QR·초대코드·보너스까지 다 넣어 읽히지 않았습니다.
    // 선택지는 "무엇을 받는가" 만 남기고, 조건은 괄호 한 마디로 줄입니다.
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
          // 고화질 원본 저장 (광고 시청 후)
          Alert.alert(
            '고화질 다운받기',
            '짧은 광고를 보시면 워터마크 없는 고화질 원본이 저장됩니다.',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '광고 보고 저장',
                onPress: () => showRewardAd('HD_DOWNLOAD'),
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

  // 옷을 '선택/해제'하는 함수 (다중 선택 지원, 최대 3개 제한)
  const handleItemSelect = (clothingUrl: string) => {
    setSelectedClothingImages(prev => {
      if (prev.includes(clothingUrl)) {
        // 이미 선택된 경우 제거
        return prev.filter(url => url !== clothingUrl);
      } else {
        // 선택되지 않은 경우 추가 (최대 3개 제한)
        if (prev.length >= MAX_CLOTHING_SELECTION) {
          Toast.show({
            type: 'info',
            text1: t('selectionLimitTitle'),
            text2: t('selectionLimitMessage', { max: MAX_CLOTHING_SELECTION }),
          });
          return prev;
        }
        return [...prev, clothingUrl];
      }
    });
  };

  // 애니메이션을 위한 useEffect
  useEffect(() => {
    if (resultImage) {
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [resultImage, fadeAnim]);

  // 컴포넌트 마운트 시 하단 영역 애니메이션 초기화
  useEffect(() => {
    // 초기에는 패널이 접힌 상태로 시작 (하단에 반투명 스크롤바만 보임)
    // panelTranslateY가 변경될 수 있으므로 0.05 비율로 계산
    slideUpAnim.setValue(0.05);
  }, [slideUpAnim, panelTranslateY]);

  // 옷 선택 시에도 슬라이드 업 애니메이션 실행
  useEffect(() => {
    if (personImage) {
      // 사람 이미지가 선택된 상태에서 옷 선택 상태에 따라 애니메이션 실행
      if (selectedClothingImages.length > 0) {
        // 옷이 선택되면 슬라이드 업
        setIsPanelExpanded(true);
        RNAnimated.timing(slideUpAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        // 옷이 모두 해제되면 슬라이드 다운
        setIsPanelExpanded(false);
        RNAnimated.timing(slideUpAnim, {
          toValue: 0.05, // 완전히 내리지 않고 중간 정도로
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [selectedClothingImages.length, personImage, slideUpAnim]);

  // 드래그 핸들러
  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;

      // 드래그 방향과 속도에 따라 패널 상태 결정
      if (translationY > 50 || velocityY > 500) {
        // 아래로 드래그하면 패널 닫기
        setIsPanelExpanded(false);
        RNAnimated.timing(slideUpAnim, {
          toValue: 0.05,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else if (translationY < -50 || velocityY < -500) {
        // 위로 드래그하면 패널 열기
        setIsPanelExpanded(true);
        RNAnimated.timing(slideUpAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* 스타일 티켓 및 보상형 광고 충전 배지 (2단계 수익화/마케팅 적용) */}
      <View style={styles.fittingStatusContainer}>
        <View style={styles.fittingCountBadge}>
          {isDevBypassUser() || ticketBalance >= 9999 ? (
            <Text style={styles.fittingCountText}>
              DEV 무한 피팅{' '}
              <Text style={[styles.fittingCountNumber, styles.fittingCountNumberDev]}>
                999+장
              </Text>
            </Text>
          ) : (
            <Text style={styles.fittingCountText}>
              보유 티켓{' '}
              <Text
                style={[
                  styles.fittingCountNumber,
                  ticketBalance < TICKET_COST_FITTING && styles.fittingCountNumberLow,
                ]}>
                {ticketBalance}장
              </Text>
              <Text style={styles.ticketUnitHint}> · 1회 {TICKET_COST_FITTING}장</Text>
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.adRechargeButton}
          onPress={() => showRewardAd('RECHARGE')}
          activeOpacity={0.8}>
          <Text style={styles.adRechargeButtonText}>티켓 {TICKET_REWARD_AD}장 받기</Text>
        </TouchableOpacity>
      </View>

      {/* 메인 이미지 영역.
          아래 옷장 패널은 접혀도 PANEL_PEEK_HEIGHT 만큼 화면에 남아 있습니다.
          사진 영역을 화면 끝까지 잡으면 **합성 결과의 발목 쪽이 패널에 가립니다.**
          그래서 패널이 차지할 높이를 미리 비워 둡니다. */}
      <View style={styles.mainImageContainer}>
        <View style={[styles.imageStage, { marginBottom: PANEL_PEEK_HEIGHT }]}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <CodiPopLoadingAnimation />
          </View>
        ) : resultImage ? (
          <View style={styles.resultContainer}>
            <View ref={resultImageRef} collapsable={false} style={styles.captureContainer}>
              <RNAnimated.Image
                source={{ uri: resultImage }}
                style={[styles.mainImage, { opacity: fadeAnim }]}
                resizeMode="contain"
              />
              {/* CodiPop 바이럴 워터마크 배너 (QR코드 + 초대코드 합성) - 상시 마운트로 로고 캐시 유지 */}
              <CodiPopViralWatermark referralCode={userReferralCode} isVisible={isCapturing} />
            </View>
          </View>
        ) : personImage ? (
          <Image
            source={{ uri: personImage }}
            style={styles.mainImage}
            resizeMode="contain"
          />
        ) : (
          <TouchableOpacity
            style={styles.placeholderPerson}
            onPress={handleSelectPerson}>
            <Text style={styles.placeholderText}>
              + 사람 이미지를 선택하세요
            </Text>
          </TouchableOpacity>
        )}
        </View>

        {/* 내 사진 — 구글 쇼핑처럼 동그란 썸네일로 둡니다.
            "사람 변경"이라는 글씨 박스를 놓는 것보다,
            **지금 어떤 사진으로 입어보는 중인지**가 한눈에 보입니다.
            오른쪽 위는 '피팅 시작' 버튼 자리라 **왼쪽 위**에 둡니다. */}
        {personImage ? (
          <TouchableOpacity
            style={styles.personThumbWrapper}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="내 사진 변경"
            onPress={handlePersonMenu}>
            <Image source={{ uri: personImage }} style={styles.personThumb} />
          </TouchableOpacity>
        ) : null}

        {/* 결과 화면의 조작 버튼 — 구글 쇼핑 가상 피팅의 배치를 따릅니다.
            사진이 주인공이므로 글씨 박스 대신 **오른쪽에 원형 아이콘만** 세로로 둡니다.
            같은 기능을 훨씬 작은 면적으로 놓을 수 있어 사진이 가려지지 않습니다. */}
        {resultImage ? (
          <View style={[styles.resultActions, { bottom: PANEL_PEEK_HEIGHT + 16 }]}>
            <CircleIconButton label="공유하기" caption="공유" onPress={handleShareImage}>
              <ShareIcon size={22} />
            </CircleIconButton>
            <CircleIconButton
              label="갤러리에 저장"
              caption="저장"
              onPress={handleDownloadImage}>
              <DownloadIcon size={22} />
            </CircleIconButton>
            <CircleIconButton
              label="다른 옷 고르기"
              caption="다른 옷"
              onPress={openClosetForNextFitting}>
              <RefreshIcon size={22} />
            </CircleIconButton>
          </View>
        ) : null}

        {/* 피팅 시작 버튼.
            결과가 뜨면 이 버튼을 아예 숨겼던 탓에 결과 화면에서
            **다른 옷으로 다시 피팅할 방법이 화면에 없었습니다.**
            지금은 옷이 선택되어 있으면 결과가 떠 있어도 계속 보여 줍니다.

            선택이 0개일 때도 **결과 전에는 계속 띄웁니다.** 버튼이 아예 사라지면
            "여기서 뭘 해야 하지"가 되고, 눌렀을 때의 안내(`handleTryOn` 이 막습니다)가
            버튼이 없는 것보다 훨씬 친절합니다. */}
        {!resultImage || selectedClothingImages.length > 0 ? (
          <TouchableOpacity
            onPress={handleTryOn}
            activeOpacity={0.8}
            style={styles.tryOnButtonContainer}>
            <LinearGradient
              colors={['#FF6B9D', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tryOnButton}>
              <Text style={styles.tryOnButtonText}>
                {resultImage ? '이 옷으로 다시 피팅' : '피팅 시작'} (
                {selectedClothingImages.length}개 선택)
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 하단 옷장 영역 - 드래그 가능한 패널 */}
      <RNAnimated.View
        style={[
          styles.closetPanel,
          {
            height: panelHeight, // 동적 높이 적용
            transform: [{
              translateY: slideUpAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [panelTranslateY, 0], // 패널이 아래에서 위로 올라옴 (동적 계산)
              })
            }]
          }
        ]}
      >
        {/* 드래그 핸들 */}
        <PanGestureHandler
          ref={panGestureRef}
          onHandlerStateChange={onHandlerStateChange}
        >
          <View style={styles.dragHandle}>
            <View style={styles.dragIndicator} />
            <Text style={styles.closetTitle}>내 옷장</Text>
          </View>
        </PanGestureHandler>

        {/* 카테고리 네비게이션 - 조건부 렌더링 */}
        {isPanelExpanded && (
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setActiveCategory(item)}
                style={styles.categoryButton}>
                <Text
                  style={[
                    styles.categoryText,
                    activeCategory === item && styles.activeCategoryText,
                  ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 옷 아이템 리스트 - 조건부 렌더링 */}
        {isPanelExpanded && (
          <View style={styles.clothingListFlex}>
            {loadingCloset ? (
              <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={gridItems}
                numColumns={5}
                scrollEnabled={true}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                style={styles.clothingListFlex}
                keyExtractor={(item, index) => item.isAddButton ? 'add-button' : item.id}
                contentContainerStyle={[
                  styles.clothingGridContainer,
                  { paddingTop: 5, paddingBottom: 12 },
                ]}
                renderItem={({ item, index }) => {
                  // 첫 번째 아이템 (추가 버튼)
                  if (item.isAddButton) {
                    const isClosetFull = closetItems.length >= MAX_CLOSET_ITEMS;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.addClothingButton,
                          isClosetFull && styles.disabledAddClothingButton
                        ]}
                        onPress={isClosetFull ? undefined : handleSelectClothing}
                        disabled={isClosetFull}>
                        <Text style={[
                          styles.addClothingButtonText,
                          isClosetFull && styles.disabledAddClothingButtonText
                        ]}>
                          {isClosetFull ? '30/30' : '+'}
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  // 이미지 아이템
                  if (!item.imageUrl) return null;

                  const isSelected = selectedClothingImages.includes(item.imageUrl);
                  const canSelect = !isSelected && selectedClothingImages.length < MAX_CLOTHING_SELECTION;

                  return (
                    <TouchableOpacity
                      onPress={() => handleItemSelect(item.imageUrl!)}
                      style={[
                        styles.clothingItemContainer,
                        !canSelect && !isSelected && styles.disabledClothingItem,
                      ]}>
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={[
                          styles.clothingItem,
                          isSelected && styles.selectedClothingItem,
                        ]}
                        resizeMode="contain"
                        onLoadStart={() =>
                          setImageLoading(prev => ({ ...prev, [item.id]: true }))
                        }
                        onLoadEnd={() =>
                          setImageLoading(prev => ({ ...prev, [item.id]: false }))
                        }
                      />
                      {imageLoading[item.id] && (
                        <ActivityIndicator
                          style={StyleSheet.absoluteFill}
                          size="small"
                          color="#6A0DAD"
                        />
                      )}
                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <Text style={styles.selectedIndicatorText}>✓</Text>
                        </View>
                      )}
                      {!canSelect && !isSelected && (
                        <View style={styles.disabledOverlay}>
                          <Text style={styles.disabledText}>최대 2개</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        )}
      </RNAnimated.View>

      {/* 워크스루 오버레이 */}
      {workthroughStep !== WorkthroughStep.NONE && (
        <View style={styles.workthroughOverlay}>
          {/* 어두운 배경 */}
          <View style={styles.workthroughBackdrop} />

          {/* 단계 1: 사람 변경 버튼 하이라이트 */}
          {workthroughStep === WorkthroughStep.SELECT_PERSON && (
            <View style={styles.workthroughContent}>
              <View style={styles.workthroughTooltip}>
                <Text style={styles.workthroughTitle}>
                  1단계: 사람 이미지 선택
                </Text>
                <Text style={styles.workthroughDescription}>
                  먼저 사람 이미지를 선택해주세요.{'\n'}
                  왼쪽 상단의 "사람 변경" 버튼을 눌러{'\n'}
                  갤러리에서 사진을 선택할 수 있습니다.
                </Text>
                <TouchableOpacity
                  style={styles.workthroughButton}
                  onPress={handleWorkthroughNext}>
                  <Text style={styles.workthroughButtonText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 단계 2: 옷장 아이템 하이라이트 */}
          {workthroughStep === WorkthroughStep.SELECT_CLOTHING && (
            <View style={styles.workthroughContent}>
              <View style={[styles.workthroughTooltip, { bottom: 250 }]}>
                <Text style={styles.workthroughTitle}>
                  👕 2단계: 옷 선택
                </Text>
                <Text style={styles.workthroughDescription}>
                  아래 옷장에서 입을 옷을 선택해주세요.{'\n'}
                  옷을 탭하면 선택되며, 최대 2개까지 선택할 수 있습니다.
                </Text>
                <TouchableOpacity
                  style={styles.workthroughButton}
                  onPress={handleWorkthroughNext}>
                  <Text style={styles.workthroughButtonText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 단계 3: 피팅 시작 버튼 하이라이트 */}
          {workthroughStep === WorkthroughStep.START_FITTING && (
            <View style={styles.workthroughContent}>
              <View style={styles.workthroughTooltip}>
                <Text style={styles.workthroughTitle}>
                  🚀 3단계: 피팅 시작
                </Text>
                <Text style={styles.workthroughDescription}>
                  모든 준비가 완료되었습니다!{'\n'}
                  오른쪽 상단의 "피팅 시작" 버튼을 눌러{'\n'}
                  AI로 코디를 완성하세요.
                </Text>
                <TouchableOpacity
                  style={styles.workthroughButton}
                  onPress={handleWorkthroughNext}>
                  <Text style={styles.workthroughButtonText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fittingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    zIndex: 5,
  },
  fittingCountBadge: {
    // 테두리를 없애고 배경만 옅게 — 상단에 박스가 너무 많다는 지적 반영
    backgroundColor: '#F6EEFF',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fittingCountText: {
    fontSize: 13,
    color: '#4A1A7A',
    fontWeight: '600',
  },
  fittingCountNumber: {
    fontWeight: '800',
    color: '#6A0DAD',
  },
  fittingCountNumberLow: {
    color: '#E53E3E',
  },
  adRechargeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fittingCountNumberDev: {
    color: '#6A0DAD',
  },
  personThumbWrapper: {
    position: 'absolute',
    top: 10,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
  personThumb: {
    width: '100%',
    height: '100%',
  },
  // 결과 화면 오른쪽에 세로로 놓이는 원형 버튼 묶음.
  // bottom 은 옷장 패널이 접혔을 때 남는 높이만큼 인라인으로 올려 줍니다 —
  // 고정값으로 두면 패널이 버튼을 덮습니다.
  resultActions: {
    position: 'absolute',
    right: 16,
    gap: 10,
    alignItems: 'center',
  },
  ticketUnitHint: {
    fontSize: 11,
    color: '#6A0DAD',
    fontWeight: '500',
  },
  adRechargeButtonText: {
    // 보라 박스 대신 글씨 색만 (기획 요청)
    color: '#6A0DAD',
    fontSize: 13,
    fontWeight: '700',
  },
  // 메인 이미지 영역 - 화면 전체를 차지
  mainImageContainer: {
    flex: 1,
    position: 'relative',
  },
  // 사진이 실제로 그려지는 칸. 아래쪽 여백(marginBottom)으로 옷장 패널 자리를 비웁니다.
  imageStage: {
    flex: 1,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  processingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '110%',
    position: 'relative',
  },
  processingText: {
    fontSize: 18,
    color: '#6A0DAD',
    fontWeight: 'bold',
    marginTop: 16,
    zIndex: 10,
    textAlign: 'center',
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
  resultContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  captureContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  placeholderPerson: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
  },
  placeholderText: {
    fontSize: 18,
    color: 'gray',
    fontWeight: 'bold',
  },
  tryOnButtonContainer: {
    position: 'absolute',
    top: 10,
    right: 20,
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderRadius: 20,
  },
  tryOnButton: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tryOnButtonContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  tryOnButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.3,
    textAlign: 'center',
    lineHeight: 20,
    width: '100%',
  },
  remainingCountText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 12,
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
    width: '100%',
  },
  // 하단 옷장 패널
  closetPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // height는 동적으로 설정됨 (panelHeight)
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    justifyContent: 'flex-start', // 내용을 상단에 배치
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#C0C0C0',
    borderRadius: 2,
    marginBottom: 8,
  },
  closetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingVertical: 5, // 여백 축소 (10 → 5)
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  categoryButton: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  categoryText: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeCategoryText: {
    fontWeight: 'bold',
    color: '#000000',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  clothingListFlex: {
    flex: 1,
    minHeight: 0,
  },
  clothingListContainer: {
    paddingTop: 5, // 상단 여백만 유지
    paddingBottom: 5, // 하단 여백 최소화
  },
  clothingGridContainer: {
    paddingHorizontal: 10,
    paddingBottom: 5, // 하단 여백 최소화
  },
  clothingRowWrapper: {
    justifyContent: 'flex-start',
  },
  clothingItem: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  selectedClothingItem: {
    borderWidth: 2,
    borderColor: '#6A0DAD',
  },
  addClothingButton: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    margin: ITEM_MARGIN,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  addClothingButtonText: {
    fontSize: 24,
    color: '#999',
  },
  disabledAddClothingButton: {
    backgroundColor: '#E0E0E0',
    borderColor: '#C0C0C0',
  },
  disabledAddClothingButtonText: {
    fontSize: 10,
    color: '#999',
    fontWeight: 'bold',
  },
  clothingItemContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: ITEM_MARGIN,
  },
  disabledClothingItem: {
    opacity: 0.5,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#6A0DAD',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  disabledText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // 워크스루 스타일
  workthroughOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  workthroughBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  workthroughContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workthroughTooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1002,
  },
  workthroughTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  workthroughDescription: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  workthroughButton: {
    backgroundColor: '#6A0DAD',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6A0DAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  workthroughButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default VirtualFittingScreen;
