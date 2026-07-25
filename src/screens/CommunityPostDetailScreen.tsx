import React, { useCallback, useState } from 'react';
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
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useActionSheet } from '@expo/react-native-action-sheet';
import type { RootStackParamList } from '../navigation/types';
import {
  deleteCommunityPost,
  fetchCommunityPost,
  hasLikedPost,
  hasSavedPost,
  togglePostLike,
  togglePostSave,
  reportPost,
  blockUser,
  type CommunityPost,
} from '../services/communityService';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CommunityPostDetail'>;

const CommunityPostDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const user = auth().currentUser;
  const { showActionSheetWithOptions } = useActionSheet();
  const { postId } = route.params;

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCommunityPost(postId);
      setPost(data);
      if (user && data) {
        const [isLiked, isSaved] = await Promise.all([
          hasLikedPost(postId, user.uid),
          hasSavedPost(postId, user.uid),
        ]);
        setLiked(isLiked);
        setSaved(isSaved);
      }
    } catch (error) {
      console.error('community detail load failed', error);
      Toast.show({ type: 'error', text1: t('communityLoadFailed') });
    } finally {
      setLoading(false);
    }
  }, [postId, t, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onToggleLike = async () => {
    if (!user || !post || busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await togglePostLike({
        postId,
        userId: user.uid,
        currentlyLiked: liked,
      });
      setLiked(result.liked);
      setPost(prev => (prev ? { ...prev, likeCount: result.likeCount } : prev));
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: t('communityActionFailed') });
    } finally {
      setBusy(false);
    }
  };

  const onToggleSave = async () => {
    if (!user || !post || busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await togglePostSave({
        postId,
        userId: user.uid,
        currentlySaved: saved,
        imageUrl: post.imageUrl,
        caption: post.caption,
      });
      setSaved(result.saved);
      setPost(prev => (prev ? { ...prev, saveCount: result.saveCount } : prev));
      Toast.show({
        type: 'success',
        text1: result.saved ? t('communitySaved') : t('communityUnsaved'),
      });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: t('communityActionFailed') });
    } finally {
      setBusy(false);
    }
  };

  const onDelete = () => {
    if (!user || !post || busy) {
      return;
    }
    Alert.alert(t('communityDeleteTitle'), t('communityDeleteMessage'), [
      { text: t('communityDeleteCancel'), style: 'cancel' },
      {
        text: t('communityDeleteConfirm'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteCommunityPost({ postId, userId: user.uid });
            Toast.show({ type: 'success', text1: t('communityDeleted') });
            navigation.goBack();
          } catch (error) {
            console.error(error);
            Toast.show({ type: 'error', text1: t('communityDeleteFailed') });
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const onReportPost = () => {
    if (!post) return;
    Alert.alert(
      '🚨 게시물 신고하기',
      '이 게시물을 부적절한 콘텐츠(음란/폭력/혐오/스팸 등)로 신고하시겠습니까?\n\n신고 접수 시 24시간 내에 관리자 검토 후 삭제 및 작성자 제재 등 무관용(Zero Tolerance) 원칙에 따른 조치가 취해지며, 내 커뮤니티 화면에서 즉시 숨김 처리됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '신고 및 숨김 처리',
          style: 'destructive',
          onPress: async () => {
            await reportPost({ postId: post.id });
            Toast.show({ type: 'success', text1: '🚨 게시물이 신고 접수 및 즉시 숨김 처리되었습니다.' });
            navigation.goBack();
          },
        },
      ],
    );
  };

  const onBlockUser = () => {
    if (!post) return;
    Alert.alert(
      '🚫 작성자 차단하기',
      `'${post.authorName}' 님의 모든 게시물을 차단하고 내 화면에서 즉시 숨기시겠습니까?\n\n차단된 작성자의 글은 더 이상 피드에 노출되지 않으며, 부적절한 사용자로 함께 신고됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '작성자 차단하기',
          style: 'destructive',
          onPress: async () => {
            await blockUser(post.authorId);
            Toast.show({ type: 'success', text1: '🚫 사용자가 차단되어 해당 작성자의 글이 모두 숨겨졌습니다.' });
            navigation.goBack();
          },
        },
      ],
    );
  };

  const onShowMoreMenu = () => {
    if (!post) return;
    showActionSheetWithOptions(
      {
        options: [
          '🚨 게시물 신고하기 (Report Post)',
          `🚫 '${post.authorName}' 작성자 차단하기 (Block User)`,
          '취소 (Cancel)',
        ],
        cancelButtonIndex: 2,
        destructiveButtonIndex: 1,
      },
      selectedIndex => {
        if (selectedIndex === 0) {
          onReportPost();
        } else if (selectedIndex === 1) {
          onBlockUser();
        }
      },
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6A0DAD" />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>{t('communityPostMissing')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>{t('communityBack')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const clothingItems =
    post.clothingItems && post.clothingItems.length > 0
      ? post.clothingItems
      : (post.clothingImageUrls || []).map(imageUrl => ({ imageUrl, productName: undefined as string | undefined, category: undefined as string | undefined }));
  const isAuthor = !!user && post.authorId === user.uid;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('communityDetailTitle')}</Text>
        {isAuthor ? (
          <TouchableOpacity
            onPress={onDelete}
            disabled={busy}
            style={styles.deleteHeaderBtn}>
            <Text style={styles.deleteHeaderText}>{t('communityDelete')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onShowMoreMenu}
            style={styles.menuHeaderBtn}>
            <Text style={styles.menuHeaderText}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={styles.authorRow}>
          {post.authorPhotoUrl ? (
            <Image source={{ uri: post.authorPhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>
                {(post.authorName || '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{post.authorName}</Text>
            {!!post.tag && <Text style={styles.tagLine}>#{post.tag}</Text>}
          </View>
        </View>

        <Image source={{ uri: post.imageUrl }} style={styles.heroImage} />

        <View style={styles.body}>
          <Text style={styles.caption}>
            {post.caption || t('communityDefaultCaption')}
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, liked && styles.actionBtnActive]}
              onPress={onToggleLike}
              disabled={busy}>
              <Text
                style={[
                  styles.actionBtnText,
                  liked && styles.actionBtnTextActive,
                ]}>
                {liked ? t('communityLiked') : t('communityLike')} · {post.likeCount}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, saved && styles.actionBtnActive]}
              onPress={onToggleSave}
              disabled={busy}>
              <Text
                style={[
                  styles.actionBtnText,
                  saved && styles.actionBtnTextActive,
                ]}>
                {saved ? t('communitySavedShort') : t('communitySave')} ·{' '}
                {post.saveCount}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() =>
              navigation.navigate('CommunityTryOn', { postId: post.id })
            }>
            <Text style={styles.primaryBtnText}>{t('communityTryOn')}</Text>
          </TouchableOpacity>

          {isAuthor ? (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={onDelete}
              disabled={busy}>
              <Text style={styles.deleteBtnText}>{t('communityDelete')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.reportBlockRow}>
              <TouchableOpacity
                style={styles.reportBtn}
                onPress={onReportPost}>
                <Text style={styles.reportBtnText}>🚨 게시물 신고</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.blockBtn}
                onPress={onBlockUser}>
                <Text style={styles.blockBtnText}>🚫 작성자 차단</Text>
              </TouchableOpacity>
            </View>
          )}

          {clothingItems.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t('communityItemsTitle')}</Text>
              {clothingItems.map((item, index) => (
                <View
                  key={`${item.imageUrl}-${index}`}
                  style={styles.itemRow}>
                  <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.productName ||
                      item.category ||
                      t('communityItemFallback', { index: index + 1 })}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
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
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    backgroundColor: '#E8E0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', color: '#6A0DAD' },
  authorName: { fontSize: 15, fontWeight: '700', color: '#222222' },
  tagLine: { fontSize: 12, color: '#888888', marginTop: 2 },
  heroImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#EEEEEE',
  },
  body: { paddingHorizontal: 16, paddingTop: 14 },
  caption: { fontSize: 15, color: '#333333', lineHeight: 22, marginBottom: 14 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  actionBtnActive: {
    borderColor: '#6A0DAD',
    backgroundColor: '#F6EDFC',
  },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#444444' },
  actionBtnTextActive: { color: '#6A0DAD' },
  primaryBtn: {
    backgroundColor: '#6A0DAD',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  deleteBtn: {
    borderWidth: 1,
    borderColor: '#E5A0A0',
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteBtnText: { color: '#C0392B', fontSize: 14, fontWeight: '700' },
  deleteHeaderBtn: {
    minWidth: 36,
    paddingHorizontal: 4,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteHeaderText: { fontSize: 13, fontWeight: '600', color: '#C0392B' },
  menuHeaderBtn: {
    minWidth: 36,
    paddingHorizontal: 8,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuHeaderText: { fontSize: 20, fontWeight: '700', color: '#333333' },
  reportBlockRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  reportBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5A0A0',
    backgroundColor: '#FFF8F8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reportBtnText: { color: '#C0392B', fontSize: 13, fontWeight: '600' },
  blockBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#AAAAAA',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  blockBtnText: { color: '#555555', fontSize: 13, fontWeight: '600' },
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
  itemImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#DDD' },
  itemName: { flex: 1, fontSize: 13, color: '#333333' },
  emptyText: { fontSize: 15, color: '#666666', marginBottom: 12 },
  linkText: { color: '#6A0DAD', fontWeight: '600' },
});

export default CommunityPostDetailScreen;
