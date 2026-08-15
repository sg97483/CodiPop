// src/screens/OnboardingScreen.tsx

import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  LayoutChangeEvent,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {RootStackParamList} from '../../App';
import PhoneFrame, {FRAME_W, FRAME_H} from '../components/onboarding/PhoneFrame';
import {
  FittingScene,
  ClosetScene,
  MallScene,
  CommunityScene,
  CodiBookScene,
} from '../components/onboarding/scenes';

const {width: WINDOW_WIDTH} = Dimensions.get('window');

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

/**
 * 슬라이드 한 장의 정의.
 *
 * **그림은 이미지가 아니라 컴포넌트입니다.** 예전에는 실기기 스크린샷 PNG 5장이었는데,
 * 앱 화면을 고쳐도 온보딩은 그대로 남아 **신규 사용자가 온보딩에서 본 화면이 앱에 없는**
 * 상태가 실제로 생겼습니다(결과 화면을 원형 아이콘으로 바꾼 뒤).
 * 지금은 같은 부품을 코드로 그리므로 UI 를 고칠 때 온보딩도 같이 눈에 들어옵니다.
 */
interface OnboardingData {
  id: number;
  titleKey: string;
  descriptionKey: string;
  Scene: React.FC;
  /** 슬라이드마다 배경색을 달리해 넘길 때 '진행되고 있다'는 느낌을 줍니다. */
  bg: [string, string];
}

const onboardingData: OnboardingData[] = [
  {
    id: 1,
    titleKey: 'onboarding1Title',
    descriptionKey: 'onboarding1Description',
    Scene: FittingScene,
    bg: ['#FFE9F1', '#F1E7FF'],
  },
  {
    id: 2,
    titleKey: 'onboarding2Title',
    descriptionKey: 'onboarding2Description',
    Scene: ClosetScene,
    bg: ['#EFEAFF', '#E6F0FF'],
  },
  {
    id: 3,
    titleKey: 'onboardingMallTitle',
    descriptionKey: 'onboardingMallDescription',
    Scene: MallScene,
    bg: ['#E4F1FF', '#EAE6FF'],
  },
  {
    id: 4,
    titleKey: 'onboardingCommunityTitle',
    descriptionKey: 'onboardingCommunityDescription',
    Scene: CommunityScene,
    bg: ['#FFEDE6', '#F6E8FF'],
  },
  {
    id: 5,
    titleKey: 'onboarding3Title',
    descriptionKey: 'onboarding3Description',
    Scene: CodiBookScene,
    bg: ['#F3E8FF', '#FFE6F2'],
  },
];

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const {t} = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(WINDOW_WIDTH);
  const [imageAreaHeight, setImageAreaHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const current = onboardingData[currentIndex];

  /**
   * 폰 목업을 남는 공간에 맞춥니다.
   *
   * 목업 안쪽은 고정 좌표로 짜여 있습니다(PhoneFrame 주석 참고).
   * 여기서 **배율 하나만** 정하면 작은 폰에서도 그림이 무너지지 않고 줄어듭니다.
   * 여백을 조금 남겨 프레임 그림자가 잘리지 않게 합니다.
   */
  const scale = imageAreaHeight
    ? Math.min((pageWidth - 56) / FRAME_W, (imageAreaHeight - 32) / FRAME_H, 1)
    : 0;

  const handleOnboardingDone = async () => {
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      navigation.replace('Login');
    } catch (e) {
      console.error('Failed to save onboarding status.', e);
    }
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({index: nextIndex, animated: true});
    } else {
      handleOnboardingDone();
    }
  };

  const handleSkip = () => {
    handleOnboardingDone();
  };

  const onListLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    if (width > 0 && Math.abs(width - pageWidth) > 1) {
      setPageWidth(width);
    }
    if (height > 0 && Math.abs(height - imageAreaHeight) > 1) {
      setImageAreaHeight(height);
    }
  };

  const renderOnboardingItem = ({item}: {item: OnboardingData}) => (
    <View
      style={[
        styles.slide,
        {width: pageWidth, height: imageAreaHeight || undefined},
      ]}>
      <PhoneFrame scale={scale}>
        <item.Scene />
      </PhoneFrame>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* 배경은 슬라이드를 따라 바뀝니다. 목업 자체가 흰 화면이라
          배경까지 흰색이면 폰이 배경에 묻혀 보이지 않습니다. */}
      <LinearGradient
        colors={current.bg}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={StyleSheet.absoluteFill}
      />

      {/* 그림만 스크롤되는 영역 */}
      <View style={styles.imageArea} onLayout={onListLayout}>
        {imageAreaHeight > 0 && (
          <FlatList
            ref={flatListRef}
            data={onboardingData}
            renderItem={renderOnboardingItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            keyExtractor={item => item.id.toString()}
            getItemLayout={(_, index) => ({
              length: pageWidth,
              offset: pageWidth * index,
              index,
            })}
            onMomentumScrollEnd={event => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / pageWidth,
              );
              setCurrentIndex(index);
            }}
          />
        )}
      </View>

      {/* 텍스트·페이지네이션·버튼은 항상 보이는 하단 고정 */}
      <View style={[styles.bottomArea, {paddingBottom: insets.bottom + 12}]}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{t(current.titleKey)}</Text>
          <Text style={styles.description}>{t(current.descriptionKey)}</Text>
        </View>

        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>{t('skip')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.85}>
            <LinearGradient
              colors={['#FF6B9D', '#8B5CF6']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.nextButtonFill}>
              <Text style={styles.nextButtonText}>
                {currentIndex === onboardingData.length - 1
                  ? t('getStarted')
                  : t('continueButton')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2FA',
  },
  imageArea: {
    flex: 1,
    minHeight: 0,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  bottomArea: {
    paddingTop: 4,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    minHeight: 84,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#241B33',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 30,
  },
  description: {
    fontSize: 14,
    color: '#6B6478',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(106, 13, 173, 0.22)',
    marginHorizontal: 5,
  },
  paginationDotActive: {
    backgroundColor: '#7C3AED',
    width: 28,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6A0DAD',
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonFill: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default OnboardingScreen;
