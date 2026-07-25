// src/screens/RecentCodiScreen.tsx

import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useTranslation} from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  mapWishlistDocs,
  removeFromWishlist,
} from '../services/wishlistService';
import type { WishlistItem } from '../types/shopping';

interface RecentCodiItem {
  id: string;
  imageUrl: string;
  createdAt: any;
  isLiked?: boolean;
  date?: string;
  month?: string;
  year?: string;
}

interface CodiGroup {
  dateKey: string;
  dateLabel: string;
  items: RecentCodiItem[];
  isExpanded?: boolean;
}

type RecentCodiScreenNavigationProp = NativeStackNavigationProp<any>;

const RecentCodiScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<RecentCodiScreenNavigationProp>();
  const user = auth().currentUser;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [recentCodiItems, setRecentCodiItems] = useState<RecentCodiItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [activeTab, setActiveTab] = useState<'전체' | '찜한 코디' | '위시리스트'>('전체');
  const [activeFilter, setActiveFilter] = useState<'최신순' | '월별' | '년도별' | '일별'>('최신순');
  const [imageLoading, setImageLoading] = useState<{[key: string]: boolean}>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Firestore에서 Recent Codi 데이터 가져오기 (recentResults 컬렉션 사용)
  useEffect(() => {
    if (isFocused && user) {
      setLoading(true);
      const subscriber = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('recentResults')
        .orderBy('createdAt', 'desc')
        .onSnapshot(querySnapshot => {
          const items: RecentCodiItem[] = [];
          querySnapshot.forEach(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate() || new Date();
            
            items.push({
              id: doc.id,
              imageUrl: data.imageUrl,
              createdAt: data.createdAt,
              isLiked: data.isLiked || false,
              date: createdAt.getDate().toString(),
              month: (createdAt.getMonth() + 1).toString(),
              year: createdAt.getFullYear().toString(),
            });
          });
          setRecentCodiItems(items);
          setLoading(false);
        });
      return () => subscriber();
    }
  }, [isFocused, user]);

  useEffect(() => {
    if (!isFocused || !user || activeTab !== '위시리스트') {
      return;
    }

    setLoading(true);
    const subscriber = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('wishlist')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        querySnapshot => {
          setWishlistItems(mapWishlistDocs(querySnapshot.docs));
          setLoading(false);
        },
        error => {
          console.error('위시리스트 로딩 실패:', error);
          setLoading(false);
        },
      );

    return () => subscriber();
  }, [isFocused, user, activeTab]);

  // 날짜별 그룹화 함수
  const groupItemsByDate = (items: RecentCodiItem[], filterType: string): CodiGroup[] => {
    const groups: {[key: string]: RecentCodiItem[]} = {};
    
    items.forEach(item => {
      const date = item.createdAt?.toDate() || new Date();
      let dateKey: string;
      let dateLabel: string;
      
      switch (filterType) {
        case '월별':
          dateKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          dateLabel = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
          break;
        case '년도별':
          dateKey = date.getFullYear().toString();
          dateLabel = `${date.getFullYear()}년`;
          break;
        case '일별':
          dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
          dateLabel = `${date.getMonth() + 1}월 ${date.getDate()}일`;
          break;
        default:
          dateKey = 'all';
          dateLabel = '전체';
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });
    
    // 그룹을 날짜순으로 정렬
    return Object.entries(groups)
      .map(([dateKey, items]) => ({
        dateKey,
        dateLabel: groups[dateKey][0] ? 
          (() => {
            const date = groups[dateKey][0].createdAt?.toDate() || new Date();
            switch (filterType) {
              case '월별':
                return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
              case '년도별':
                return `${date.getFullYear()}년`;
              case '일별':
                return `${date.getMonth() + 1}월 ${date.getDate()}일`;
              default:
                return '전체';
            }
          })() : dateKey,
        items: items.sort((a, b) => {
          const dateA = a.createdAt?.toDate() || new Date(0);
          const dateB = b.createdAt?.toDate() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        }),
        isExpanded: expandedGroups.has(dateKey),
      }))
      .sort((a, b) => {
        // 날짜순으로 정렬 (최신순) - 날짜 키를 파싱해서 정확한 정렬
        const parseDateKey = (dateKey: string) => {
          const parts = dateKey.split('-');
          if (parts.length === 3) { // 일별: 2024-9-27
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          } else if (parts.length === 2) { // 월별: 2024-9
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1);
          } else { // 년도별: 2024
            return new Date(parseInt(parts[0]), 0);
          }
        };
        
        const dateA = parseDateKey(a.dateKey);
        const dateB = parseDateKey(b.dateKey);
        return dateB.getTime() - dateA.getTime(); // 최신순 (내림차순)
      });
  };

  // 탭과 필터에 따른 정렬 및 필터링된 아이템
  const displayedItems = useMemo(() => {
    let items = recentCodiItems;
    
    // 탭 필터링
    if (activeTab === '찜한 코디') {
      items = items.filter(item => item.isLiked);
    }
    
    // 찜한 코디 탭에서는 최신순으로 정렬
    if (activeTab === '찜한 코디') {
      return items.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    }
    
    // 전체 탭에서는 선택된 필터에 따라 정렬
    if (activeFilter === '최신순') {
      return items.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    }
    
    return items;
  }, [recentCodiItems, activeTab, activeFilter]);

  // 그룹화된 데이터
  const groupedData = useMemo(() => {
    if (activeTab === '전체' && activeFilter !== '최신순') {
      return groupItemsByDate(displayedItems, activeFilter);
    }
    return null;
  }, [displayedItems, activeTab, activeFilter, expandedGroups]);

  // 하트 버튼 토글 함수
  const toggleLike = async (itemId: string, currentLikeStatus: boolean) => {
    if (!user) return;

    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('recentResults')
        .doc(itemId)
        .update({
          isLiked: !currentLikeStatus,
        });
    } catch (error) {
      console.error('좋아요 상태 업데이트 실패:', error);
      Alert.alert('오류', '좋아요 상태를 업데이트하는 중 문제가 발생했습니다.');
    }
  };

  // 그룹 확장/축소 함수
  const toggleGroupExpansion = (dateKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  // 상세화면으로 이동하는 함수
  const handleImagePress = (item: RecentCodiItem) => {
    navigation.navigate('CodiDetail', {
      codiId: item.id,
      imageUrl: item.imageUrl,
      createdAt: item.createdAt,
      isLiked: item.isLiked,
    });
  };

  const handleOpenWishlistProduct = async (item: WishlistItem) => {
    if (!item.productUrl) {
      Toast.show({ type: 'info', text1: t('productLinkMissing') });
      return;
    }

    const canOpen = await Linking.canOpenURL(item.productUrl);
    if (!canOpen) {
      Toast.show({ type: 'error', text1: t('productLinkInvalid') });
      return;
    }
    await Linking.openURL(item.productUrl);
  };

  const handleRemoveWishlistItem = (item: WishlistItem) => {
    if (!user) {
      return;
    }

    Alert.alert(t('wishlistRemoveTitle'), t('wishlistRemoveMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await removeFromWishlist(user.uid, item.id);
          Toast.show({ type: 'success', text1: t('wishlistRemoved') });
        },
      },
    ]);
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => (
    <View style={styles.wishlistCard}>
      <Image source={{ uri: item.imageUrl }} style={styles.wishlistImage} />
      <View style={styles.wishlistInfo}>
        <Text style={styles.wishlistName} numberOfLines={1}>
          {item.productName || t('productNameMissing')}
        </Text>
        <Text style={styles.wishlistShop} numberOfLines={1}>
          {item.shopName || t('shopNameMissing')}
        </Text>
        {item.productPrice ? (
          <Text style={styles.wishlistPrice}>
            {item.productPrice.toLocaleString()}원
          </Text>
        ) : null}
        <View style={styles.wishlistActions}>
          <TouchableOpacity
            style={styles.wishlistBuyButton}
            onPress={() => handleOpenWishlistProduct(item)}>
            <Text style={styles.wishlistBuyText}>{t('buyNow')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.wishlistRemoveButton}
            onPress={() => handleRemoveWishlistItem(item)}>
            <Text style={styles.wishlistRemoveText}>{t('removeFromWishlist')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // 그리드 아이템 렌더링
  const renderGridItem = ({item}: {item: RecentCodiItem}) => (
    <View style={styles.gridItem}>
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={() => handleImagePress(item)}>
        <Image
          source={{uri: item.imageUrl}}
          style={styles.codiImage}
          resizeMode="cover"
          onLoadStart={() =>
            setImageLoading(prev => ({...prev, [item.id]: true}))
          }
          onLoadEnd={() =>
            setImageLoading(prev => ({...prev, [item.id]: false}))
          }
        />
        
        {/* 로딩 인디케이터 */}
        {imageLoading[item.id] && (
          <ActivityIndicator
            style={styles.loadingIndicator}
            size="small"
            color="#6A0DAD"
          />
        )}

        {/* 날짜 오버레이 */}
        <View style={styles.dateOverlay}>
          <Text style={styles.dateText}>{item.month}월 {item.date}일</Text>
        </View>

        {/* 하트 버튼 */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => toggleLike(item.id, item.isLiked || false)}>
          <Text style={[
            styles.heartIcon,
            item.isLiked && styles.heartIconLiked
          ]}>
            {item.isLiked ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );

  // 그룹 아이템 렌더링
  const renderGroupItem = ({item}: {item: CodiGroup}) => {
    const firstItem = item.items[0];
    const remainingCount = item.items.length - 1;
    
    return (
      <View style={styles.groupContainer}>
        {/* 그룹 헤더 */}
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => toggleGroupExpansion(item.dateKey)}>
          <Text style={styles.groupTitle}>{item.dateLabel}</Text>
          <Text style={styles.groupCount}>{item.items.length}개</Text>
        </TouchableOpacity>
        
        {/* 그룹 내용 */}
        <View style={styles.groupContent}>
          {/* 첫 번째 이미지 (대표 이미지) */}
          <View style={styles.groupItem}>
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={() => {
                if (item.isExpanded) {
                  // 펼쳐진 상태에서는 상세화면으로 이동
                  handleImagePress(firstItem);
                } else {
                  // 접힌 상태에서는 그룹 펼치기
                  toggleGroupExpansion(item.dateKey);
                }
              }}>
              <Image
                source={{uri: firstItem.imageUrl}}
                style={styles.codiImage}
                resizeMode="cover"
                onLoadStart={() =>
                  setImageLoading(prev => ({...prev, [firstItem.id]: true}))
                }
                onLoadEnd={() =>
                  setImageLoading(prev => ({...prev, [firstItem.id]: false}))
                }
              />
              
              {/* 로딩 인디케이터 */}
              {imageLoading[firstItem.id] && (
                <ActivityIndicator
                  style={styles.loadingIndicator}
                  size="small"
                  color="#6A0DAD"
                />
              )}

              {/* 개수 오버레이 - 펼쳐진 상태에서는 숨김 */}
              {remainingCount > 0 && !item.isExpanded && (
                <View style={styles.countOverlay}>
                  <Text style={styles.countText}>+{remainingCount}</Text>
                </View>
              )}

              {/* 하트 버튼 */}
              <TouchableOpacity
                style={styles.heartButton}
                onPress={() => toggleLike(firstItem.id, firstItem.isLiked || false)}>
                <Text style={[
                  styles.heartIcon,
                  firstItem.isLiked && styles.heartIconLiked
                ]}>
                  {firstItem.isLiked ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
          
          {/* 확장된 경우 나머지 이미지들 */}
          {item.isExpanded && (
            <>
              {item.items.slice(1).map((codiItem) => (
                <View key={codiItem.id} style={styles.groupItem}>
                  <TouchableOpacity
                    style={styles.imageContainer}
                    onPress={() => handleImagePress(codiItem)}>
                    <Image
                      source={{uri: codiItem.imageUrl}}
                      style={styles.codiImage}
                      resizeMode="cover"
                      onLoadStart={() =>
                        setImageLoading(prev => ({...prev, [codiItem.id]: true}))
                      }
                      onLoadEnd={() =>
                        setImageLoading(prev => ({...prev, [codiItem.id]: false}))
                      }
                    />
                    
                    {/* 로딩 인디케이터 */}
                    {imageLoading[codiItem.id] && (
                      <ActivityIndicator
                        style={styles.loadingIndicator}
                        size="small"
                        color="#6A0DAD"
                      />
                    )}

                    {/* 하트 버튼 */}
                    <TouchableOpacity
                      style={styles.heartButton}
                      onPress={() => toggleLike(codiItem.id, codiItem.isLiked || false)}>
                      <Text style={[
                        styles.heartIcon,
                        codiItem.isLiked && styles.heartIconLiked
                      ]}>
                        {codiItem.isLiked ? '❤️' : '🤍'}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>코디북</Text>
      </View>

      {/* 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === '전체' && styles.activeTab]}
          onPress={() => setActiveTab('전체')}>
          <Text style={[
            styles.tabText,
            activeTab === '전체' && styles.activeTabText
          ]}>
            전체
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === '찜한 코디' && styles.activeTab]}
          onPress={() => setActiveTab('찜한 코디')}>
          <Text style={[
            styles.tabText,
            activeTab === '찜한 코디' && styles.activeTabText
          ]}>
            찜한 코디
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === '위시리스트' && styles.activeTab]}
          onPress={() => setActiveTab('위시리스트')}>
          <Text style={[
            styles.tabText,
            activeTab === '위시리스트' && styles.activeTabText
          ]}>
            {t('wishlistTab')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 전체 탭에서만 필터 버튼들 표시 */}
      {activeTab === '전체' && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            {['최신순', '일별', '월별', '년도별'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterButton, activeFilter === filter && styles.activeFilterButton]}
                onPress={() => setActiveFilter(filter as any)}>
                <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 그리드 또는 그룹화된 리스트 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A0DAD" />
        </View>
      ) : activeTab === '위시리스트' ? (
        wishlistItems.length > 0 ? (
          <FlatList
            data={wishlistItems}
            keyExtractor={item => item.id}
            renderItem={renderWishlistItem}
            contentContainerStyle={[styles.wishlistContainer, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('wishlistEmpty')}</Text>
            <Text style={styles.emptySubText}>{t('wishlistEmptyHint')}</Text>
          </View>
        )
      ) : groupedData && groupedData.length > 0 ? (
        // 그룹화된 데이터 표시
        <FlatList
          key="grouped-list" // 고유한 key 추가
          data={groupedData}
          keyExtractor={item => item.dateKey}
          renderItem={renderGroupItem}
          contentContainerStyle={[styles.groupContainer, {paddingBottom: insets.bottom + 20}]}
          showsVerticalScrollIndicator={false}
        />
      ) : displayedItems.length > 0 ? (
        // 일반 그리드 표시
        <FlatList
          key="grid-list" // 고유한 key 추가
          data={displayedItems}
          numColumns={3}
          keyExtractor={item => item.id}
          renderItem={renderGridItem}
          contentContainerStyle={[styles.gridContainer, {paddingBottom: insets.bottom + 20}]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {activeTab === '찜한 코디' 
              ? '찜한 코디가 없어요.' 
              : '저장된 코디가 없어요.'}
          </Text>
          <Text style={styles.emptySubText}>
            가상 피팅룸에서 코디를 만들어보세요!
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    marginRight: 24,
    paddingBottom: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6A0DAD',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#6A0DAD',
    fontWeight: 'bold',
  },
  filterContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterScrollContent: {
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
  },
  activeFilterButton: {
    backgroundColor: '#6A0DAD',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  gridContainer: {
    padding: 10,
  },
  groupContainer: {
    padding: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  groupCount: {
    fontSize: 14,
    color: '#666',
  },
  groupContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  groupItem: {
    width: '33.33%',
    padding: 2,
    aspectRatio: 1,
  },
  expandedItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    paddingTop: 4,
  },
  countOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gridItem: {
    flex: 1,
    margin: 5,
    height: 200, // 적당한 크기로 조정
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    position: 'relative',
  },
  codiImage: {
    width: '100%',
    height: '100%',
  },
  loadingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  heartButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // 투명도를 조금 높임
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIcon: {
    fontSize: 16,
  },
  heartIconLiked: {
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  wishlistContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  wishlistCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEE',
    padding: 12,
    marginBottom: 12,
  },
  wishlistImage: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: '#F4F4F4',
  },
  wishlistInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  wishlistName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  wishlistShop: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  wishlistPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6A0DAD',
    marginTop: 6,
  },
  wishlistActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  wishlistBuyButton: {
    backgroundColor: '#6A0DAD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  wishlistBuyText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  wishlistRemoveButton: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F2F2F7',
  },
  wishlistRemoveText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default RecentCodiScreen;
