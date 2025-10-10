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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
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

const CATEGORIES = ['내 옷장', 'ALL', 'TOP', 'PANTS', 'SKIRT', 'DRESS', 'ACC'];
const MAX_CLOTHING_SELECTION = 3; // 최대 옷 선택 개수

// 탄산 거품 애니메이션 컴포넌트
const BubbleAnimation = () => {
  const bubbles = Array.from({length: 16}, (_, i) => ({
    id: i,
    translateY: useSharedValue(0),
    opacity: useSharedValue(0),
    scale: useSharedValue(0.5),
  }));

  useEffect(() => {
    const startAnimation = () => {
      bubbles.forEach((bubble, index) => {
        const delay = index * 150; // 각 거품마다 150ms씩 지연 (더 빠르게)
        
        setTimeout(() => {
          // 무한 반복 애니메이션
          bubble.translateY.value = withRepeat(
            withTiming(-300, {
              duration: 2000,
              easing: Easing.out(Easing.cubic),
            }),
            -1,
            false
          );
          
          bubble.opacity.value = withRepeat(
            withSequence(
              withTiming(1, {duration: 300}),
              withTiming(0, {duration: 1700})
            ),
            -1,
            false
          );
          
          bubble.scale.value = withRepeat(
            withSequence(
              withTiming(1, {duration: 300}),
              withTiming(0.8, {duration: 1700})
            ),
            -1,
            false
          );
        }, delay);
      });
    };

    startAnimation();
    
    // 3초마다 새로운 애니메이션 사이클 시작
    const interval = setInterval(startAnimation, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.bubbleContainer}>
      {bubbles.map((bubble, index) => {
        const animatedStyle = useAnimatedStyle(() => ({
          transform: [
            {translateY: bubble.translateY.value},
            {scale: bubble.scale.value},
          ],
          opacity: bubble.opacity.value,
        }));

        return (
          <Animated.View
            key={bubble.id}
            style={[
              styles.bubble,
              {
                left: 15 + (index % 5) * 70, // 5열로 배치
                bottom: 40 + (index % 3) * 25, // 3행으로 배치
              },
              animatedStyle,
            ]}
          />
        );
      })}
    </View>
  );
};

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
  const [activeCategory, setActiveCategory] = useState('내 옷장');
  const [loadingCloset, setLoadingCloset] = useState(true);
  const [selectedClothingImages, setSelectedClothingImages] = useState<string[]>([]);

  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideUpAnim = useRef(new RNAnimated.Value(0)).current; // 하단 영역 슬라이드 업 애니메이션

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
    if (activeCategory === 'ALL' || activeCategory === '내 옷장') {
      return closetItems;
    }
    // ✅ 주석을 제거하여 필터링 로직을 활성화합니다.
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
      const options = ['TOP', 'PANTS', 'SKIRT', 'DRESS', 'ACC', '취소'];
      const cancelButtonIndex = 5;

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
          firestore()
            .collection('users')
            .doc(user.uid)
            .collection('recentResults')
            .add({
              imageUrl: result.imageUrl,
              createdAt: firestore.FieldValue.serverTimestamp(),
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
    // 사람 이미지가 이미 선택되어 있다면 애니메이션을 완료 상태로 설정
    if (personImage) {
      slideUpAnim.setValue(0.7); // 옷 선택 전에는 중간 정도 위치로 설정
    } else {
      slideUpAnim.setValue(0.3); // 사람 이미지가 없어도 하단 영역이 보이도록 설정
    }
  }, [personImage, slideUpAnim]);

  // 옷 선택 시에도 슬라이드 업 애니메이션 실행
  useEffect(() => {
    if (personImage) {
      // 사람 이미지가 선택된 상태에서 옷 선택 상태에 따라 애니메이션 실행
      if (selectedClothingImages.length > 0) {
        // 옷이 선택되면 슬라이드 업
        RNAnimated.timing(slideUpAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        // 옷이 모두 해제되면 슬라이드 다운
        RNAnimated.timing(slideUpAnim, {
          toValue: 0.5, // 완전히 내리지 않고 중간 정도로
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [selectedClothingImages.length, personImage, slideUpAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topContainer}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <BubbleAnimation />
            <Text style={styles.processingText}>최신 AI 기술로 코디 진행 중...</Text>
            <Text style={styles.processingSubText}>Gemini 2.5 Flash로 완벽한 가상 피팅</Text>
          </View>
        ) : resultImage ? (
          <View style={styles.resultContainer}>
            <TouchableOpacity onPress={handleDownloadImage}>
              <RNAnimated.Image
                source={{uri: resultImage}}
                style={[styles.resultImage, {opacity: fadeAnim}]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        ) : personImage ? (
          <Image
            source={{uri: personImage}}
            style={styles.resultImage}
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
        <TouchableOpacity
          style={styles.changePersonButton}
          onPress={handleSelectPerson}>
          <Text style={styles.changePersonText}>👤 사람 변경</Text>
        </TouchableOpacity>
        {resultImage ? (
          <TouchableOpacity style={styles.newTryOnButton} onPress={() => {
            setResultImage(null);
            setPersonImage(null);
            setSelectedClothingImages([]);
            // 새 피팅 시작 시 애니메이션 초기화
            slideUpAnim.setValue(0);
          }}>
            <Text style={styles.newTryOnButtonText}>새 피팅 시작 🔄</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.tryOnButton} onPress={handleTryOn}>
            <Text style={styles.tryOnButtonText}>
              피팅 시작 🚀 ({selectedClothingImages.length}개 선택)
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bottomContainer}>
        {/* 선택된 아이템들을 표시하는 섹션 */}
        {selectedClothingImages.length > 0 && (
          <View style={styles.selectedItemsContainer}>
            <View style={styles.selectedItemsHeader}>
              <Text style={styles.selectedItemsTitle}>
                선택된 아이템 ({selectedClothingImages.length}/{MAX_CLOTHING_SELECTION})
              </Text>
              <Text style={styles.selectionLimitText}>
                최대 {MAX_CLOTHING_SELECTION}개까지 선택 가능
              </Text>
            </View>
            <FlatList
              data={selectedClothingImages}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `${item}_${index}`}
              renderItem={({item, index}) => (
                <View style={styles.selectedItemWrapper}>
                  <Image
                    source={{uri: item}}
                    style={styles.selectedItemImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeItemButton}
                    onPress={() => handleItemSelect(item)}>
                    <Text style={styles.removeItemText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={{paddingHorizontal: 10}}
            />
          </View>
        )}
        
        <View style={styles.categoryListContainer}>
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

        <View style={styles.clothingListContainer}>
          {loadingCloset ? (
            <ActivityIndicator style={{marginTop: 20}} />
          ) : (
            <FlatList
              data={displayedItems}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              ListHeaderComponent={() => (
                <TouchableOpacity
                  style={styles.addClothingButton}
                  onPress={handleSelectClothing}>
                  <Text style={styles.addClothingButtonText}>+</Text>
                </TouchableOpacity>
              )}
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
                        <Text style={styles.disabledText}>최대 3개</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{
                paddingLeft: 10,
                paddingTop: 10,
                paddingBottom: 10,
              }}
            />
          )}
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  scrollContainer: {flex: 1},
  scrollContent: {flexGrow: 1},
  topContainer: {
    height: 400, // 고정 높이로 변경 (flex 대신)
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  processingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
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
  processingSubText: {
    fontSize: 14,
    color: '#6A0DAD',
    fontWeight: '500',
    marginTop: 8,
    zIndex: 10,
    textAlign: 'center',
    opacity: 0.8,
  },
  bubbleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(106, 13, 173, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(106, 13, 173, 0.6)',
  },
  resultContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  resultImage: {width: '100%', height: '100%'},
  resultOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(106, 13, 173, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resultSuccessText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultSubText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
  },
  placeholderPerson: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  placeholderText: {fontSize: 18, color: 'gray', fontWeight: 'bold'},
  changePersonButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changePersonText: {color: 'white', fontWeight: 'bold'},
  bottomContainer: {
    minHeight: 300, // 최소 높이 설정 (flex 대신)
    borderTopWidth: 1, 
    borderTopColor: '#E0E0E0',
    paddingBottom: 20, // 하단 패딩 추가
  },
  categoryListContainer: {paddingTop: 10},
  clothingListContainer: {flex: 1},
  categoryText: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    fontSize: 16,
    color: 'gray',
  },
  activeCategoryText: {
    fontWeight: 'bold',
    color: '#000000',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  clothingItem: {
    width: 100,
    height: 120,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: '#E0E0E0',
  },
  selectedClothingItem: {borderWidth: 3, borderColor: '#6A0DAD'},
  addClothingButton: {
    width: 100,
    height: 120,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  addClothingButtonText: {fontSize: 40, color: 'gray'},
  tryOnButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#6A0DAD',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tryOnButtonText: {color: 'white', fontWeight: 'bold', fontSize: 14},
  newTryOnButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  newTryOnButtonText: {color: 'white', fontWeight: 'bold', fontSize: 14},
  selectedItemsContainer: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 10,
    paddingTop: 15, // 상단 패딩 증가로 삭제 버튼 공간 확보
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectedItemsHeader: {
    paddingHorizontal: 15,
    marginBottom: 8,
  },
  selectedItemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  selectionLimitText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  selectedItemWrapper: {
    position: 'relative',
    marginRight: 10,
    paddingTop: 5, // 상단 여백 추가로 삭제 버튼이 잘리지 않도록
  },
  selectedItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  removeItemButton: {
    position: 'absolute',
    top: 0, // -5에서 0으로 변경하여 잘림 방지
    right: -5,
    backgroundColor: '#FF6B6B',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeItemText: {
    color: 'white',
    fontSize: 12,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: 'white',
    fontSize: 12,
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
    borderRadius: 12,
  },
  disabledText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default VirtualFittingScreen;
