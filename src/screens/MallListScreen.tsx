import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SectionList,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { DEFAULT_MALLS, normalizeMallUrl, type MallEntry } from '../constants/malls';
import {
  addRecentMall,
  filterMalls,
  getFavoriteMallIds,
  getRecentMalls,
  removeRecentMall,
  toggleFavoriteMall,
  type RecentMallItem,
} from '../services/mallBrowserService';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type ListRow =
  | { kind: 'mall'; mall: MallEntry }
  | { kind: 'recent'; item: RecentMallItem };

const MallListScreen = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<RecentMallItem[]>([]);

  const load = useCallback(async () => {
    const [favIds, recentItems] = await Promise.all([
      getFavoriteMallIds(),
      getRecentMalls(),
    ]);
    setFavorites(favIds);
    setRecent(recentItems);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    load();
    return unsubscribe;
  }, [navigation, load]);

  const favoriteMalls = useMemo(
    () => DEFAULT_MALLS.filter(m => favorites.includes(m.id)),
    [favorites],
  );

  const filtered = useMemo(() => filterMalls(query), [query]);

  const sections = useMemo(() => {
    const result: { title: string; data: ListRow[] }[] = [];
    if (!query.trim() && favoriteMalls.length > 0) {
      result.push({
        title: t('mallFavorites'),
        data: favoriteMalls.map(mall => ({ kind: 'mall', mall })),
      });
    }
    if (!query.trim() && recent.length > 0) {
      result.push({
        title: t('mallRecent'),
        data: recent.map(item => ({ kind: 'recent', item })),
      });
    }
    result.push({
      title: query.trim() ? t('mallSearchResults') : t('mallAll'),
      data: filtered.map(mall => ({ kind: 'mall', mall })),
    });
    return result;
  }, [favoriteMalls, recent, filtered, query, t]);

  const openUrl = async (url: string, title?: string) => {
    Keyboard.dismiss();
    const normalized = normalizeMallUrl(url);
    if (!normalized) {
      return;
    }
    await addRecentMall({ url: normalized, name: title });
    navigation.navigate('MallBrowser', { url: normalized, title });
  };

  const onSubmitSearch = () => {
    const q = query.trim();
    if (!q) {
      return;
    }
    if (q.includes('.') || q.startsWith('http')) {
      openUrl(q);
      return;
    }
    if (filtered[0]) {
      openUrl(filtered[0].url, filtered[0].name);
    }
  };

  const renderRow = ({ item }: { item: ListRow }) => {
    if (item.kind === 'recent') {
      return (
        <TouchableOpacity
          style={styles.row}
          onPress={() => openUrl(item.item.url, item.item.name)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.item.name}
            </Text>
            <Text style={styles.rowUrl} numberOfLines={1}>
              {item.item.url}
            </Text>
          </View>
          <TouchableOpacity
            onPress={async () => {
              setRecent(await removeRecentMall(item.item.id));
            }}
            hitSlop={10}>
            <Text style={styles.metaIcon}>×</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    const mall = item.mall;
    const isFav = favorites.includes(mall.id);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openUrl(mall.url, mall.name)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{mall.name.charAt(0)}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{mall.name}</Text>
          <Text style={styles.rowUrl} numberOfLines={1}>
            {mall.host}
          </Text>
        </View>
        <TouchableOpacity
          onPress={async () => {
            setFavorites(await toggleFavoriteMall(mall.id));
          }}
          hitSlop={10}>
          <Text style={[styles.star, isFav && styles.starActive]}>
            {isFav ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('mallSearchPlaceholder')}
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={onSubmitSearch}
          />
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) =>
          item.kind === 'mall'
            ? `mall-${item.mall.id}`
            : `recent-${item.item.id}-${index}`
        }
        renderItem={renderRow}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Text style={styles.pageTitle}>{t('mallSitesTitle')}</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  back: { fontSize: 32, color: '#222', lineHeight: 34, width: 28 },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { fontSize: 16, color: '#888', marginRight: 6 },
  searchInput: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ECECF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#555' },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  rowUrl: { fontSize: 12, color: '#888', marginTop: 2 },
  star: { fontSize: 22, color: '#CCC', paddingHorizontal: 4 },
  starActive: { color: '#F5A623' },
  metaIcon: { fontSize: 22, color: '#AAA', paddingHorizontal: 6 },
});

export default MallListScreen;
