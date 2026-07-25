// src/components/CodiPopLoadingAnimation.tsx

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';

const LOADING_STEPS = [
  '✨ 유저 체형 및 프로필 데이터 분석 중...',
  '👗 선택한 의류의 핏과 질감 맞추는 중...',
  '🎨 자연스러운 조명 및 색감 보정 중...',
  '💜 완벽한 코디팝 스타일링 완성 직전!',
];

export const CodiPopLoadingAnimation: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);

  // 애니메이션 값 정의
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseScaleAnim = useRef(new Animated.Value(1)).current;
  const ringScaleAnim = useRef(new Animated.Value(1)).current;
  const textOpacityAnim = useRef(new Animated.Value(1)).current;

  // 1. 회전 및 펄스 루프 애니메이션
  useEffect(() => {
    // 링 회전 (360도 무한 루프)
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    // 로고 펄스 (숨쉬기 효과)
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScaleAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScaleAnim, {
          toValue: 0.96,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    // 배경 스캔 링 펄스
    const ringPulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringScaleAnim, {
          toValue: 1.25,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringScaleAnim, {
          toValue: 1.0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    rotateLoop.start();
    pulseLoop.start();
    ringPulseLoop.start();

    return () => {
      rotateLoop.stop();
      pulseLoop.stop();
      ringPulseLoop.stop();
    };
  }, [rotateAnim, pulseScaleAnim, ringScaleAnim]);

  // 2. 단계별 텍스트 자연스러운 전환 애니메이션
  useEffect(() => {
    const interval = setInterval(() => {
      // 텍스트 페이드 아웃 -> 인덱스 변경 -> 페이드 인
      Animated.timing(textOpacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setStepIndex(prev => (prev + 1) % LOADING_STEPS.length);
        Animated.timing(textOpacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [textOpacityAnim]);

  // 회전 각도 보간
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const reverseRotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <View style={styles.container}>
      {/* 그래픽 애니메이션 영역 */}
      <View style={styles.graphicContainer}>
        {/* 가장 바깥쪽 퍼징 글로우 원 */}
        <Animated.View
          style={[
            styles.outerGlowRing,
            {
              transform: [{ scale: ringScaleAnim }],
            },
          ]}
        />

        {/* 회전하는 마법/스캔 대시 링 1 */}
        <Animated.View
          style={[
            styles.rotatingRingOuter,
            {
              transform: [{ rotate: rotateInterpolate }],
            },
          ]}
        />

        {/* 반대 방향으로 회전하는 점선 링 2 */}
        <Animated.View
          style={[
            styles.rotatingRingInner,
            {
              transform: [{ rotate: reverseRotateInterpolate }],
            },
          ]}
        />

        {/* 중앙 부드럽게 숨쉬는 코디팝 로고 */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              transform: [{ scale: pulseScaleAnim }],
            },
          ]}>
          <Image
            source={require('../assets/images/codipop_logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* 동적 AI 진행 상태 안내 문구 */}
      <Animated.Text style={[styles.statusText, { opacity: textOpacityAnim }]}>
        {LOADING_STEPS[stepIndex]}
      </Animated.Text>
      <Text style={styles.subStatusText}>잠시만 기다려 주시면 트렌디한 핏이 완성됩니다 ✨</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  graphicContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  outerGlowRing: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(106, 13, 173, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(106, 13, 173, 0.2)',
  },
  rotatingRingOuter: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2.5,
    borderColor: '#6A0DAD',
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  rotatingRingInner: {
    position: 'absolute',
    width: 138,
    height: 138,
    borderRadius: 69,
    borderWidth: 1.5,
    borderColor: '#D8B4F8',
    borderStyle: 'dotted',
    opacity: 0.8,
  },
  logoWrapper: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6A0DAD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImage: {
    width: 76,
    height: 76,
  },
  statusText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#6A0DAD',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  subStatusText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
  },
});
