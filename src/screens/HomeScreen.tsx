// src/screens/HomeScreen.tsx

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CompositeNavigationProp,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { MainTabParamList } from '../navigators/MainTabNavigator';
import { RootStackParamList } from '../navigation/types';
import {
  fetchCommunityFeed,
  type CommunityPost,
} from '../services/communityService';
import { checkAndClaimDailyAttendance } from '../services/ticketService';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface RecentItem {
  id: string;
  imageUrl: string;
  createdAt?: any;
  isLiked?: boolean;
}

interface ClosetItem {
  id: string;
  imageUrl: string;
  category?: string;
}

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const user = auth().currentUser;

  const [loading, setLoading] = useState(true);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [closetLoading, setClosetLoading] = useState(true);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);

  const getUserDisplayName = () => {
    if (!user) {
      return 'CodiPOP';
    }
    if (user.displayName) {
      return user.displayName;
    }
    if (user.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return 'CodiPOP';
  };

  const getUserProfileImage = () => {
    if (!user) {
      return null;
    }
    return user.photoURL;
  };

  useEffect(() => {
    if (isFocused) {
      checkAndClaimDailyAttendance().then(result => {
        if (result.claimed) {
          Alert.alert(
            '오늘의 출석 보너스',
            `매일 첫 접속 보너스로 스타일 티켓 +${result.rewardAmount}장이 지급되었습니다!\n(현재 잔액: ${result.balance}장)`,
            [{ text: '확인' }],
          );
        }
      });
    }
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused || !user) {
      return;
    }

    setLoading(true);
    const subscriber = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('recentResults')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .onSnapshot(
        querySnapshot => {
          if (!querySnapshot) {
            setLoading(false);
            return;
          }
          const items: RecentItem[] = [];
          querySnapshot.forEach(documentSnapshot => {
            const data = documentSnapshot.data();
            items.push({
              id: documentSnapshot.id,
              imageUrl: data.imageUrl,
              createdAt: data.createdAt,
              isLiked: data.isLiked || false,
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

    return () => subscriber();
  }, [isFocused, user]);

  useEffect(() => {
    if (!isFocused || !user) {
      return;
    }

    setClosetLoading(true);
    const subscriber = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('closet')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        querySnapshot => {
          if (!querySnapshot) {
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
  }, [isFocused, user]);

  const loadCommunity = useCallback(async () => {
    if (!user) {
      setCommunityPosts([]);
      setCommunityLoading(false);
      return;
    }
    setCommunityLoading(true);
    try {
      const posts = await fetchCommunityFeed(6);
      setCommunityPosts(posts.slice(0, 6));
    } catch (error) {
      console.error('Home community load failed', error);
      setCommunityPosts([]);
    } finally {
      setCommunityLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isFocused) {
      loadCommunity();
    }
  }, [isFocused, loadCommunity]);

  const getRecommendations = () => {
    if (closetItems.length === 0) {
      return null;
    }

    const categoryCount: { [key: string]: number } = {};
    closetItems.forEach(item => {
      if (item.category) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      }
    });

    const categories = Object.keys(categoryCount);
    if (categories.length === 0) {
      return {
        category: t('homeClosetAll'),
        items: closetItems.slice(0, 6),
        totalItems: closetItems.length,
      };
    }

    const mostPopularCategory = categories.reduce((a, b) =>
      categoryCount[a] > categoryCount[b] ? a : b,
    );

    return {
      category: mostPopularCategory,
      items: closetItems
        .filter(item => item.category === mostPopularCategory)
        .slice(0, 6),
      totalItems: closetItems.length,
    };
  };

  const recommendations = getRecommendations();

  const quickActions = [
    {
      key: 'fitting',
      title: t('homeQuickFitting'),
      subtitle: t('homeQuickFittingHint'),
      icon: require('../assets/icons/icon-fitting-active.png'),
      onPress: () => navigation.jumpTo('VirtualFitting'),
    },
    {
      key: 'mall',
      title: t('homeQuickMall'),
      subtitle: t('homeQuickMallHint'),
      icon: require('../assets/icons/search-dark.png'),
      onPress: () => navigation.navigate('MallList'),
    },
    {
      key: 'community',
      title: t('homeQuickCommunity'),
      subtitle: t('homeQuickCommunityHint'),
      icon: require('../assets/icons/icon-community-active.png'),
      onPress: () => navigation.navigate('CommunityCreatePost'),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={styles.headerContainer}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.welcomeMessage}>
              {t('homeGreeting', { name: getUserDisplayName() })}
            </Text>
            <Text style={styles.welcomeSubMessage}>{t('homeSubtitle')}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileIcon}
            onPress={() => navigation.navigate('Profile')}>
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

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('homeQuickTitle')}</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={styles.quickCardPrimaryWrap}
              activeOpacity={0.85}
              onPress={quickActions[0].onPress}>
              <LinearGradient
                colors={['#FBF7FF', '#F0E6FA', '#E8D9F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickCardPrimary}>
                <Image
                  source={quickActions[0].icon}
                  style={styles.quickIconPrimary}
                />
                <Text style={styles.quickTitlePrimary}>
                  {quickActions[0].title}
                </Text>
                <Text style={styles.quickSubtitlePrimary}>
                  {quickActions[0].subtitle}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.quickSideColumn}>
              <TouchableOpacity
                style={styles.quickCardSide}
                activeOpacity={0.85}
                onPress={quickActions[1].onPress}>
                <Image
                  source={quickActions[1].icon}
                  style={styles.quickIcon}
                />
                <Text style={styles.quickTitle}>{quickActions[1].title}</Text>
                <Text style={styles.quickSubtitle}>{quickActions[1].subtitle}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickCardSide}
                activeOpacity={0.85}
                onPress={quickActions[2].onPress}>
                <Image
                  source={quickActions[2].icon}
                  style={styles.quickIcon}
                />
                <Text style={styles.quickTitle}>{quickActions[2].title}</Text>
                <Text style={styles.quickSubtitle}>{quickActions[2].subtitle}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('homeContinueTitle')}</Text>
            <TouchableOpacity onPress={() => navigation.jumpTo('RecentCodi')}>
              <Text style={styles.seeAllText}>{t('homeSeeAll')}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 16 }} color="#6A0DAD" />
          ) : recentItems.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}>
              {recentItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() =>
                    navigation.navigate('CodiDetail', {
                      codiId: item.id,
                      imageUrl: item.imageUrl,
                      createdAt: item.createdAt,
                      isLiked: item.isLiked,
                    })
                  }>
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.feedCard}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('homeContinueEmpty')}</Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => navigation.jumpTo('VirtualFitting')}>
                <Text style={styles.emptyActionText}>
                  {t('homeQuickFitting')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('homeCommunityTitle')}</Text>
            <TouchableOpacity onPress={() => navigation.jumpTo('Community')}>
              <Text style={styles.seeAllText}>{t('homeSeeAll')}</Text>
            </TouchableOpacity>
          </View>

          {communityLoading ? (
            <ActivityIndicator style={{ marginTop: 16 }} color="#6A0DAD" />
          ) : communityPosts.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}>
              {communityPosts.map(post => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.communityCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('CommunityPostDetail', {
                      postId: post.id,
                    })
                  }>
                  <Image
                    source={{ uri: post.imageUrl }}
                    style={styles.communityImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.communityAuthor} numberOfLines={1}>
                    {post.authorName}
                  </Text>
                  <Text style={styles.communityCaption} numberOfLines={1}>
                    {post.caption || t('communityDefaultCaption')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('homeCommunityEmpty')}</Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => navigation.navigate('CommunityCreatePost')}>
                <Text style={styles.emptyActionText}>
                  {t('homeQuickCommunity')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.sectionContainer, { marginBottom: 8 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('homeClosetTitle')}</Text>
            <TouchableOpacity onPress={() => navigation.jumpTo('Closet')}>
              <Text style={styles.seeAllText}>{t('homeSeeAll')}</Text>
            </TouchableOpacity>
          </View>

          {closetLoading ? (
            <ActivityIndicator style={{ marginTop: 16 }} color="#6A0DAD" />
          ) : recommendations ? (
            <View style={styles.recommendationCard}>
              <Text style={styles.recommendationTitle}>
                {t('homeClosetMostCategory', {
                  category: recommendations.category,
                })}
              </Text>
              <Text style={styles.recommendationSubtitle}>
                {t('homeClosetSubtitle', {
                  count: recommendations.totalItems,
                })}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 12 }}>
                {recommendations.items.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() =>
                      navigation.navigate('VirtualFitting', {
                        clothingUrl: item.imageUrl,
                      })
                    }
                    style={styles.recommendationItem}>
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.recommendationImage}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('homeClosetEmpty')}</Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => navigation.navigate('MallList')}>
                <Text style={styles.emptyActionText}>{t('homeQuickMall')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  welcomeMessage: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  welcomeSubMessage: {
    fontSize: 14,
    color: '#777777',
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
  sectionContainer: {
    marginTop: 18,
    paddingLeft: 20,
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
    color: '#1A1A1A',
  },
  seeAllText: {
    fontSize: 13,
    color: '#6A0DAD',
    fontWeight: '600',
  },
  quickGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    paddingRight: 20,
    marginTop: 12,
  },
  quickCardPrimaryWrap: {
    flex: 4.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  quickCardPrimary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    justifyContent: 'center',
    minHeight: 118,
  },
  quickIconPrimary: {
    width: 26,
    height: 26,
    marginBottom: 10,
    tintColor: '#6A0DAD',
  },
  quickIcon: {
    width: 18,
    height: 18,
    marginBottom: 6,
    tintColor: '#6A0DAD',
  },
  quickSideColumn: {
    flex: 5.5,
    gap: 10,
  },
  quickCardSide: {
    flex: 1,
    backgroundColor: '#F7F3FB',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  quickTitlePrimary: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A1A7A',
    marginBottom: 6,
  },
  quickSubtitlePrimary: {
    fontSize: 12,
    color: '#7A6A8A',
    lineHeight: 17,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A1A7A',
    marginBottom: 4,
  },
  quickSubtitle: {
    fontSize: 11,
    color: '#7A6A8A',
    lineHeight: 15,
  },
  feedCard: {
    width: 135,
    height: 135,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    marginRight: 12,
  },
  communityCard: {
    width: 140,
    marginRight: 12,
  },
  communityImage: {
    width: 140,
    height: 140,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
  },
  communityAuthor: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#222222',
  },
  communityCaption: {
    marginTop: 2,
    fontSize: 11,
    color: '#777777',
  },
  recommendationCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginRight: 20,
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  recommendationSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
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
  emptyCard: {
    marginRight: 20,
    minHeight: 100,
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: '#777777',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: 10,
    backgroundColor: '#6A0DAD',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default HomeScreen;
