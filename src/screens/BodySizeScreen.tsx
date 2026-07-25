import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  getBodySizeProfile,
  saveBodySizeProfile,
} from '../services/bodySizeService';
import {
  recommendClothingSize,
} from '../services/sizeRecommendService';
import {
  CLOTHING_SIZE_LABELS,
  type ClothingSizeLabel,
} from '../types/bodySize';

const BodySizeScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heightText, setHeightText] = useState('');
  const [weightText, setWeightText] = useState('');
  const [usualSize, setUsualSize] = useState<ClothingSizeLabel>('M');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await getBodySizeProfile();
      if (profile) {
        setHeightText(String(profile.heightCm));
        setWeightText(String(profile.weightKg));
        setUsualSize(profile.usualSize);
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: t('sizeLoadFailed') });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const heightCm = Number(heightText);
  const weightKg = Number(weightText);
  const canPreview =
    heightCm >= 120 &&
    heightCm <= 230 &&
    weightKg >= 30 &&
    weightKg <= 200;

  const preview = canPreview
    ? recommendClothingSize({
        heightCm,
        weightKg,
        usualSize,
      })
    : null;

  const onReset = () => {
    setHeightText('');
    setWeightText('');
    setUsualSize('M');
  };

  const onSave = async () => {
    if (!canPreview) {
      Toast.show({ type: 'info', text1: t('sizeInputInvalid') });
      return;
    }
    setSaving(true);
    try {
      await saveBodySizeProfile({
        heightCm,
        weightKg,
        usualSize,
      });
      Toast.show({ type: 'success', text1: t('sizeSaved') });
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
      // 게이트 모드면 App이 bodySize 저장을 감지하고 Main으로 전환합니다.
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: t('sizeSaveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const showBack = navigation.canGoBack();

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {showBack ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
        <Text style={styles.headerTitle}>{t('sizeInputTitle')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#6A0DAD" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
          }}>
          <Text style={styles.lead}>
            {showBack ? t('sizeInputLead') : t('sizeGateLead')}
          </Text>
          <Text style={styles.subLead}>
            {showBack ? t('sizeInputSubLead') : t('sizeGateSubLead')}
          </Text>

          <View style={styles.row}>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={heightText}
                onChangeText={setHeightText}
                keyboardType="number-pad"
                placeholder="170"
                placeholderTextColor="#AAAAAA"
                maxLength={3}
              />
              <Text style={styles.unit}>cm</Text>
            </View>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={weightText}
                onChangeText={setWeightText}
                keyboardType="decimal-pad"
                placeholder="65"
                placeholderTextColor="#AAAAAA"
                maxLength={5}
              />
              <Text style={styles.unit}>kg</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>{t('sizeUsualLabel')}</Text>
          <View style={styles.sizeGrid}>
            {CLOTHING_SIZE_LABELS.map(size => {
              const active = usualSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  style={[styles.sizeChip, active && styles.sizeChipActive]}
                  onPress={() => setUsualSize(size)}>
                  <Text
                    style={[
                      styles.sizeChipText,
                      active && styles.sizeChipTextActive,
                    ]}>
                    {size === 'XXL+' ? t('sizeXxlPlus') : size}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {preview && (
            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>
                {t('sizeRecommendLabel', { size: preview.recommendedSize })}
              </Text>
              <Text style={styles.previewReason}>
                {t(preview.reasonKey, preview.reasonParams)}
              </Text>
            </View>
          )}

          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
              <Text style={styles.resetText}>{t('sizeReset')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.disabled]}
              onPress={onSave}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>{t('sizeSave')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: '#333333' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#222222' },
  lead: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 8,
  },
  subLead: {
    fontSize: 13,
    color: '#777777',
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 18,
  },
  row: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  inputBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, fontSize: 18, color: '#222222', paddingVertical: 4 },
  unit: { fontSize: 14, color: '#888888', marginLeft: 6 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 10,
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeChip: {
    width: '23%',
    minWidth: 70,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  sizeChipActive: {
    borderColor: '#6A0DAD',
    backgroundColor: '#F6EDFC',
  },
  sizeChipText: { fontSize: 13, color: '#555555', fontWeight: '600' },
  sizeChipTextActive: { color: '#6A0DAD' },
  previewBox: {
    marginTop: 20,
    backgroundColor: '#F7F3FB',
    borderRadius: 12,
    padding: 14,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A1A7A',
    marginBottom: 6,
  },
  previewReason: { fontSize: 13, color: '#6A5A7A', lineHeight: 18 },
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
  },
  resetBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetText: { fontSize: 15, fontWeight: '600', color: '#333333' },
  saveBtn: {
    flex: 1.2,
    backgroundColor: '#111111',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  disabled: { opacity: 0.6 },
});

export default BodySizeScreen;
