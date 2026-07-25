// src/screens/OnboardingScreen.tsx

import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
  StatusBar,
  LayoutChangeEvent,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {RootStackParamList} from '../../App';

const {width: WINDOW_WIDTH} = Dimensions.get('window');

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

interface OnboardingData {
  id: number;
  titleKey: string;
  descriptionKey: string;
  image: any;
}

const onboardingData: OnboardingData[] = [
  {
    id: 1,
    titleKey: 'onboarding1Title',
    descriptionKey: 'onboarding1Description',
    image: require('../assets/images/onboarding/screen1.png'),
  },
  {
    id: 2,
    titleKey: 'onboarding2Title',
    descriptionKey: 'onboarding2Description',
    image: require('../assets/images/onboarding/screen2.png'),
  },
  {
    id: 3,
    titleKey: 'onboardingMallTitle',
    descriptionKey: 'onboardingMallDescription',
    image: require('../assets/images/onboarding/screen4_mall_v2.png'),
  },
  {
    id: 4,
    titleKey: 'onboardingCommunityTitle',
    descriptionKey: 'onboardingCommunityDescription',
    image: require('../assets/images/onboarding/screen5_community_v2.png'),
  },
  {
    id: 5,
    titleKey: 'onboarding3Title',
    descriptionKey: 'onboarding3Description',
    image: require('../assets/images/onboarding/screen3.png'),
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
      <Image
        source={item.image}
        style={styles.onboardingImage}
        resizeMode="contain"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* 이미지만 스크롤 영역 */}
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
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIndex === onboardingData.length - 1
                ? t('getStarted')
                : t('continueButton')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  imageArea: {
    flex: 1,
    minHeight: 0,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 8,
  },
  onboardingImage: {
    width: '100%',
    height: '100%',
  },
  bottomArea: {
    backgroundColor: '#F5F5F5',
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
    color: '#333333',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 30,
  },
  description: {
    fontSize: 14,
    color: '#666666',
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
    backgroundColor: '#CCCCCC',
    marginHorizontal: 5,
  },
  paginationDotActive: {
    backgroundColor: '#6A0DAD',
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
    backgroundColor: '#EDE7F6',
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
    paddingVertical: 14,
    marginLeft: 10,
    backgroundColor: '#6A0DAD',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default OnboardingScreen;
