import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import type { RootStackParamList } from '../navigation/types';
import type { CodiClothingItem, SavedCodiRecord } from '../types/shopping';
import { createCommunityPost } from '../services/communityService';
import { addTickets, TICKET_REWARD_POST } from '../services/ticketService';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CommunityCreatePostScreen = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const user = auth().currentUser;

  const [codis, setCodis] = useState<SavedCodiRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setCodis([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('recentResults')
        .orderBy('createdAt', 'desc')
        .limit(40)
        .get();
      const items: SavedCodiRecord[] = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          imageUrl: data.imageUrl,
          clothingImageUrls: data.clothingImageUrls || [],
          clothingItems: (data.clothingItems || []) as CodiClothingItem[],
          isLiked: data.isLiked || false,
          createdAt: data.createdAt || null,
        };
      });
      setCodis(items);
      setSelectedId(prev => prev || items[0]?.id || null);
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: t('communityLoadFailed') });
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selected = codis.find(item => item.id === selectedId) || null;

  const onPublish = async () => {
    if (!user || !selected) {
      Toast.show({ type: 'info', text1: t('communitySelectCodiFirst') });
      return;
    }
    setPublishing(true);
    try {
      const postId = await createCommunityPost({
        authorId: user.uid,
        authorName: user.displayName || user.email || 'CodiPOP',
        authorPhotoUrl: user.photoURL,
        imageUrl: selected.imageUrl,
        caption,
        tag,
        clothingImageUrls: selected.clothingImageUrls,
        clothingItems: selected.clothingItems,
        sourceCodiId: selected.id,
      });
      await addTickets(TICKET_REWARD_POST, 'COMMUNITY_POST');
      Toast.show({
        type: 'success',
        text1: t('communityPublished'),
        text2: `🎉 코디 공유 보너스 티켓 +${TICKET_REWARD_POST}장 지급 완료!`,
      });
      navigation.replace('CommunityPostDetail', { postId });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: t('communityPublishFailed') });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('communityCreate')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#6A0DAD" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.hint}>{t('communityCreateHint')}</Text>
          {codis.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>{t('communityNoCodi')}</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={codis}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={{
                  paddingHorizontal: 12,
                  paddingBottom: 16,
                }}
                columnWrapperStyle={{ gap: 8 }}
                ListHeaderComponent={
                  <View style={styles.form}>
                    <TextInput
                      style={styles.input}
                      placeholder={t('communityCaptionPlaceholder')}
                      placeholderTextColor="#999999"
                      value={caption}
                      onChangeText={setCaption}
                      maxLength={80}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={t('communityTagPlaceholder')}
                      placeholderTextColor="#999999"
                      value={tag}
                      onChangeText={setTag}
                      maxLength={20}
                    />
                    <View style={styles.eulaBox}>
                      <Text style={styles.eulaTitle}>📌 커뮤니티 이용약관(EULA) 및 무관용 정책</Text>
                      <Text style={styles.eulaText}>
                        타인을 불쾌하게 하거나 부적절한 콘텐츠(음란/폭력/혐오/스팸) 및 욕설 작성 시 무관용(Zero Tolerance) 원칙에 따라 24시간 내 삭제 조치되며, 계정이 영구 차단될 수 있습니다.
                      </Text>
                    </View>
                    <Text style={styles.pickLabel}>{t('communityPickCodi')}</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const active = item.id === selectedId;
                  return (
                    <TouchableOpacity
                      style={[styles.codiCard, active && styles.codiCardActive]}
                      onPress={() => setSelectedId(item.id)}>
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.codiImage}
                      />
                    </TouchableOpacity>
                  );
                }}
              />

              <View
                style={[
                  styles.bottomBar,
                  { paddingBottom: Math.max(insets.bottom, 12) },
                ]}>
                <TouchableOpacity
                  style={[styles.publishBtn, publishing && styles.disabled]}
                  disabled={publishing || !selected}
                  onPress={onPublish}>
                  {publishing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.publishText}>{t('communityPublish')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#222222' },
  hint: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
    color: '#777777',
    lineHeight: 18,
  },
  form: { paddingHorizontal: 4, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
    fontSize: 14,
    color: '#222222',
  },
  eulaBox: {
    backgroundColor: '#F7F4FA',
    borderWidth: 1,
    borderColor: '#D8CBE6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  eulaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6A0DAD',
    marginBottom: 4,
  },
  eulaText: {
    fontSize: 11,
    color: '#555555',
    lineHeight: 16,
  },
  pickLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
    marginTop: 4,
    marginBottom: 8,
  },
  codiCard: {
    flex: 1,
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  codiCardActive: { borderColor: '#6A0DAD' },
  codiImage: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#EEE' },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  publishBtn: {
    backgroundColor: '#6A0DAD',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  publishText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
  emptyText: {
    fontSize: 14,
    color: '#777777',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

export default CommunityCreatePostScreen;
