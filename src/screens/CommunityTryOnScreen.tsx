import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import type { RootStackParamList } from '../navigation/types';
import type { CodiClothingItem } from '../types/shopping';
import {
  buildClothingItemsFromUrls,
  fetchCommunityPost,
  importCommunityItemsToCloset,
} from '../services/communityService';
import { ClosetFullError, NotLoggedInError } from '../services/closetService';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CommunityTryOn'>;

const CommunityTryOnScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { postId } = route.params;

  const [items, setItems] = useState<CodiClothingItem[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const post = await fetchCommunityPost(postId);
      if (!post) {
        setItems([]);
        return;
      }
      const clothing = buildClothingItemsFromUrls(
        post.clothingImageUrls || [],
        post.clothingItems,
      );
      setItems(clothing);
      const initial: Record<number, boolean> = {};
      clothing.forEach((_, index) => {
        initial[index] = index < 2;
      });
      setSelected(initial);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: t('communityLoadFailed') });
    } finally {
      setLoading(false);
    }
  }, [postId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selectedItems = useMemo(
    () => items.filter((_, index) => selected[index]),
    [items, selected],
  );

  const toggleIndex = (index: number) => {
    setSelected(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const runImport = async (goToFitting: boolean) => {
    if (items.length === 0) {
      Toast.show({ type: 'info', text1: t('communityNoItems') });
      return;
    }
    if (selectedItems.length === 0) {
      Toast.show({ type: 'info', text1: t('communitySelectItemsFirst') });
      return;
    }
    setBusy(true);
    try {
      const added = await importCommunityItemsToCloset({ items: selectedItems });
      Toast.show({
        type: 'success',
        text1: t('communityImportedToCloset', { count: added }),
      });
      if (goToFitting) {
        const urls = selectedItems.map(item => item.imageUrl).slice(0, 2);
        navigation.navigate('Main', {
          screen: 'VirtualFitting',
          params:
            urls.length > 1
              ? { clothingUrls: urls }
              : { clothingUrl: urls[0] },
        });
      } else {
        navigation.navigate('Main', { screen: 'Closet' });
      }
    } catch (error) {
      if (error instanceof ClosetFullError) {
        Toast.show({
          type: 'error',
          text1: t('closetFull'),
          text2: t('closetFullMessage', { max: 30 }),
        });
      } else if (error instanceof NotLoggedInError) {
        Toast.show({ type: 'error', text1: t('communityNeedLogin') });
      } else {
        console.error(error);
        Toast.show({ type: 'error', text1: t('communityActionFailed') });
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6A0DAD" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('communityTryOn')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
        }}>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{t('communityTryOnHint')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('communitySelectItems')}</Text>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>{t('communityNoItems')}</Text>
        ) : (
          items.map((item, index) => {
            const checked = !!selected[index];
            return (
              <TouchableOpacity
                key={`${item.imageUrl}-${index}`}
                style={styles.itemRow}
                onPress={() => toggleIndex(index)}
                activeOpacity={0.8}>
                <View style={[styles.checkbox, checked && styles.checkboxOn]} />
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.productName ||
                    item.category ||
                    t('communityItemFallback', { index: index + 1 })}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.disabled]}
          disabled={busy}
          onPress={() => runImport(true)}>
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {t('communityImportAndFit')}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, busy && styles.disabled]}
          disabled={busy}
          onPress={() => runImport(false)}>
          <Text style={styles.secondaryBtnText}>
            {t('communityImportOnly')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: '#333333' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#222222' },
  infoBox: {
    backgroundColor: '#F6EDFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: { fontSize: 13, color: '#5A3A7A', lineHeight: 19 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F7F7F8',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#999999',
  },
  checkboxOn: {
    backgroundColor: '#6A0DAD',
    borderColor: '#6A0DAD',
  },
  itemImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#DDD' },
  itemName: { flex: 1, fontSize: 13, color: '#333333' },
  emptyText: { fontSize: 14, color: '#777777', marginBottom: 20 },
  primaryBtn: {
    backgroundColor: '#6A0DAD',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#D0D0D5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryBtnText: { color: '#333333', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});

export default CommunityTryOnScreen;
