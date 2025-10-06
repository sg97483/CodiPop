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
  Animated,
} from 'react-native';
import {
  useNavigation,
  useIsFocused,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import {launchImageLibrary} from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import {useActionSheet} from '@expo/react-native-action-sheet';

const CATEGORIES = ['내 옷장', 'ALL', 'TOP', 'PANTS', 'SKIRT', 'DRESS', 'ACC'];

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
  const [selectedClothingImage, setSelectedClothingImage] = useState<
    string | null
  >(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [imageLoading, setImageLoading] = useState<{[key: string]: boolean}>(
    {},
  ); // ✅ 이미지 로딩 state 추가

  // 옷장에서 아이템을 선택했을 때 clothingImage 자동 설정
  useEffect(() => {
    if (isFocused && route.params?.clothingUrl) {
      setSelectedClothingImage(route.params.clothingUrl);
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
    }
  };

  // 옷장에 아이템을 저장하는 함수
  const handleSaveToCloset = async (imageUrl: string, category: string) => {
    // ✅ category 파라미터 추가
    if (!imageUrl || !user) {
      return;
    }
    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('closet')
        .add({
          imageUrl: imageUrl,
          category: category, // ✅ category 필드 추가
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      Toast.show({type: 'success', text1: '옷장에 추가되었습니다!'});
      setSelectedClothingImage(imageUrl); // 저장 후 바로 선택 상태로
    } catch (error) {
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
            setSelectedClothingImage(newClothingUrl);
          }
        },
      );
    }
  };

  // '피팅 시작' 버튼을 눌렀을 때 실행될 함수
  const handleTryOn = async () => {
    if (!personImage || !selectedClothingImage) {
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
    formData.append('clothing', {
      uri: selectedClothingImage,
      name: 'clothing.jpg',
      type: 'image/jpeg',
    });

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

  // 옷을 '선택'만 하는 함수
  const handleItemSelect = (clothingUrl: string) => {
    setSelectedClothingImage(clothingUrl);
  };

  // 애니메이션을 위한 useEffect
  useEffect(() => {
    if (resultImage) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [resultImage, fadeAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topContainer}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#6A0DAD" />
            <Text style={styles.processingText}>이미지 합성 중...</Text>
          </View>
        ) : resultImage ? (
          <View style={styles.resultContainer}>
            <TouchableOpacity onPress={handleDownloadImage}>
              <Animated.Image
                source={{uri: resultImage}}
                style={[styles.resultImage, {opacity: fadeAnim}]}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <View style={styles.resultOverlay}>
              <Text style={styles.resultSuccessText}>✅ 피팅 완료!</Text>
              <Text style={styles.resultSubText}>탭하여 다운로드</Text>
            </View>
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
            setSelectedClothingImage(null);
          }}>
            <Text style={styles.newTryOnButtonText}>새 피팅 시작 🔄</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.tryOnButton} onPress={handleTryOn}>
            <Text style={styles.tryOnButtonText}>피팅 시작 🚀</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bottomContainer}>
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
              renderItem={({item}) => (
                <TouchableOpacity
                  onPress={() => handleItemSelect(item.imageUrl)}>
                  <Image
                    source={{uri: item.imageUrl}}
                    style={[
                      styles.clothingItem,
                      selectedClothingImage === item.imageUrl &&
                        styles.selectedClothingItem,
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
                </TouchableOpacity>
              )}
              contentContainerStyle={{
                paddingLeft: 10,
                paddingTop: 10,
                paddingBottom: 10,
              }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  topContainer: {
    flex: 0.65,
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
  },
  processingText: {
    fontSize: 16,
    color: '#6A0DAD',
    fontWeight: 'bold',
    marginTop: 16,
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
  bottomContainer: {flex: 0.35, borderTopWidth: 1, borderTopColor: '#E0E0E0'},
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
});

export default VirtualFittingScreen;
