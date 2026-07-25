import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from '../navigation/types';
import {
  fetchCommunityFeed,
  fetchSavedCommunityPosts,
  type CommunityPost,
} from '../services/communityService';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FeedTab = 'latest' | 'saved';

const CommunityScreen = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const user = auth().currentUser;

  const [tab, setTab] = useState<FeedTab>('latest');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }
    try {
      const data =
        tab === 'saved'
          ? await fetchSavedCommunityPosts(user.uid)
          : await fetchCommunityFeed();
      setPosts(data);
    } catch (error) {
      console.error('community feed load failed', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderPost = ({ item }: { item: CommunityPost }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate('CommunityPostDetail', { postId: item.id })
      }>
      <View style={styles.cardHeader}>
        {item.authorPhotoUrl ? (
          <Image source={{ uri: item.authorPhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>
              {(item.authorName || '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.cardHeaderText}>
          <Text style={styles.authorName} numberOfLines={1}>
            {item.authorName}
          </Text>
          <Text style={styles.caption} numberOfLines={1}>
            {item.caption || t('communityDefaultCaption')}
          </Text>
        </View>
        {!!item.tag && (
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>{item.tag}</Text>
          </View>
        )}
      </View>
      <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      <View style={styles.cardFooter}>
        <Text style={styles.metaText}>
          {t('communityLikes', { count: item.likeCount })}
        </Text>
        <Text style={styles.metaText}>
          {t('communitySaves', { count: item.saveCount })}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.tryOnHint}>{t('communityTryOn')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('communityTitle')}</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CommunityCreatePost')}>
          <Text style={styles.createButtonText}>{t('communityCreate')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'latest' && styles.tabActive]}
          onPress={() => setTab('latest')}>
          <Text style={[styles.tabText, tab === 'latest' && styles.tabTextActive]}>
            {t('communityTabLatest')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'saved' && styles.tabActive]}
          onPress={() => setTab('saved')}>
          <Text style={[styles.tabText, tab === 'saved' && styles.tabTextActive]}>
            {t('communityTabSaved')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#6A0DAD" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          contentContainerStyle={
            posts.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                {tab === 'saved'
                  ? t('communitySavedEmptyTitle')
                  : t('communityEmptyTitle')}
              </Text>
              <Text style={styles.emptyMessage}>
                {tab === 'saved'
                  ? t('communitySavedEmptyMessage')
                  : t('communityEmptyMessage')}
              </Text>
              {tab === 'latest' && (
                <TouchableOpacity
                  style={styles.emptyCta}
                  onPress={() => navigation.navigate('CommunityCreatePost')}>
                  <Text style={styles.emptyCtaText}>{t('communityCreate')}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  createButton: {
    backgroundColor: '#6A0DAD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  createButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F3F3F5',
  },
  tabActive: { backgroundColor: '#EDE0F7' },
  tabText: { fontSize: 13, color: '#666666', fontWeight: '500' },
  tabTextActive: { color: '#6A0DAD', fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    marginBottom: 18,
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: {
    backgroundColor: '#E8E0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#6A0DAD' },
  cardHeaderText: { flex: 1, minWidth: 0 },
  authorName: { fontSize: 13, fontWeight: '700', color: '#222222' },
  caption: { fontSize: 11, color: '#888888', marginTop: 2 },
  tagPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tagText: { fontSize: 11, color: '#555555' },
  cardImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#EEEEEE',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  metaText: { fontSize: 12, color: '#666666' },
  tryOnHint: { fontSize: 12, fontWeight: '700', color: '#6A0DAD' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  emptyBox: { alignItems: 'center', paddingHorizontal: 20 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyCta: {
    backgroundColor: '#6A0DAD',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyCtaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});

export default CommunityScreen;
