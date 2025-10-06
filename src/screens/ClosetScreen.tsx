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
      const subscriber = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('closet')
        .orderBy('createdAt', 'desc')
        .onSnapshot(querySnapshot => {
          const items: ClosetItem[] = [];
          querySnapshot.forEach(documentSnapshot => {
            items.push({
              id: documentSnapshot.id,
              imageUrl: documentSnapshot.data().imageUrl,
              category: documentSnapshot.data().category,
            });
          });
          setClosetItems(items);
          setImageLoading({});
          setLoading(false);
        });
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

  const handleDeleteItem = (itemId: string) => {
    Alert.alert('삭제 확인', '정말로 이 아이템을 옷장에서 삭제하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {
        text: '삭제',
        onPress: () => {
          if (user) {
            firestore()
              .collection('users')
              .doc(user.uid)
              .collection('closet')
              .doc(itemId)
              .delete()
              .then(() => console.log('아이템이 삭제되었습니다!'))
              .catch(error =>
                Alert.alert('오류', '삭제 중 문제가 발생했습니다.'),
              );
          }
        },
        style: 'destructive',
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.headerTitle}>내 옷장</Text>
        <ActivityIndicator style={{flex: 1}} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>내 옷장</Text>

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
          renderItem={({item}) => (
            <View style={styles.gridItem}>
              <TouchableOpacity
                style={styles.imagePressable}
                onPress={() => handleItemPress(item.imageUrl)}>
                <Image
                  source={{uri: item.imageUrl}}
                  style={styles.closetImage}
                  // ✅ 로딩 시작 시 상태 업데이트
                  onLoadStart={() =>
                    setImageLoading(prev => ({...prev, [item.id]: true}))
                  }
                  // ✅ 로딩 완료 시 상태 업데이트
                  onLoadEnd={() =>
                    setImageLoading(prev => ({...prev, [item.id]: false}))
                  }
                />
                {/* ✅ 로딩 중일 때 ActivityIndicator 표시 */}
                {imageLoading[item.id] && (
                  <ActivityIndicator
                    style={StyleSheet.absoluteFill} // 이미지를 완전히 덮도록 설정
                    size="small"
                    color="#6A0DAD"
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteItem(item.id)}>
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
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
