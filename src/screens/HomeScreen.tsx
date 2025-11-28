// src/screens/HomeScreen.tsx

import React, { useState, useEffect } from 'react';
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
  ImageBackground,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native'; // ✅ useIsFocused 추가
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack'; // ✅ NativeStackNavigationProp import
import { CompositeNavigationProp } from '@react-navigation/native'; // ✅ CompositeNavigationProp import
import { MainTabParamList } from '../navigators/MainTabNavigator'; // ✅ MainTabParamList import
import firestore from '@react-native-firebase/firestore'; // ✅ firestore import
import auth from '@react-native-firebase/auth'; // ✅ auth import
import { RootStackParamList } from 'App';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface RecentItem {
  id: string;
  imageUrl: string;
}

interface ClosetItem {
  id: string;
  imageUrl: string;
  category?: string;
}

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const isFocused = useIsFocused(); // ✅ 화면이 포커스될 때마다 감지

  const [loading, setLoading] = useState(true);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [closetLoading, setClosetLoading] = useState(true);
  const user = auth().currentUser;

  // 사용자 이름 가져오기 함수
  const getUserDisplayName = () => {
    if (!user) return 'CodiPOP';

    // Google 로그인의 경우 displayName 또는 email에서 이름 추출
    if (user.displayName) {
      return user.displayName;
    }

    // email에서 이름 추출 (예: john.doe@gmail.com -> John)
    if (user.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }

    return 'CodiPOP';
  };

  // 사용자 프로필 이미지 가져오기
  const getUserProfileImage = () => {
    if (!user) return null;
    return user.photoURL;
  };

  // 최근 피팅 결과 가져오기
  useEffect(() => {
    if (isFocused && user) {
      setLoading(true);
      const subscriber = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('recentResults')
        .orderBy('createdAt', 'desc') // 최신순으로 정렬
        .limit(10) // 최근 10개만 가져오기
        .onSnapshot(
          querySnapshot => {
            if (!querySnapshot) {
              console.log('Recent results querySnapshot is null');
              setLoading(false);
              return;
            }
            const items: RecentItem[] = [];
            querySnapshot.forEach(documentSnapshot => {
              items.push({
                id: documentSnapshot.id,
                imageUrl: documentSnapshot.data().imageUrl,
              });
            });
            setRecentItems(items);
            setLoading(false);
          },
          error => {
            console.error('Recent results snapshot error:', error);
            setLoading(false);
          },
        );

      // 화면을 벗어나면 구독 해제
      return () => subscriber();
    }
  }, [isFocused, user]);

  // 옷장 데이터 가져오기 (추천용)
  useEffect(() => {
    if (isFocused && user) {
      setClosetLoading(true);
      const subscriber = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('closet')
        .orderBy('createdAt', 'desc')
        .onSnapshot(
          querySnapshot => {
            if (!querySnapshot) {
              console.log('Closet querySnapshot is null');
              setClosetLoading(false);
              return;
            }
            const items: ClosetItem[] = [];
            querySnapshot.forEach(documentSnapshot => {
              const data = documentSnapshot.data();
              items.push({
                id: documentSnapshot.id,
                imageUrl: data.imageUrl,
                category: data.category,
              });
            });
            setClosetItems(items);
            setClosetLoading(false);
          },
          error => {
            console.error('Closet snapshot error:', error);
            setClosetLoading(false);
          },
        );

      return () => subscriber();
    }
  }, [isFocused, user]);

  // 추천 로직
  const getRecommendations = () => {
    if (closetItems.length === 0) return null;

    // 카테고리별 아이템 수 계산
    const categoryCount: { [key: string]: number } = {};
    closetItems.forEach(item => {
      if (item.category) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      }
    });

    // 가장 많은 카테고리 찾기
    const mostPopularCategory = Object.keys(categoryCount).reduce((a, b) =>
      categoryCount[a] > categoryCount[b] ? a : b
    );

    // 해당 카테고리의 최신 아이템들
    const recommendedItems = closetItems
      .filter(item => item.category === mostPopularCategory)
      .slice(0, 3);

    return {
      category: mostPopularCategory,
      items: recommendedItems,
      totalItems: closetItems.length,
      categoryCount
    };
  };

  const recommendations = getRecommendations();

  return (
    <SafeAreaView style={styles.container}>
      {/* --- 헤더 섹션 --- */}
      <ScrollView>
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.welcomeMessage}>
              안녕하세요, {getUserDisplayName()}님!
            </Text>
            <Text style={styles.welcomeSubMessage}>
              오늘 입어볼 옷을 찾아볼까요?
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileIcon}
            onPress={() => navigation.jumpTo('Profile')}>
            {getUserProfileImage() ? (
              <Image
                source={{ uri: getUserProfileImage() || '' }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profilePlaceholderText}>
                  {getUserDisplayName().charAt(0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* --- 메인 기능 안내 카드 --- */}
        <TouchableOpacity
          style={styles.mainCtaCard}
          onPress={() => navigation.jumpTo('VirtualFitting')}
          activeOpacity={0.9}>
          <ImageBackground
            source={require('../assets/images/home_fitting_human2.png')}
            style={styles.ctaGradient}
            imageStyle={styles.backgroundImage}
            resizeMode="cover">
            <View style={styles.overlay} />
            <View style={styles.ctaTitleContainer}>
              <Text style={styles.ctaTitle}>Fitting Room</Text>
            </View>
            <View style={styles.ctaContentColumn}>
              <View style={styles.ctaContentRow}>
                <Text style={styles.ctaSubtitle}>
                  나만의 코디를 완성해 보세요.
                </Text>
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={() => navigation.jumpTo('VirtualFitting')}>
                  <Text style={styles.ctaButtonText}>시작하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* --- 최근에 입어본 옷 섹션 --- */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근에 입어본 옷</Text>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} size="large" />
          ) : recentItems.length > 0 ? (
            <FlatList
              data={recentItems}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('Detail', { imageUrl: item.imageUrl })
                  }>
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.feedCard}
                  />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingRight: 20 }}
            />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>아직 입어본 옷이 없어요.</Text>
            </View>
          )}
        </View>

        {/* --- 가장 많은 TOP 아이템 영역 --- */}
        {recommendations && (
          <View style={styles.recommendationCardWrapper}>
            <View style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <Text style={styles.recommendationTitle}>
                  가장 많은 {recommendations.category} 아이템
                </Text>
                <Text style={styles.recommendationSubtitle}>
                  총 {recommendations.totalItems}개의 옷 중에서 추천해요
                </Text>
              </View>

              <FlatList
                data={recommendations.items}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('VirtualFitting', { clothingUrl: item.imageUrl })}
                    style={styles.recommendationItem}>
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.recommendationImage}
                    />
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.recommendationList}
              />
            </View>
          </View>
        )}
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
    paddingTop: 45, // 상단 여백 10 추가 (20 → 30)
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
    overflow: 'hidden',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6A0DAD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mainCtaCard: {
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaGradient: {
    minHeight: 208,
    overflow: 'hidden',
    backgroundColor: '#8B5CF6',
  },
  backgroundImage: {
    opacity: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // 더 진한 오버레이로 텍스트 가독성 향상
    zIndex: 0,
  },
  ctaTitleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 8,
    zIndex: 1,
  },
  ctaContentColumn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingTop: 8,
    zIndex: 1,
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: '#FFFFFF', // 불투명도 제거하여 더 진하게
    lineHeight: 22,
    fontWeight: '600', // '400' → '600'으로 더 굵게
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  ctaButtonText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionContainer: {
    marginTop: 15,
    paddingLeft: 20,
    paddingBottom: 20, // 하단 여백 추가
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingRight: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    color: '#6A0DAD',
    fontWeight: '600',
  },
  recommendationCardWrapper: {
    marginTop: 3,
    marginBottom: 25, // 하단 여백 추가
    paddingHorizontal: 20,
  },
  recommendationCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginTop: 2,
  },
  recommendationHeader: {
    marginBottom: 12,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  recommendationSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  recommendationList: {
    paddingRight: 0,
  },
  recommendationItem: {
    marginRight: 12,
  },
  recommendationImage: {
    width: 80,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  feedCard: {
    width: 135, // 150 * 0.9 (10% 감소)
    height: 180, // 200 * 0.9 (10% 감소)
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
