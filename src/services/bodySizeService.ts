import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import type { BodySizeProfile, ClothingSizeLabel } from '../types/bodySize';
import { isValidBodySizeProfile } from './sizeRecommendService';

export async function getBodySizeProfile(
  userId?: string,
): Promise<BodySizeProfile | null> {
  const uid = userId || auth().currentUser?.uid;
  if (!uid) {
    return null;
  }

  const snap = await firestore().collection('users').doc(uid).get();
  const data = snap.data()?.bodySize;
  if (!data) {
    return null;
  }

  const profile: BodySizeProfile = {
    heightCm: Number(data.heightCm),
    weightKg: Number(data.weightKg),
    usualSize: data.usualSize as ClothingSizeLabel,
    updatedAt: data.updatedAt,
  };

  return isValidBodySizeProfile(profile) ? profile : null;
}

export async function saveBodySizeProfile(params: {
  heightCm: number;
  weightKg: number;
  usualSize: ClothingSizeLabel;
}): Promise<void> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('NOT_LOGGED_IN');
  }

  await firestore()
    .collection('users')
    .doc(user.uid)
    .set(
      {
        bodySize: {
          heightCm: params.heightCm,
          weightKg: params.weightKg,
          usualSize: params.usualSize,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );
}

export async function clearBodySizeProfile(): Promise<void> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('NOT_LOGGED_IN');
  }

  await firestore().collection('users').doc(user.uid).set(
    {
      bodySize: firestore.FieldValue.delete(),
    },
    { merge: true },
  );
}
