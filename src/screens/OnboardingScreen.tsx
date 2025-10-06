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
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {RootStackParamList} from '../../App';

const {width: screenWidth} = Dimensions.get('window');

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
    titleKey: 'onboarding3Title',
    descriptionKey: 'onboarding3Description',
    image: require('../assets/images/onboarding/screen3.png'),
  },
];

const OnboardingScreen = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const {t} = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

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

  const renderOnboardingItem = ({item}: {item: OnboardingData}) => (
    <View style={styles.slide}>
      <View style={styles.imageContainer}>
        <Image
          source={item.image}
          style={styles.onboardingImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{t(item.titleKey)}</Text>
        <Text style={styles.description}>{t(item.descriptionKey)}</Text>
      </View>
    </View>
  );

  const renderPagination = () => (
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
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F5F5F5" barStyle="dark-content" />

      {/* ✅ 1. 메인 콘텐츠 영역 (FlatList와 Pagination) */}
      <View style={styles.mainContent}>
        <FlatList
          ref={flatListRef}
          data={onboardingData}
          renderItem={renderOnboardingItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={event => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / screenWidth,
            );
            setCurrentIndex(index);
          }}
          keyExtractor={item => item.id.toString()}
        />
        {renderPagination()}
      </View>

      {/* ✅ 2. 하단 버튼 영역 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>{t('skip')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentIndex === onboardingData.length - 1
              ? t('getStarted')
              : t('다음')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // ✅ 1. 메인 콘텐츠 영역 스타일 추가
  mainContent: {
    flex: 1, // 버튼 영역을 제외한 모든 공간을 차지
    justifyContent: 'center', // ✅ 세로 중앙 정렬 추가
  },
  slide: {
    width: screenWidth,
    flex: 1, // FlatList 안에서 꽉 차도록
    alignItems: 'center',
    justifyContent: 'center', // 이미지와 텍스트를 중앙에 배치
  },
  imageContainer: {
    flex: 0.7, // 이미지 영역이 60%
    justifyContent: 'flex-end', // 이미지를 아래쪽으로 정렬
    paddingBottom: 20,
    marginTop: 50,
  },
  onboardingImage: {
    width: screenWidth * 0.8,
    height: '100%',
  },
  textContainer: {
    flex: 0.3, // 텍스트 영역이 40%
    alignItems: 'center',
    paddingHorizontal: 30,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
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
  // ✅ 2. 버튼 영역 스타일 (position: 'absolute' 제거)
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40, // 하단 여백
    backgroundColor: '#F5F5F5',
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
