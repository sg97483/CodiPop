import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  ClosetFullError,
  NotLoggedInError,
  saveClosetItem,
} from '../services/closetService';
import { CLOSET_SAVE_CATEGORIES, type ClosetSaveCategory } from '../constants/closet';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'MallScanResult'>;

const MallScanResultScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { showActionSheetWithOptions } = useActionSheet();

  const {
    images,
    productUrl,
    shopName,
    suggestedCategory,
    suggestedName,
    mode,
  } = route.params;

  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(images.length === 1 ? [0] : []),
  );
  const [saving, setSaving] = useState(false);

  const selectedCount = selected.size;
  const canSave = selectedCount > 0 && !saving;

  const title = useMemo(
    () =>
      mode === 'capture' ? t('mallCaptureResultTitle') : t('mallAutoScanTitle'),
    [mode, t],
  );

  const toggleIndex = (index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const pickCategoryAndSave = () => {
    const options = [...CLOSET_SAVE_CATEGORIES, t('cancel')];
    const cancelButtonIndex = options.length - 1;
    const preselect = suggestedCategory
      ? CLOSET_SAVE_CATEGORIES.indexOf(suggestedCategory)
      : -1;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: t('selectCategoryTitle'),
        destructiveButtonIndex: undefined,
      },
      async (selectedIndex?: number) => {
        if (
          selectedIndex === undefined ||
          selectedIndex === cancelButtonIndex
        ) {
          return;
        }
        const category = options[selectedIndex] as ClosetSaveCategory;
        await saveSelected(category);
      },
    );

    // ActionSheet doesn't support preselect reliably across platforms;
    // show toast hint when AI suggested a category.
    if (preselect >= 0) {
      Toast.show({
        type: 'info',
        text1: t('mallSuggestedCategory', { category: suggestedCategory }),
      });
    }
  };

  const saveSelected = async (category: ClosetSaveCategory) => {
    try {
      setSaving(true);
      const indexes = Array.from(selected).sort((a, b) => a - b);
      let saved = 0;

      for (const index of indexes) {
        const image = images[index];
        if (!image) {
          continue;
        }
        await saveClosetItem({
          imageUri: image.uri,
          category,
          source: 'mall',
          productUrl,
          shopName,
          productName: suggestedName,
        });
        saved += 1;
      }

      Toast.show({
        type: 'success',
        text1: t('mallAddedToCloset', { count: saved }),
      });
      navigation.navigate('Main', { screen: 'Closet' });
    } catch (error: any) {
      if (error instanceof ClosetFullError) {
        Toast.show({
          type: 'error',
          text1: t('closetFull'),
          text2: t('closetFullMessage', { max: 30 }),
        });
      } else if (error instanceof NotLoggedInError) {
        Toast.show({ type: 'error', text1: t('shareToClosetLoginRequired') });
      } else {
        console.error(error);
        Toast.show({ type: 'error', text1: t('closetSaveError') });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 28 }} />
      </View>

      <Text style={styles.heading}>{t('mallSelectImages')}</Text>

      <View style={styles.tipBox}>
        <Text style={styles.tipTitle}>{t('mallScanTipsTitle')}</Text>
        <Text style={styles.tipText}>• {t('mallScanTip1')}</Text>
        <Text style={styles.tipText}>• {t('mallScanTip2')}</Text>
      </View>

      <FlatList
        data={images}
        keyExtractor={(item, index) => `${item.uri}-${index}`}
        numColumns={2}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingBottom: insets.bottom + 160,
        }}
        renderItem={({ item, index }) => {
          const isOn = selected.has(index);
          return (
            <TouchableOpacity
              style={[styles.card, isOn && styles.cardSelected]}
              onPress={() => toggleIndex(index)}>
              <Image source={{ uri: item.uri }} style={styles.image} />
              <View style={[styles.check, isOn && styles.checkOn]}>
                {isOn ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 12) + 16 },
        ]}>
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveDisabled]}
          disabled={!canSave}
          onPress={pickCategoryAndSave}>
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveText}>
              {t('mallAddToCloset')}
              {selectedCount > 0 ? ` (${selectedCount})` : ''}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={saving}>
          <Text style={styles.cancelText}>{t('cancel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  back: { fontSize: 32, color: '#222', width: 28 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tipBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F4F4F6',
  },
  tipTitle: { fontWeight: '700', color: '#333', marginBottom: 6 },
  tipText: { color: '#666', fontSize: 13, lineHeight: 18 },
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F0F0F0',
  },
  cardSelected: { borderColor: '#1F1A17' },
  image: { width: '100%', aspectRatio: 1 },
  check: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFF',
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: '#1F1A17', borderColor: '#1F1A17' },
  checkMark: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
  },
  saveBtn: {
    backgroundColor: '#1F1A17',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  cancelBtn: {
    marginTop: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#333', fontWeight: '600', fontSize: 15 },
});

export default MallScanResultScreen;
