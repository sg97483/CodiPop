import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import RNFS from 'react-native-fs';
import { MAX_CLOSET_ITEMS, ClosetSaveCategory } from '../constants/closet';
import type { ProductInfo } from '../types/shopping';

export class ClosetFullError extends Error {
  constructor() {
    super('CLOSET_FULL');
    this.name = 'ClosetFullError';
  }
}

export class NotLoggedInError extends Error {
  constructor() {
    super('NOT_LOGGED_IN');
    this.name = 'NotLoggedInError';
  }
}

export async function getClosetItemCount(userId: string): Promise<number> {
  const snapshot = await firestore()
    .collection('users')
    .doc(userId)
    .collection('closet')
    .get();
  return snapshot.size;
}

async function resolveLocalImageUri(imageUri: string): Promise<string> {
  if (
    imageUri.startsWith('file://') ||
    imageUri.startsWith('content://') ||
    imageUri.startsWith('/')
  ) {
    return imageUri.startsWith('/') && !imageUri.startsWith('file://')
      ? `file://${imageUri}`
      : imageUri;
  }

  if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.jpg`;
    const dest = `${RNFS.CachesDirectoryPath}/${filename}`;
    const result = await RNFS.downloadFile({
      fromUrl: imageUri,
      toFile: dest,
    }).promise;
    if (result.statusCode && result.statusCode >= 400) {
      throw new Error(`IMAGE_DOWNLOAD_FAILED_${result.statusCode}`);
    }
    return `file://${dest}`;
  }

  return imageUri;
}

export async function uploadClosetImage(
  localImageUri: string,
  userId: string,
): Promise<string> {
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}.jpg`;
  const reference = storage().ref(`users/${userId}/closet/${filename}`);
  const uploadUri = await resolveLocalImageUri(localImageUri);
  await reference.putFile(uploadUri);
  return reference.getDownloadURL();
}

export async function saveClosetItem(params: {
  imageUri: string;
  category: ClosetSaveCategory;
  source?: 'gallery' | 'share' | 'mall' | 'community';
  productName?: string;
  productPrice?: number;
  productUrl?: string;
  shopName?: string;
}): Promise<string> {
  const user = auth().currentUser;
  if (!user) {
    throw new NotLoggedInError();
  }

  const currentItemCount = await getClosetItemCount(user.uid);
  if (currentItemCount >= MAX_CLOSET_ITEMS) {
    throw new ClosetFullError();
  }

  const downloadUrl = await uploadClosetImage(params.imageUri, user.uid);

  await firestore()
    .collection('users')
    .doc(user.uid)
    .collection('closet')
    .add({
      imageUrl: downloadUrl,
      category: params.category,
      source: params.source ?? 'gallery',
      productName: params.productName || '',
      productPrice: params.productPrice || 0,
      productUrl: params.productUrl || '',
      shopName: params.shopName || '',
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

  return downloadUrl;
}

export async function updateClosetProductInfo(params: {
  closetItemId: string;
  product: ProductInfo;
}): Promise<void> {
  const user = auth().currentUser;
  if (!user) {
    throw new NotLoggedInError();
  }

  await firestore()
    .collection('users')
    .doc(user.uid)
    .collection('closet')
    .doc(params.closetItemId)
    .update({
      productName: params.product.productName || '',
      productPrice: params.product.productPrice || 0,
      productUrl: params.product.productUrl || '',
      shopName: params.product.shopName || '',
      productSize: params.product.productSize || '',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
}
