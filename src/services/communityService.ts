import firestore from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CodiClothingItem } from '../types/shopping';
import { ClosetSaveCategory, CLOSET_SAVE_CATEGORIES } from '../constants/closet';
import {
  ClosetFullError,
  NotLoggedInError,
  saveClosetItem,
} from './closetService';

const BLOCKED_USERS_KEY = '@codipop_blocked_users';
const REPORTED_POSTS_KEY = '@codipop_reported_posts';

export async function getBlockedUsers(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function blockUser(targetUserId: string): Promise<void> {
  const current = await getBlockedUsers();
  if (!current.includes(targetUserId)) {
    const updated = [...current, targetUserId];
    await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(updated));
    const user = auth().currentUser;
    if (user) {
      firestore().collection('users').doc(user.uid).collection('blockedUsers').doc(targetUserId).set({
        blockedAt: firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
    }
  }
}

export async function getReportedPosts(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(REPORTED_POSTS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function reportPost(params: { postId: string; reason?: string }): Promise<void> {
  const current = await getReportedPosts();
  if (!current.includes(params.postId)) {
    const updated = [...current, params.postId];
    await AsyncStorage.setItem(REPORTED_POSTS_KEY, JSON.stringify(updated));
    const user = auth().currentUser;
    firestore().collection('reportedPosts').add({
      postId: params.postId,
      reporterId: user?.uid || 'anonymous',
      reason: params.reason || 'Objectionable Content',
      reportedAt: firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  }
}

export type CommunityPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string;
  imageUrl: string;
  caption?: string;
  tag?: string;
  clothingImageUrls?: string[];
  clothingItems?: CodiClothingItem[];
  sourceCodiId?: string;
  likeCount: number;
  saveCount: number;
  createdAt?: FirebaseFirestoreTypes.Timestamp | null;
  likedByMe?: boolean;
  savedByMe?: boolean;
};

function postsCollection() {
  return firestore().collection('communityPosts');
}

function mapPostDoc(
  doc: FirebaseFirestoreTypes.QueryDocumentSnapshot | FirebaseFirestoreTypes.DocumentSnapshot,
): CommunityPost {
  const data = doc.data() || {};
  return {
    id: doc.id,
    authorId: data.authorId || '',
    authorName: data.authorName || 'CodiPOP',
    authorPhotoUrl: data.authorPhotoUrl || undefined,
    imageUrl: data.imageUrl || '',
    caption: data.caption || '',
    tag: data.tag || '',
    clothingImageUrls: data.clothingImageUrls || [],
    clothingItems: data.clothingItems || [],
    sourceCodiId: data.sourceCodiId || undefined,
    likeCount: data.likeCount || 0,
    saveCount: data.saveCount || 0,
    createdAt: data.createdAt || null,
  };
}

export async function createCommunityPost(params: {
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string | null;
  imageUrl: string;
  caption?: string;
  tag?: string;
  clothingImageUrls?: string[];
  clothingItems?: CodiClothingItem[];
  sourceCodiId?: string;
}): Promise<string> {
  const ref = await postsCollection().add({
    authorId: params.authorId,
    authorName: params.authorName || 'CodiPOP',
    authorPhotoUrl: params.authorPhotoUrl || '',
    imageUrl: params.imageUrl,
    caption: params.caption?.trim() || '',
    tag: params.tag?.trim() || '',
    clothingImageUrls: (params.clothingImageUrls || []).filter(Boolean),
    clothingItems: (params.clothingItems || [])
      .filter(item => !!item?.imageUrl)
      .map(item => ({
        imageUrl: item.imageUrl,
        closetItemId: item.closetItemId || '',
        category: item.category || '',
        productName: item.productName || '',
        productPrice: item.productPrice || 0,
        productUrl: item.productUrl || '',
        shopName: item.shopName || '',
      })),
    sourceCodiId: params.sourceCodiId || '',
    likeCount: 0,
    saveCount: 0,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function fetchCommunityFeed(limit = 40): Promise<CommunityPost[]> {
  const snapshot = await postsCollection()
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  const [blockedUsers, reportedPosts] = await Promise.all([
    getBlockedUsers(),
    getReportedPosts(),
  ]);
  return snapshot.docs
    .map(mapPostDoc)
    .filter(p => !blockedUsers.includes(p.authorId) && !reportedPosts.includes(p.id));
}

export async function fetchCommunityPost(postId: string): Promise<CommunityPost | null> {
  const [blockedUsers, reportedPosts] = await Promise.all([
    getBlockedUsers(),
    getReportedPosts(),
  ]);
  if (reportedPosts.includes(postId)) {
    return null;
  }
  const doc = await postsCollection().doc(postId).get();
  if (!doc.exists) {
    return null;
  }
  const post = mapPostDoc(doc);
  if (blockedUsers.includes(post.authorId)) {
    return null;
  }
  return post;
}

export async function deleteCommunityPost(params: {
  postId: string;
  userId: string;
}): Promise<void> {
  const postRef = postsCollection().doc(params.postId);
  const postSnap = await postRef.get();
  if (!postSnap.exists) {
    throw new Error('POST_NOT_FOUND');
  }
  if (postSnap.data()?.authorId !== params.userId) {
    throw new Error('NOT_AUTHOR');
  }

  const likesSnap = await postRef.collection('likes').limit(400).get();
  const batch = firestore().batch();
  likesSnap.docs.forEach(likeDoc => {
    batch.delete(likeDoc.ref);
  });
  batch.delete(postRef);
  await batch.commit();
}

export async function fetchSavedCommunityPosts(userId: string): Promise<CommunityPost[]> {
  const savedSnap = await firestore()
    .collection('users')
    .doc(userId)
    .collection('savedCommunityPosts')
    .orderBy('createdAt', 'desc')
    .limit(60)
    .get();

  const [blockedUsers, reportedPosts] = await Promise.all([
    getBlockedUsers(),
    getReportedPosts(),
  ]);

  const posts: CommunityPost[] = [];
  for (const saved of savedSnap.docs) {
    const postId = saved.id;
    if (reportedPosts.includes(postId)) {
      continue;
    }
    const post = await fetchCommunityPost(postId);
    if (post && !blockedUsers.includes(post.authorId)) {
      posts.push({ ...post, savedByMe: true });
    }
  }
  return posts;
}

export async function hasLikedPost(postId: string, userId: string): Promise<boolean> {
  const doc = await postsCollection().doc(postId).collection('likes').doc(userId).get();
  return typeof doc.exists === 'function' ? doc.exists() : Boolean(doc.exists);
}

export async function hasSavedPost(postId: string, userId: string): Promise<boolean> {
  const doc = await firestore()
    .collection('users')
    .doc(userId)
    .collection('savedCommunityPosts')
    .doc(postId)
    .get();
  return typeof doc.exists === 'function' ? doc.exists() : Boolean(doc.exists);
}

export async function togglePostLike(params: {
  postId: string;
  userId: string;
  currentlyLiked: boolean;
}): Promise<{ liked: boolean; likeCount: number }> {
  const postRef = postsCollection().doc(params.postId);
  const likeRef = postRef.collection('likes').doc(params.userId);

  return firestore().runTransaction(async tx => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists) {
      throw new Error('POST_NOT_FOUND');
    }
    const currentCount = postSnap.data()?.likeCount || 0;

    if (params.currentlyLiked) {
      tx.delete(likeRef);
      const next = Math.max(0, currentCount - 1);
      tx.update(postRef, { likeCount: next });
      return { liked: false, likeCount: next };
    }

    tx.set(likeRef, {
      userId: params.userId,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    const next = currentCount + 1;
    tx.update(postRef, { likeCount: next });
    return { liked: true, likeCount: next };
  });
}

export async function togglePostSave(params: {
  postId: string;
  userId: string;
  currentlySaved: boolean;
  imageUrl?: string;
  caption?: string;
}): Promise<{ saved: boolean; saveCount: number }> {
  const postRef = postsCollection().doc(params.postId);
  const savedRef = firestore()
    .collection('users')
    .doc(params.userId)
    .collection('savedCommunityPosts')
    .doc(params.postId);

  return firestore().runTransaction(async tx => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists) {
      throw new Error('POST_NOT_FOUND');
    }
    const currentCount = postSnap.data()?.saveCount || 0;

    if (params.currentlySaved) {
      tx.delete(savedRef);
      const next = Math.max(0, currentCount - 1);
      tx.update(postRef, { saveCount: next });
      return { saved: false, saveCount: next };
    }

    tx.set(savedRef, {
      postId: params.postId,
      imageUrl: params.imageUrl || postSnap.data()?.imageUrl || '',
      caption: params.caption || postSnap.data()?.caption || '',
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    const next = currentCount + 1;
    tx.update(postRef, { saveCount: next });
    return { saved: true, saveCount: next };
  });
}

function resolveCategory(category?: string): ClosetSaveCategory {
  if (
    category &&
    (CLOSET_SAVE_CATEGORIES as readonly string[]).includes(category)
  ) {
    return category as ClosetSaveCategory;
  }
  return 'TOPS';
}

export async function importCommunityItemsToCloset(params: {
  items: CodiClothingItem[];
}): Promise<number> {
  let added = 0;
  for (const item of params.items) {
    if (!item.imageUrl) {
      continue;
    }
    try {
      await saveClosetItem({
        imageUri: item.imageUrl,
        category: resolveCategory(item.category),
        source: 'community',
        productName: item.productName,
        productPrice: item.productPrice,
        productUrl: item.productUrl,
        shopName: item.shopName,
      });
      added += 1;
    } catch (error) {
      if (error instanceof ClosetFullError || error instanceof NotLoggedInError) {
        throw error;
      }
      console.warn('community closet import failed for item', error);
    }
  }
  return added;
}

export function buildClothingItemsFromUrls(
  urls: string[],
  items?: CodiClothingItem[],
): CodiClothingItem[] {
  if (items && items.length > 0) {
    return items.filter(item => item.imageUrl);
  }
  return urls.filter(Boolean).map(imageUrl => ({ imageUrl }));
}
