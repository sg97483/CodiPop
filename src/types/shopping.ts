import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface ProductInfo {
  productName?: string;
  productPrice?: number;
  productUrl?: string;
  shopName?: string;
  /** 상품 표기 사이즈 (예: M, L) */
  productSize?: string;
}

export interface CodiClothingItem extends ProductInfo {
  imageUrl: string;
  closetItemId?: string;
  category?: string;
}

export interface WishlistItem extends ProductInfo {
  id: string;
  imageUrl: string;
  closetItemId?: string;
  codiId?: string;
  createdAt?: FirebaseFirestoreTypes.Timestamp | null;
}

export interface ClosetItemRecord extends ProductInfo {
  id: string;
  imageUrl: string;
  category?: string;
  source?: 'gallery' | 'share' | 'mall' | 'community';
}

export interface SavedCodiRecord {
  id: string;
  imageUrl: string;
  clothingImageUrls?: string[];
  clothingItems?: CodiClothingItem[];
  isLiked?: boolean;
  createdAt?: FirebaseFirestoreTypes.Timestamp | null;
}
