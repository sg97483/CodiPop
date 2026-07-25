import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';

type SharedMediaFile = {
  filePath?: string | null;
  contentUri?: string | null;
  mimeType?: string | null;
  extension?: string | null;
};

import { navigationRef } from '../navigation/navigationRef';
import {
  CLOSET_SAVE_CATEGORIES,
  ClosetSaveCategory,
  PENDING_SHARE_IMAGE_KEY,
} from '../constants/closet';
import {
  ClosetFullError,
  NotLoggedInError,
  saveClosetItem,
} from '../services/closetService';

const SHARE_PROTOCOL = 'codipop';

type ShareToClosetHandlerProps = {
  isLoggedIn: boolean;
};

function normalizeSharedImageUri(file: SharedMediaFile): string | null {
  const uri = file.filePath || file.contentUri;
  if (!uri || typeof uri !== 'string') {
    return null;
  }

  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }

  return `file://${uri}`;
}

function isImageShare(file: SharedMediaFile): boolean {
  const mimeType = typeof file.mimeType === 'string' ? file.mimeType : '';
  if (mimeType.startsWith('image/')) {
    return true;
  }

  const extension = typeof file.extension === 'string' ? file.extension.toLowerCase() : '';
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extension);
}

const ShareToClosetHandler = ({ isLoggedIn }: ShareToClosetHandlerProps) => {
  const { showActionSheetWithOptions } = useActionSheet();
  const { t } = useTranslation();
  const isProcessingRef = useRef(false);
  const pendingUriRef = useRef<string | null>(null);

  const navigateToFitting = useCallback((clothingUrl: string) => {
    if (!navigationRef.isReady()) {
      return;
    }

    navigationRef.navigate('Main', {
      screen: 'VirtualFitting',
      params: { clothingUrl },
    });
  }, []);

  const promptCategoryAndSave = useCallback(
    (imageUri: string) => {
      const options = [
        ...CLOSET_SAVE_CATEGORIES,
        t('cancel'),
      ];
      const cancelButtonIndex = options.length - 1;

      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: t('selectCategoryTitle'),
          message: t('shareToClosetCategoryMessage'),
        },
        async (selectedIndex?: number) => {
          if (
            selectedIndex === undefined ||
            selectedIndex === cancelButtonIndex
          ) {
            isProcessingRef.current = false;
            ReceiveSharingIntent.clearReceivedFiles();
            return;
          }

          const category = CLOSET_SAVE_CATEGORIES[
            selectedIndex
          ] as ClosetSaveCategory;

          try {
            const downloadUrl = await saveClosetItem({
              imageUri,
              category,
              source: 'share',
            });

            Toast.show({
              type: 'success',
              text1: t('shareToClosetSuccess'),
              text2: t('shareToClosetSuccessHint'),
            });
            navigateToFitting(downloadUrl);
          } catch (error) {
            if (error instanceof ClosetFullError) {
              Toast.show({
                type: 'error',
                text1: t('closetFull'),
                text2: t('closetFullMessage', { max: 30 }),
              });
            } else if (error instanceof NotLoggedInError) {
              await AsyncStorage.setItem(PENDING_SHARE_IMAGE_KEY, imageUri);
              Toast.show({
                type: 'info',
                text1: t('shareToClosetLoginRequired'),
              });
            } else {
              console.error('공유 옷장 저장 실패:', error);
              Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('closetSaveError'),
              });
            }
          } finally {
            isProcessingRef.current = false;
            ReceiveSharingIntent.clearReceivedFiles();
          }
        },
      );
    },
    [navigateToFitting, showActionSheetWithOptions, t],
  );

  const handleSharedImage = useCallback(
    async (imageUri: string) => {
      if (isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;

      if (!isLoggedIn) {
        await AsyncStorage.setItem(PENDING_SHARE_IMAGE_KEY, imageUri);
        Toast.show({
          type: 'info',
          text1: t('shareToClosetLoginRequired'),
          text2: t('shareToClosetLoginRequiredHint'),
        });
        isProcessingRef.current = false;
        ReceiveSharingIntent.clearReceivedFiles();
        return;
      }

      promptCategoryAndSave(imageUri);
    },
    [isLoggedIn, promptCategoryAndSave, t],
  );

  const processPendingShare = useCallback(async () => {
    const pendingUri =
      pendingUriRef.current ||
      (await AsyncStorage.getItem(PENDING_SHARE_IMAGE_KEY));

    if (!pendingUri || !isLoggedIn) {
      return;
    }

    pendingUriRef.current = pendingUri;
    await AsyncStorage.removeItem(PENDING_SHARE_IMAGE_KEY);
    promptCategoryAndSave(pendingUri);
  }, [isLoggedIn, promptCategoryAndSave]);

  useEffect(() => {
    if (isLoggedIn) {
      processPendingShare();
    }
  }, [isLoggedIn, processPendingShare]);

  useEffect(() => {
    const handleReceivedFiles = (files: SharedMediaFile[]) => {
      if (!files?.length || isProcessingRef.current) {
        return;
      }

      const imageFile = files.find(isImageShare);
      if (!imageFile) {
        Toast.show({
          type: 'error',
          text1: t('shareToClosetImageOnly'),
        });
        ReceiveSharingIntent.clearReceivedFiles();
        return;
      }

      const imageUri = normalizeSharedImageUri(imageFile);
      if (!imageUri) {
        ReceiveSharingIntent.clearReceivedFiles();
        return;
      }

      handleSharedImage(imageUri);
    };

    const handleReceiveError = (error: unknown) => {
      if (__DEV__) {
        console.log('공유 수신 대기:', error);
      }
    };

    ReceiveSharingIntent.getReceivedFiles(
      handleReceivedFiles,
      handleReceiveError,
      SHARE_PROTOCOL,
    );

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active' && Platform.OS === 'android') {
        ReceiveSharingIntent.getReceivedFiles(
          handleReceivedFiles,
          handleReceiveError,
          SHARE_PROTOCOL,
        );
      }
    });

    return () => {
      subscription.remove();
      ReceiveSharingIntent.clearReceivedFiles();
    };
  }, [handleSharedImage, t]);

  return null;
};

export default ShareToClosetHandler;
