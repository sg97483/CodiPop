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

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Shoes', 'Acc'];
const MAX_CLOTHING_SELECTION = 2; // 최대 옷 선택 개수
const MAX_CLOSET_ITEMS = 30; // 옷장 최대 아이템 개수

// ✅ ClosetItem 타입을 파일 상단에 정의하여 재사용합니다.
interface ClosetItem {
  id: string;
  imageUrl: string;
  category?: string; // 카테고리 필드는 선택적
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
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loadingCloset, setLoadingCloset] = useState(true);
  const [selectedClothingImages, setSelectedClothingImages] = useState<string[]>([]);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideUpAnim = useRef(new RNAnimated.Value(0)).current; // 하단 영역 슬라이드 업 애니메이션
  const panGestureRef = useRef<PanGestureHandler>(null);

  const [imageLoading, setImageLoading] = useState<{[key: string]: boolean}>(
    {},
  ); // ✅ 이미지 로딩 state 추가

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
    if (activeCategory === 'All') {
      return closetItems;
    }
    return closetItems.filter(item => item.category === activeCategory);
  }, [activeCategory, closetItems]);

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
      const options = ['Tops', 'Bottoms', 'Shoes', 'Acc', '취소'];
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

  // '피팅 시작' 버튼을 눌렀을 때 실행될 함수
  const handleTryOn = async () => {
    if (!personImage || selectedClothingImages.length === 0) {
      Alert.alert('알림', '먼저 사람과 의류 이미지를 모두 선택해주세요.');
      return;
    }
    
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

  // 결과 이미지를 다운로드하는 함수
  const handleDownloadImage = async () => {
    if (!resultImage) {
      return;
    }
    // ... (이전과 동일한 권한 요청 로직)
    const localFile = `${RNFS.CachesDirectoryPath}/${Date.now()}_result.jpeg`;
    try {
      await RNFS.downloadFile({fromUrl: resultImage, toFile: localFile})
        .promise;
      await CameraRoll.save(`file://${localFile}`, {type: 'photo'});
      Toast.show({type: 'success', text1: '이미지를 갤러리에 저장했습니다.'});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: '저장 실패',
        text2: '이미지를 저장하는 데 실패했습니다.',
      });
    } finally {
      await RNFS.unlink(localFile).catch(err =>
        console.error('임시 파일 삭제 실패', err),
      );
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
    slideUpAnim.setValue(0.05);
  }, [slideUpAnim]);

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
            <RNAnimated.Image
              source={{uri: resultImage}}
              style={[styles.mainImage, {opacity: fadeAnim}]}
              resizeMode="cover"
            />
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
            <TouchableOpacity style={styles.newTryOnButtonLeft} onPress={() => {
              setResultImage(null);
              setPersonImage(null);
              setSelectedClothingImages([]);
              slideUpAnim.setValue(0);
            }}>
              <Text style={styles.newTryOnButtonText}>새 피팅 시작 🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadImage}>
              <Text style={styles.downloadButtonText}>📥 다운로드</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.tryOnButton} onPress={handleTryOn}>
            <Text style={styles.tryOnButtonText}>
              피팅 시작 🚀 ({selectedClothingImages.length}개 선택)
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 하단 옷장 영역 - 드래그 가능한 패널 */}
      <RNAnimated.View 
        style={[
          styles.closetPanel,
          {
            transform: [{
              translateY: slideUpAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [170, 0], // 패널이 아래에서 위로 올라옴
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
            <FlatList
              data={CATEGORIES}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item}
              renderItem={({item}) => (
                <TouchableOpacity onPress={() => setActiveCategory(item)}>
                  <Text
                    style={[
                      styles.categoryText,
                      activeCategory === item && styles.activeCategoryText,
                    ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{paddingHorizontal: 20}}
            />
          </View>
        )}

        {/* 옷 아이템 리스트 - 조건부 렌더링 */}
        {isPanelExpanded && (
          <View style={styles.clothingListContainer}>
          {loadingCloset ? (
            <ActivityIndicator style={{marginTop: 20}} />
          ) : (
            <FlatList
              data={displayedItems}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              ListHeaderComponent={() => {
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
              }}
              renderItem={({item}) => {
                const isSelected = selectedClothingImages.includes(item.imageUrl);
                const canSelect = !isSelected && selectedClothingImages.length < MAX_CLOTHING_SELECTION;
                
                return (
                  <TouchableOpacity
                    onPress={() => handleItemSelect(item.imageUrl)}
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
              contentContainerStyle={{
                paddingLeft: 10,
              }}
            />
          )}
          </View>
        )}
      </RNAnimated.View>
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
  resultContainer: {
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
  tryOnButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#6A0DAD',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#6A0DAD',
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
    color: '#6A0DAD',
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
    paddingVertical: 12,
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
    borderWidth: 1,
    borderColor: 'rgba(106, 13, 173, 0.2)',
  },
  downloadButton: {
    backgroundColor: '#6A0DAD',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 130,
    justifyContent: 'center',
    shadowColor: '#6A0DAD',
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
    height: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    paddingVertical: 10,
  },
  categoryText: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeCategoryText: {
    fontWeight: 'bold',
    color: '#000000',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  clothingListContainer: {
    paddingVertical: 10,
  },
  clothingItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#E0E0E0',
  },
  selectedClothingItem: {
    borderWidth: 2,
    borderColor: '#6A0DAD',
  },
  addClothingButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
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
    position: 'relative',
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
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 8,
  },
  disabledText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default VirtualFittingScreen;
