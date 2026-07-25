import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MainTabParamList } from '../navigators/MainTabNavigator';
import type { ClosetSaveCategory } from '../constants/closet';

export type ScanImageItem = {
  uri: string;
  sourceType: 'url' | 'file';
};

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Profile: undefined;
  BodySize: undefined;
  Detail: { imageUrl: string };
  CodiDetail: {
    codiId: string;
    imageUrl: string;
    createdAt: any;
    isLiked?: boolean;
  };
  MallList: undefined;
  MallBrowser: {
    url: string;
    title?: string;
  };
  MallScanResult: {
    images: ScanImageItem[];
    productUrl?: string;
    shopName?: string;
    suggestedCategory?: ClosetSaveCategory;
    suggestedName?: string;
    mode: 'autoScan' | 'capture';
  };
  CommunityPostDetail: { postId: string };
  CommunityCreatePost: undefined;
  CommunityTryOn: { postId: string };
};
