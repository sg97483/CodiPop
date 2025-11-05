// src/screens/VirtualFittingScreen.tsx

import React, {useState, useEffect, useMemo, useRef} from 'react';
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
  ScrollView,
  Animated as RNAnimated,
  Dimensions,
} from 'react-native';
import {PanGestureHandler, State} from 'react-native-gesture-handler';
import {
  useNavigation,
  useIsFocused,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import {launchImageLibrary} from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import Toast from 'react-native-toast-message';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import {useActionSheet} from '@expo/react-native-action-sheet';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import {captureRef} from 'react-native-view-shot';
import {check, request, PERMISSIONS, RESULTS, openSettings, Permission} from 'react-native-permissions';

const CATEGORIES = ['ALL', 'TOPS', 'BOTTOMS', 'SHOES', 'OUTER'];
const MAX_CLOTHING_SELECTION = 2; // 최대 옷 선택 개수
const MAX_CLOSET_ITEMS = 30; // 옷장 최대 아이템 개수
const MAX_DAILY_FITTING = 5; // 하루 최대 이미지 합성 횟수

const {width: SCREEN_WIDTH} = Dimensions.get('window');
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
interface ClosetItem {
  id: string;
  imageUrl: string;
  category?: string; // 카테고리 필드는 선택적
}

interface GridItem {
  id: string;
  isAddButton?: boolean;
  imageUrl?: string;
  category?: string;
}

const VirtualFittingScreen = () => {
  const navigation = useNavigation<any>();
  const route =
    useRoute<RouteProp<{params: {clothingUrl?: string}}, 'params'>>();
  const isFocused = useIsFocused();
  const user = auth().currentUser;
  const {showActionSheetWithOptions} = useActionSheet(); // ✅ 훅 사용

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

  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideUpAnim = useRef(new RNAnimated.Value(0)).current; // 하단 영역 슬라이드 업 애니메이션
  const panGestureRef = useRef<PanGestureHandler>(null);

  const [imageLoading, setImageLoading] = useState<{[key: string]: boolean}>(
    {},
  ); // ✅ 이미지 로딩 state 추가
  const [remainingCount, setRemainingCount] = useState<number>(MAX_DAILY_FITTING); // 남은 일일 사용 횟수

  // 워크스루 초기화 - 화면 포커스 시 체크
  useEffect(() => {
    if (isFocused) {
      checkAndStartWorkthrough();
      // 남은 일일 사용 횟수 업데이트
      checkDailyUsage().then(({remainingCount}) => {
        setRemainingCount(remainingCount);
      });
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
      setIsPanelExpanded(true);
      RNAnimated.timing(slideUpAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
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
    if (isFocused && route.params?.clothingUrl) {
      setSelectedClothingImages([route.params.clothingUrl]);
      navigation.setParams({clothingUrl: undefined});
    }
  }, [isFocused, route.params?.clothingUrl, navigation]);

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
          querySnapshot.forEach(doc =>
            items.push({id: doc.id, ...(doc.data() as {imageUrl: string})}),
          );
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
    return [{id: 'add-button', isAddButton: true}, ...displayedItems.map(item => ({
      id: item.id,
      imageUrl: item.imageUrl,
      category: item.category,
    }))];
  }, [displayedItems]);

  // 아이템 개수에 따른 패널 높이 계산
  const panelHeight = useMemo(() => {
    const DRAG_HANDLE_HEIGHT = 50; // 드래그 핸들 높이
    const CATEGORY_HEIGHT = 40; // 카테고리 영역 높이
    const ROW_HEIGHT = ITEM_SIZE + ITEM_MARGIN * 2; // 각 줄 높이
    const PADDING_TOP_BOTTOM = 10; // 상하 여백
    const BOTTOM_PADDING = 12; // 하단 여백 (15 → 12)
    const EXTRA_SPACE = 7; // 추가 여백 (10 → 7)
    
    const numRows = Math.ceil(gridItems.length / ITEMS_PER_ROW);
    const itemsHeight = numRows * ROW_HEIGHT;
    
    // 최소 높이 보장, 최대 높이 제한
    const calculatedHeight = DRAG_HANDLE_HEIGHT + CATEGORY_HEIGHT + itemsHeight + PADDING_TOP_BOTTOM + BOTTOM_PADDING + EXTRA_SPACE;
    return Math.max(200, Math.min(calculatedHeight, 350)); // 최소 200, 최대 350
  }, [gridItems.length]);

  // 패널 translateY 계산 (높이의 대부분만 올라오도록)
  const panelTranslateY = useMemo(() => {
    return panelHeight * 0.8; // 높이의 80% 정도만 올라오도록
  }, [panelHeight]);

  // 사람 이미지 선택 함수
  const handleSelectPerson = async () => {
    const result = await launchImageLibrary({mediaType: 'photo'});
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
      // 현재 옷장 아이템 개수 확인
      const closetSnapshot = await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('closet')
        .get();
      
      const currentItemCount = closetSnapshot.size;
      
      // 30개 제한 확인
      if (currentItemCount >= MAX_CLOSET_ITEMS) {
        Toast.show({
          type: 'error',
          text1: '옷장이 가득참',
          text2: `최대 ${MAX_CLOSET_ITEMS}개의 아이템만 저장할 수 있습니다.`,
        });
        return;
      }
      
      // Firebase Storage에 이미지 업로드
      const downloadUrl = await uploadImageToStorage(imageUrl, 'closet');
      
      // Firestore에 메타데이터 저장
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('closet')
        .add({
          imageUrl: downloadUrl, // Firebase Storage URL 사용
          category: category,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      
      Toast.show({type: 'success', text1: '옷장에 추가되었습니다!'});
      setSelectedClothingImages([downloadUrl]); // 저장 후 바로 선택 상태로
    } catch (error) {
      console.error('옷장 저장 실패:', error);
      Toast.show({
        type: 'error',
        text1: '오류',
        text2: '옷장에 저장하는 데 실패했습니다.',
      });
    }
  };

  // 갤러리에서 새 옷을 선택하고 저장하는 함수
  const handleSelectClothing = async () => {
    const result = await launchImageLibrary({mediaType: 'photo'});
    if (result.assets && result.assets[0].uri) {
      const newClothingUrl = result.assets[0].uri;

      // ✅ [수정] Alert를 ActionSheet로 변경
      const options = ['TOPS', 'BOTTOMS', 'SHOES', 'OUTER', '취소'];
      const cancelButtonIndex = 4;

      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: '이 옷을 어떤 카테고리에 저장할까요?',
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
  };

  // 일일 사용 횟수 확인 및 관리 함수
  const checkDailyUsage = async (): Promise<{canUse: boolean; remainingCount: number}> => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
      const storageKey = 'virtualFittingDailyUsage';
      const storedData = await AsyncStorage.getItem(storageKey);
      
      if (!storedData) {
        // 저장된 데이터가 없으면 오늘 처음 사용
        await AsyncStorage.setItem(storageKey, JSON.stringify({date: today, count: 0}));
        return {canUse: true, remainingCount: MAX_DAILY_FITTING};
      }
      
      const {date, count} = JSON.parse(storedData);
      
      // 날짜가 다르면 리셋 (새로운 하루)
      if (date !== today) {
        await AsyncStorage.setItem(storageKey, JSON.stringify({date: today, count: 0}));
        return {canUse: true, remainingCount: MAX_DAILY_FITTING};
      }
      
      // 오늘 날짜이고 사용 횟수 확인
      if (count >= MAX_DAILY_FITTING) {
        return {canUse: false, remainingCount: 0};
      }
      
      return {canUse: true, remainingCount: MAX_DAILY_FITTING - count};
    } catch (error) {
      console.error('일일 사용 횟수 확인 실패:', error);
      // 에러 발생 시 사용 허용 (서비스 중단 방지)
      return {canUse: true, remainingCount: MAX_DAILY_FITTING};
    }
  };

  // 일일 사용 횟수 증가 함수
  const incrementDailyUsage = async (): Promise<void> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = 'virtualFittingDailyUsage';
      const storedData = await AsyncStorage.getItem(storageKey);
      
      if (!storedData) {
        await AsyncStorage.setItem(storageKey, JSON.stringify({date: today, count: 1}));
        return;
      }
      
      const {date, count} = JSON.parse(storedData);
      
      // 날짜가 다르면 새로 시작
      if (date !== today) {
        await AsyncStorage.setItem(storageKey, JSON.stringify({date: today, count: 1}));
        return;
      }
      
      // 오늘 날짜면 횟수 증가
      await AsyncStorage.setItem(storageKey, JSON.stringify({date: today, count: count + 1}));
    } catch (error) {
      console.error('일일 사용 횟수 증가 실패:', error);
    }
  };

  // '피팅 시작' 버튼을 눌렀을 때 실행될 함수
  const handleTryOn = async () => {
    if (!personImage || selectedClothingImages.length === 0) {
      Alert.alert('알림', '먼저 사람과 의류 이미지를 모두 선택해주세요.');
      return;
    }

    // 일일 사용 횟수 확인
    const {canUse, remainingCount: currentRemaining} = await checkDailyUsage();
    if (!canUse) {
      setRemainingCount(0);
      Alert.alert(
        '일일 사용 한도 초과',
        `하루 최대 ${MAX_DAILY_FITTING}회까지 사용할 수 있습니다.\n내일 다시 시도해주세요.`,
        [{text: '확인', style: 'default'}]
      );
      return;
    }
    setRemainingCount(currentRemaining);
    
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

    try {
      const response = await fetch(
        'https://codipop-backend.onrender.com/try-on',
        {
          // 🚨 IP 주소 확인
          method: 'POST',
          body: formData,
          headers: {'Content-Type': 'multipart/form-data'},
        },
      );
      const result = await response.json();
      if (result.success && result.imageUrl) {
        // 이미지 합성 성공 시 일일 사용 횟수 증가
        await incrementDailyUsage();
        // 남은 횟수 업데이트
        const {remainingCount: newRemaining} = await checkDailyUsage();
        setRemainingCount(newRemaining);
        
        setResultImage(result.imageUrl);
        Toast.show({type: 'success', text1: '이미지 합성이 완료되었습니다.'});
        if (user) {
          // 기존 recentResults에도 저장 (호환성 유지)
          firestore()
            .collection('users')
            .doc(user.uid)
            .collection('recentResults')
            .add({
              imageUrl: result.imageUrl,
              createdAt: firestore.FieldValue.serverTimestamp(),
            });
          
          // 새로운 Recent Codi 컬렉션에도 저장
          firestore()
            .collection('users')
            .doc(user.uid)
            .collection('recentCodi')
            .add({
              imageUrl: result.imageUrl,
              createdAt: firestore.FieldValue.serverTimestamp(),
              isLiked: false,
            });
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: '오류',
        text2: '이미지 합성에 실패했습니다.',
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

  // 결과 이미지를 다운로드하는 함수 (워터마크 포함)
  const handleDownloadImage = async () => {
    if (!resultImage) {
      return;
    }

    // 권한 체크 및 요청
    const hasPermission = await checkAndRequestPermission();
    if (!hasPermission) {
      return;
    }

    let localFile: string | null = null;
    try {
      // 워터마크가 포함된 이미지 캡처
      if (resultImageRef.current) {
        // 워터마크를 임시로 표시하고 캡처
        setIsCapturing(true);
        // 워터마크가 렌더링될 시간을 주기 위해 약간의 딜레이
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const uri = await captureRef(resultImageRef.current, {
          format: 'jpg',
          quality: 0.9,
        });
        
        setIsCapturing(false);
        
        await CameraRoll.save(uri, {type: 'photo'});
        Toast.show({type: 'success', text1: '이미지를 갤러리에 저장했습니다.'});
      } else {
        // 캡처 실패 시 원본 이미지 다운로드
        localFile = `${RNFS.CachesDirectoryPath}/${Date.now()}_result.jpeg`;
        await RNFS.downloadFile({fromUrl: resultImage, toFile: localFile})
          .promise;
        await CameraRoll.save(`file://${localFile}`, {type: 'photo'});
        Toast.show({type: 'success', text1: '이미지를 갤러리에 저장했습니다.'});
      }
    } catch (error: any) {
      console.error('저장 실패:', error);
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
          text1: '저장 실패',
          text2: '이미지를 저장하는 데 실패했습니다.',
        });
      }
    } finally {
      if (localFile) {
        await RNFS.unlink(localFile).catch(err =>
          console.error('임시 파일 삭제 실패', err),
        );
      }
    }
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
            text1: '선택 제한',
            text2: `최대 ${MAX_CLOTHING_SELECTION}개의 옷만 선택할 수 있습니다.`,
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
      const {translationY, velocityY} = event.nativeEvent;
      
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
    <SafeAreaView style={styles.container}>
      {/* 메인 이미지 영역 - 화면 전체를 차지 */}
      <View style={styles.mainImageContainer}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <LottieView
              source={require('../assets/animations/Bubbles.json')}
              autoPlay
              loop
              style={{width: 300, height: 300}}
            />
            <Text style={styles.processingText}>최신 AI 기술로 코디 진행 중...</Text>
          </View>
        ) : resultImage ? (
          <View style={styles.resultContainer}>
            <View ref={resultImageRef} collapsable={false} style={styles.captureContainer}>
              <RNAnimated.Image
                source={{uri: resultImage}}
                style={[styles.mainImage, {opacity: fadeAnim}]}
                resizeMode="cover"
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
        ) : personImage ? (
          <Image
            source={{uri: personImage}}
            style={styles.mainImage}
            resizeMode="cover"
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
        
        {/* 사람 변경 버튼 - 합성 결과가 아닐 때만 표시 */}
        {!resultImage && (
          <TouchableOpacity
            style={styles.changePersonButton}
            onPress={handleSelectPerson}>
            <Text style={styles.changePersonText}>👤 사람 변경</Text>
          </TouchableOpacity>
        )}

        {/* 피팅 버튼들 */}
        {resultImage ? (
          <View style={styles.resultButtonContainer}>
            <TouchableOpacity 
              style={styles.newTryOnButtonLeft} 
              onPress={() => {
                setResultImage(null);
                setPersonImage(null);
                setSelectedClothingImages([]);
                slideUpAnim.setValue(0);
              }}>
              <Text style={styles.newTryOnButtonText}>새 피팅 시작 🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleDownloadImage}
              activeOpacity={0.8}
              style={styles.downloadButtonContainer}>
              <LinearGradient
                colors={['#FF6B9D', '#8B5CF6']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.downloadButton}>
                <Text style={styles.downloadButtonText}>📥 다운로드</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            onPress={handleTryOn}
            activeOpacity={0.8}
            style={styles.tryOnButtonContainer}>
            <LinearGradient
              colors={['#FF6B9D', '#8B5CF6']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.tryOnButton}>
              <Text style={styles.tryOnButtonText}>
                피팅 시작 ({selectedClothingImages.length}개 선택)
                {'\n'}
                <Text style={styles.remainingCountText}>
                  남은 횟수: {remainingCount}회 (매일 {MAX_DAILY_FITTING}회 무료)
                </Text>
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
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
          <>
          {loadingCloset ? (
            <ActivityIndicator style={{marginTop: 20}} />
          ) : (
            <FlatList
              data={gridItems}
              numColumns={5}
              scrollEnabled={true}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyExtractor={(item, index) => item.isAddButton ? 'add-button' : item.id}
              contentContainerStyle={[
                styles.clothingGridContainer,
                {flexGrow: 0, paddingTop: 5, paddingBottom: 5}, // 필요한 만큼만 공간 차지
              ]}
              renderItem={({item, index}) => {
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
                      source={{uri: item.imageUrl}}
                      style={[
                        styles.clothingItem,
                        isSelected && styles.selectedClothingItem,
                      ]}
                      resizeMode="cover"
                      onLoadStart={() =>
                        setImageLoading(prev => ({...prev, [item.id]: true}))
                      }
                      onLoadEnd={() =>
                        setImageLoading(prev => ({...prev, [item.id]: false}))
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
          </>
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
              <View
                style={[
                  styles.workthroughHighlight,
                  {
                    top: 50,
                    left: 20,
                    width: 140,
                    height: 50,
                  },
                ]}
              />
              <View style={styles.workthroughTooltip}>
                <Text style={styles.workthroughTitle}>
                  👤 1단계: 사람 이미지 선택
                </Text>
                <Text style={styles.workthroughDescription}>
                  먼저 사람 이미지를 선택해주세요.{'\n'}
                  왼쪽 상단의 "👤 사람 변경" 버튼을 눌러{'\n'}
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
              <View style={[styles.workthroughTooltip, {bottom: 250}]}>
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
              <View
                style={[
                  styles.workthroughHighlight,
                  {
                    top: 50,
                    right: 20,
                    width: 200,
                    height: 50,
                  },
                ]}
              />
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
  // 메인 이미지 영역 - 화면 전체를 차지
  mainImageContainer: {
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
  changePersonButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  changePersonText: {
    color: '#333',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.3,
  },
  tryOnButtonContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  tryOnButton: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tryOnButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  remainingCountText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 12,
    opacity: 0.9,
  },
  newTryOnButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newTryOnButtonText: {
    color: '#333',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.3,
  },
  resultButtonContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  newTryOnButtonLeft: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 130,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  downloadButtonContainer: {
    // 컨테이너 스타일은 없음 (resultButtonContainer 내부 위치)
  },
  downloadButton: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 130,
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  downloadButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.3,
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
    shadowOffset: {width: 0, height: -2},
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
  workthroughHighlight: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#6A0DAD',
    borderRadius: 12,
    shadowColor: '#6A0DAD',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1001,
  },
  workthroughTooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
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
    shadowOffset: {width: 0, height: 4},
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
