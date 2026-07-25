import firestore from '@react-native-firebase/firestore';
import type { CodiClothingItem, ClosetItemRecord } from '../types/shopping';

function omitUndefined<T extends Record<string, unknown>>(
  obj: T,
): {[K in keyof T]?: Exclude<T[K], undefined>} {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as {[K in keyof T]?: Exclude<T[K], undefined>};
}

export function buildClothingItemsFromSelection(
  imageUrls: string[],
  closetItems: ClosetItemRecord[],
): CodiClothingItem[] {
  return imageUrls.map(imageUrl => {
    const closetItem = closetItems.find(item => item.imageUrl === imageUrl);
    return omitUndefined({
      imageUrl,
      closetItemId: closetItem?.id,
      category: closetItem?.category,
      productName: closetItem?.productName,
      productPrice: closetItem?.productPrice,
      productUrl: closetItem?.productUrl,
      shopName: closetItem?.shopName,
      productSize: closetItem?.productSize,
    }) as CodiClothingItem;
  });
}

export async function saveCodiResult(params: {
  userId: string;
  resultImageUrl: string;
  clothingImageUrls: string[];
  clothingItems: CodiClothingItem[];
}): Promise<void> {
  const clothingItems = params.clothingItems.map(item =>
    omitUndefined({...item}),
  ) as CodiClothingItem[];

  const payload = {
    imageUrl: params.resultImageUrl,
    clothingImageUrls: params.clothingImageUrls,
    clothingItems,
    createdAt: firestore.FieldValue.serverTimestamp(),
    isLiked: false,
  };

  // 코디북은 recentResults를 사용 — 여기 저장이 필수
  await firestore()
    .collection('users')
    .doc(params.userId)
    .collection('recentResults')
    .add(payload);

  // recentCodi는 부가 저장 — 실패해도 코디북 노출에는 영향 없음
  try {
    await firestore()
      .collection('users')
      .doc(params.userId)
      .collection('recentCodi')
      .add({
        imageUrl: params.resultImageUrl,
        clothingImageUrls: params.clothingImageUrls,
        clothingItems,
        createdAt: firestore.FieldValue.serverTimestamp(),
        isLiked: false,
      });
  } catch (error) {
    console.error('recentCodi 부가 저장 실패:', error);
  }
}

export function calculateTotalPrice(items: CodiClothingItem[]): number {
  return items.reduce((sum, item) => sum + (item.productPrice || 0), 0);
}
