// src/screens/ClosetScreen.tsx

import React, {useState, useEffect, useMemo} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation, useIsFocused} from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const CATEGORIES = ['ALL', 'TOP', 'PANTS', 'SKIRT', 'DRESS', 'ACC'];

type ClosetScreenNavigationProp = {
  navigate: (screen: 'VirtualFitting', params?: {clothingUrl: string}) => void;
};

interface ClosetItem {
  id: string;
  imageUrl: string;
  category?: string;
}

const ClosetScreen = () => {
  const navigation = useNavigation<ClosetScreenNavigationProp>();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const user = auth().currentUser;
  const [imageLoading, setImageLoading] = useState<{[key: string]: boolean}>(
    {},
  );

  const [activeCategory, setActiveCategory] = useState('ALL');

  useEffect(() => {
    if (isFocused && user) {
      console.log('ClosetScreen 데이터 로딩 시작 - 사용자:', user.uid);
      setLoading(true);
      
      const subscriber = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('closet')
        .orderBy('createdAt', 'desc')
        .onSnapshot(
          querySnapshot => {
            console.log('ClosetScreen Firestore 업데이트:', querySnapshot.size, '개 아이템');
            const items: ClosetItem[] = [];
            querySnapshot.forEach(documentSnapshot => {
              const data = documentSnapshot.data();
              console.log('ClosetScreen 아이템 데이터:', {
                id: documentSnapshot.id,
                imageUrl: data.imageUrl,
                category: data.category,
                createdAt: data.createdAt
              });
              items.push({
                id: documentSnapshot.id,
                imageUrl: data.imageUrl,
                category: data.category,
              });
            });
            
            console.log('ClosetScreen 아이템 설정 완료:', items.length, '개');
            setClosetItems(items);
            setImageLoading({});
            setLoading(false);
            
            // 잘못된 로컬 파일 경로를 가진 아이템들 정리
            setTimeout(() => {
              cleanupInvalidItems();
            }, 1000);
          },
          error => {
            console.error('ClosetScreen Firestore 오류:', error);
            Alert.alert('오류', '옷장 데이터를 불러오는 중 문제가 발생했습니다.');
            setLoading(false);
          }
        );
      return () => subscriber();
    }
  }, [isFocused, user]);

  const displayedItems = useMemo(() => {
    if (activeCategory === 'ALL') {
      return closetItems;
    }
    return closetItems.filter(item => item.category === activeCategory);
  }, [activeCategory, closetItems]);

  const handleItemPress = (imageUrl: string) => {
    navigation.navigate('VirtualFitting', {clothingUrl: imageUrl});
  };


  // 잘못된 로컬 파일 경로를 가진 아이템들을 정리하는 함수
  const cleanupInvalidItems = async () => {
    if (!user) return;
    
    const invalidItems = closetItems.filter(item => 
      item.imageUrl.startsWith('file://') || 
      item.imageUrl.includes('/cache/')
    );
    
    if (invalidItems.length > 0) {
      console.log('잘못된 아이템 정리:', invalidItems.length, '개');
      
      for (const item of invalidItems) {
        try {
          await firestore()
            .collection('users')
            .doc(user.uid)
            .collection('closet')
            .doc(item.id)
            .delete();
          console.log('아이템 삭제 완료:', item.id);
        } catch (error) {
          console.error('아이템 삭제 실패:', item.id, error);
        }
      }
    }
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert('삭제 확인', '정말로 이 아이템을 옷장에서 삭제하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {
        text: '삭제',
        onPress: async () => {
          if (!user) {
            Alert.alert('오류', '로그인이 필요합니다.');
            return;
          }

          try {
            // 로딩 상태 표시 (선택사항)
            await firestore()
              .collection('users')
              .doc(user.uid)
              .collection('closet')
              .doc(itemId)
              .delete();
            
            // 성공 메시지 (선택사항)
            // Toast.show({type: 'success', text1: '아이템이 삭제되었습니다!'});
            
          } catch (error: any) {
            console.error('삭제 중 오류 발생:', error);
            
            // 더 구체적인 에러 메시지
            let errorMessage = '삭제 중 문제가 발생했습니다.';
            if (error?.code === 'permission-denied') {
              errorMessage = '삭제 권한이 없습니다.';
            } else if (error?.code === 'unavailable') {
              errorMessage = '네트워크 연결을 확인해주세요.';
            }
            
            Alert.alert('오류', errorMessage);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>내 옷장</Text>
        </View>
        <ActivityIndicator style={{flex: 1}} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>내 옷장</Text>
      </View>

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

      {closetItems.length > 0 ? (
        <FlatList
          data={displayedItems}
          keyExtractor={item => item.id}
          numColumns={2}
          renderItem={({item}) => {
            console.log('ClosetScreen 렌더링:', {
              id: item.id,
              imageUrl: item.imageUrl,
              category: item.category
            });
            
            return (
              <View style={styles.gridItem}>
                <TouchableOpacity
                  style={styles.imagePressable}
                  onPress={() => handleItemPress(item.imageUrl)}>
                  <Image
                    source={{uri: item.imageUrl}}
                    style={styles.closetImage}
                    resizeMode="cover"
                    // ✅ 로딩 시작 시 상태 업데이트
                    onLoadStart={() => {
                      console.log('이미지 로딩 시작:', item.id);
                      setImageLoading(prev => ({...prev, [item.id]: true}));
                    }}
                    // ✅ 로딩 완료 시 상태 업데이트
                    onLoadEnd={() => {
                      console.log('이미지 로딩 완료:', item.id);
                      setImageLoading(prev => ({...prev, [item.id]: false}));
                    }}
                    // ✅ 에러 처리 추가
                    onError={(error) => {
                      console.error('이미지 로딩 에러:', item.id, error.nativeEvent.error);
                      setImageLoading(prev => ({...prev, [item.id]: false}));
                    }}
                  />
                  {/* ✅ 로딩 중일 때 ActivityIndicator 표시 */}
                  {imageLoading[item.id] && (
                    <ActivityIndicator
                      style={StyleSheet.absoluteFill} // 이미지를 완전히 덮도록 설정
                      size="small"
                      color="#6A0DAD"
                    />
                  )}
                  {/* ✅ 이미지 로드 실패 시 플레이스홀더 */}
                  {!imageLoading[item.id] && (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>📷</Text>
                    </View>
                  )}
                </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteItem(item.id)}>
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
            );
          }}
          contentContainerStyle={styles.gridContainer}
          // 만약 필터링 결과가 없을 때를 대비한 처리
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                선택된 카테고리에 아이템이 없어요.
              </Text>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>옷장에 저장된 옷이 없어요.</Text>
          <Text style={styles.emptySubText}>
            피팅룸에서 '+' 버튼을 눌러 옷을 추가해보세요!
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('VirtualFitting')}>
            <Text style={styles.emptyButtonText}>피팅룸으로 이동</Text>
          </TouchableOpacity>
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
  headerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  categoryContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryText: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    fontSize: 16,
    color: 'gray',
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    overflow: 'hidden', // iOS에서 둥근 배경을 위해 추가
  },
  activeCategoryText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: '#6A0DAD',
  },
  gridContainer: {
    paddingHorizontal: 10,
  },
  gridItem: {
    flex: 1,
    margin: 10,
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  imagePressable: {
    width: '100%',
    height: '100%',
  },
  closetImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 24,
    color: '#999999',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20, // 텍스트가 잘리지 않도록
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'gray',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: 'lightgray',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#6A0DAD',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ClosetScreen;
