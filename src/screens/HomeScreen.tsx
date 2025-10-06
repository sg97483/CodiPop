// src/screens/HomeScreen.tsx

import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList, // ✅ FlatList로 변경
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import {useNavigation, useIsFocused} from '@react-navigation/native'; // ✅ useIsFocused 추가
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack'; // ✅ NativeStackNavigationProp import
import {CompositeNavigationProp} from '@react-navigation/native'; // ✅ CompositeNavigationProp import
import {MainTabParamList} from '../navigators/MainTabNavigator'; // ✅ MainTabParamList import
import firestore from '@react-native-firebase/firestore'; // ✅ firestore import
import auth from '@react-native-firebase/auth'; // ✅ auth import
import {RootStackParamList} from 'App';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface RecentItem {
  id: string;
  imageUrl: string;
}

interface RecentItem {
  id: string;
  imageUrl: string;
}

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const isFocused = useIsFocused(); // ✅ 화면이 포커스될 때마다 감지

  const [loading, setLoading] = useState(true);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const user = auth().currentUser;

  useEffect(() => {
    if (isFocused && user) {
      setLoading(true);
      const subscriber = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('recentResults')
        .orderBy('createdAt', 'desc') // 최신순으로 정렬
        .limit(10) // 최근 10개만 가져오기
        .onSnapshot(querySnapshot => {
          const items: RecentItem[] = [];
          querySnapshot.forEach(documentSnapshot => {
            items.push({
              id: documentSnapshot.id,
              imageUrl: documentSnapshot.data().imageUrl,
            });
          });
          setRecentItems(items);
          setLoading(false);
        });

      // 화면을 벗어나면 구독 해제
      return () => subscriber();
    }
  }, [isFocused, user]); // ✅ isFocused나 user가 바뀔 때마다 다시 데이터를 불러옴

  return (
    <SafeAreaView style={styles.container}>
      {/* --- 헤더 섹션 --- */}
      <ScrollView>
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.welcomeMessage}>안녕하세요, CodiPOP님!</Text>
            <Text style={styles.welcomeSubMessage}>
              오늘 입어볼 옷을 찾아볼까요?
            </Text>
          </View>
          <TouchableOpacity style={styles.profileIcon} />
        </View>

        {/* --- 메인 기능 안내 카드 --- */}
        <TouchableOpacity
          style={styles.mainCtaCard}
          onPress={() => navigation.jumpTo('VirtualFitting')}>
          <View style={styles.ctaTextContainer}>
            <Text style={styles.ctaTitle}>가상 피팅룸</Text>
            <Text style={styles.ctaSubtitle}>
              사진 두 장으로 나만의 코디를 완성해보세요 ✨
            </Text>
          </View>
          <Text style={styles.ctaIcon}>🚀</Text>
        </TouchableOpacity>

        {/* --- 최근에 입어본 옷 섹션 --- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>최근에 입어본 옷</Text>

          {loading ? (
            <ActivityIndicator style={{marginTop: 20}} size="large" />
          ) : recentItems.length > 0 ? (
            <FlatList
              data={recentItems}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('Detail', {imageUrl: item.imageUrl})
                  }>
                  <Image
                    source={{uri: item.imageUrl}}
                    style={styles.feedCard}
                  />
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>아직 입어본 옷이 없어요.</Text>
            </View>
          )}
        </View>
      </ScrollView>
      {/* ✅ 중복되는 하단 영역은 제거했습니다. */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  welcomeMessage: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  welcomeSubMessage: {
    fontSize: 14,
    color: 'gray',
    marginTop: 4,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  mainCtaCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    lineHeight: 20,
  },
  ctaIcon: {
    fontSize: 32,
  },
  sectionContainer: {
    marginTop: 30,
    paddingLeft: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  feedCard: {
    width: 150,
    height: 200,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    marginRight: 12,
  },
  emptyCard: {
    width: '95%',
    height: 100,
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'gray',
  },
});

export default HomeScreen;
