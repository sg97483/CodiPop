import firestore from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { CodiClothingItem, ProductInfo, WishlistItem } from '../types/shopping';

function wishlistPayload(params: {
  imageUrl: string;
  product: ProductInfo;
  closetItemId?: string;
  codiId?: string;
}) {
  return {
    imageUrl: params.imageUrl,
    productName: params.product.productName || '',
    productPrice: params.product.productPrice || 0,
    productUrl: params.product.productUrl || '',
    shopName: params.product.shopName || '',
    productSize: params.product.productSize || '',
    closetItemId: params.closetItemId || '',
    codiId: params.codiId || '',
  };
}

export async function addToWishlist(params: {
  userId: string;
  imageUrl: string;
  product: ProductInfo;
  closetItemId?: string;
  codiId?: string;
}): Promise<void> {
  const payload = wishlistPayload(params);
  const wishlistRef = firestore()
    .collection('users')
    .doc(params.userId)
    .collection('wishlist');

  // 같은 구매 링크가 있으면 최신 상품 정보로 갱신
  if (params.product.productUrl) {
    const existingByUrl = await wishlistRef
      .where('productUrl', '==', params.product.productUrl)
      .limit(1)
      .get();

    if (!existingByUrl.empty) {
      await existingByUrl.docs[0].ref.update(payload);
      return;
    }
  }

  // 같은 옷장 아이템이면 갱신
  if (params.closetItemId) {
    const existingByCloset = await wishlistRef
      .where('closetItemId', '==', params.closetItemId)
      .limit(1)
      .get();

    if (!existingByCloset.empty) {
      await existingByCloset.docs[0].ref.update(payload);
      return;
    }
  }

  await wishlistRef.add({
    ...payload,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
}

/** 상품 정보 수정 시 위시리스트에도 반영 */
export async function syncWishlistProductInfo(params: {
  userId: string;
  imageUrl?: string;
  closetItemId?: string;
  productUrl?: string;
  product: ProductInfo;
}): Promise<void> {
  const wishlistRef = firestore()
    .collection('users')
    .doc(params.userId)
    .collection('wishlist');

  const updates: FirebaseFirestoreTypes.DocumentReference[] = [];
  const seen = new Set<string>();

  const collect = async (
    field: 'productUrl' | 'closetItemId' | 'imageUrl',
    value?: string,
  ) => {
    if (!value) {
      return;
    }
    const snap = await wishlistRef.where(field, '==', value).get();
    snap.docs.forEach(doc => {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        updates.push(doc.ref);
      }
    });
  };

  await collect('productUrl', params.productUrl);
  await collect('closetItemId', params.closetItemId);
  await collect('imageUrl', params.imageUrl);

  const patch = {
    productName: params.product.productName || '',
    productPrice: params.product.productPrice || 0,
    productUrl: params.product.productUrl || '',
    shopName: params.product.shopName || '',
    productSize: params.product.productSize || '',
  };

  await Promise.all(updates.map(ref => ref.update(patch)));
}

export async function removeFromWishlist(
  userId: string,
  wishlistId: string,
): Promise<void> {
  await firestore()
    .collection('users')
    .doc(userId)
    .collection('wishlist')
    .doc(wishlistId)
    .delete();
}

export function mapWishlistDocs(
  docs: FirebaseFirestoreTypes.QueryDocumentSnapshot[],
): WishlistItem[] {
  return docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      imageUrl: data.imageUrl,
      productName: data.productName,
      productPrice: data.productPrice,
      productUrl: data.productUrl,
      shopName: data.shopName,
      productSize: data.productSize,
      closetItemId: data.closetItemId,
      codiId: data.codiId,
      createdAt: data.createdAt,
    };
  });
}

export async function addCodiItemsToWishlist(params: {
  userId: string;
  codiId: string;
  items: CodiClothingItem[];
}): Promise<number> {
  let addedCount = 0;

  for (const item of params.items) {
    if (!item.productUrl && !item.productName) {
      continue;
    }

    const beforeSnapshot = await firestore()
      .collection('users')
      .doc(params.userId)
      .collection('wishlist')
      .get();

    await addToWishlist({
      userId: params.userId,
      imageUrl: item.imageUrl,
      product: {
        productName: item.productName,
        productPrice: item.productPrice,
        productUrl: item.productUrl,
        shopName: item.shopName,
        productSize: item.productSize,
      },
      closetItemId: item.closetItemId,
      codiId: params.codiId,
    });

    const afterSnapshot = await firestore()
      .collection('users')
      .doc(params.userId)
      .collection('wishlist')
      .get();

    if (afterSnapshot.size > beforeSnapshot.size) {
      addedCount += 1;
    } else {
      // 기존 항목 갱신된 경우도 처리된 것으로 카운트
      addedCount += 1;
    }
  }

  return addedCount;
}
