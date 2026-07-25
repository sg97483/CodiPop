import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ProductInfo } from '../types/shopping';
import { CLOTHING_SIZE_LABELS } from '../types/bodySize';

type ProductInfoModalProps = {
  visible: boolean;
  initialValue?: ProductInfo;
  onClose: () => void;
  onSave: (product: ProductInfo) => void;
};

const ProductInfoModal = ({
  visible,
  initialValue,
  onClose,
  onSave,
}: ProductInfoModalProps) => {
  const { t } = useTranslation();
  const [productName, setProductName] = useState('');
  const [shopName, setShopName] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productSize, setProductSize] = useState('');

  useEffect(() => {
    if (visible) {
      setProductName(initialValue?.productName || '');
      setShopName(initialValue?.shopName || '');
      setProductUrl(initialValue?.productUrl || '');
      setProductPrice(
        initialValue?.productPrice ? String(initialValue.productPrice) : '',
      );
      setProductSize(initialValue?.productSize || '');
    }
  }, [visible, initialValue]);

  const handleSave = () => {
    onSave({
      productName: productName.trim(),
      shopName: shopName.trim(),
      productUrl: productUrl.trim(),
      productPrice: Number(productPrice.replace(/[^0-9]/g, '')) || 0,
      productSize: productSize.trim(),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('productInfoTitle')}</Text>
          <Text style={styles.subtitle}>{t('productInfoSubtitle')}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>{t('productName')}</Text>
            <TextInput
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder={t('productNamePlaceholder')}
            />

            <Text style={styles.label}>{t('shopName')}</Text>
            <TextInput
              style={styles.input}
              value={shopName}
              onChangeText={setShopName}
              placeholder={t('shopNamePlaceholder')}
            />

            <Text style={styles.label}>{t('productPrice')}</Text>
            <TextInput
              style={styles.input}
              value={productPrice}
              onChangeText={setProductPrice}
              keyboardType="number-pad"
              placeholder="89000"
            />

            <Text style={styles.label}>{t('productSizeLabel')}</Text>
            <Text style={styles.sizeHint}>{t('productSizeHint')}</Text>
            <View style={styles.sizeRow}>
              {CLOTHING_SIZE_LABELS.map(size => {
                const active = productSize === size;
                return (
                  <TouchableOpacity
                    key={size}
                    style={[styles.sizeChip, active && styles.sizeChipActive]}
                    onPress={() =>
                      setProductSize(prev => (prev === size ? '' : size))
                    }>
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

            <Text style={styles.label}>{t('productUrl')}</Text>
            <TextInput
              style={styles.input}
              value={productUrl}
              onChangeText={setProductUrl}
              autoCapitalize="none"
              placeholder="https://..."
            />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 13,
    color: '#666',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginTop: 10,
  },
  sizeHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111',
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeChip: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sizeChipActive: {
    borderColor: '#6A0DAD',
    backgroundColor: '#F6EDFC',
  },
  sizeChipText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
  },
  sizeChipTextActive: {
    color: '#6A0DAD',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  cancelText: {
    color: '#333',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6A0DAD',
    alignItems: 'center',
  },
  saveText: {
    color: '#FFF',
    fontWeight: '700',
  },
});

export default ProductInfoModal;
