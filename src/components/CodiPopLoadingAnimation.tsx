// src/components/CodiPopLoadingAnimation.tsx

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';

// 컬러 이모지를 쓰지 않습니다 (기획 요청: 모든 아이콘은 단색).
// 문구도 짧게 — 로딩 화면에서 읽히는 것은 앞의 몇 글자뿐입니다.
const LOADING_STEPS = [
  '체형을 분석하고 있어요',
  '의류의 핏과 질감을 맞추는 중',
  '조명과 색감을 보정하는 중',
  '거의 완성됐어요',
];

export const CodiPopLoadingAnimation: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);

  // 애니메이션 값 정의
  const pulseScaleAnim = useRef(new Animated.Value(1)).current;
  const ringScaleAnim = useRef(new Animated.Value(1)).current;
  const glowOpacityAnim = useRef(new Animated.Value(0.5)).current;
  const textOpacityAnim = useRef(new Animated.Value(1)).current;

  // 로고가 은은하게 숨 쉬고, 뒤의 빛이 함께 밝아졌다 어두워집니다.
  // 회전하는 링은 없앴습니다 — 시선을 끌지만 정보가 없고 지저분해 보입니다.
  useEffect(() => {
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

    // 로고 뒤 빛의 크기·밝기 (테두리가 없어 선으로 보이지 않습니다)
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

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacityAnim, {
          toValue: 0.95,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacityAnim, {
          toValue: 0.35,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    ringPulseLoop.start();
    glowLoop.start();

    return () => {
      pulseLoop.stop();
      ringPulseLoop.stop();
      glowLoop.stop();
    };
  }, [pulseScaleAnim, ringScaleAnim, glowOpacityAnim]);

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

  return (
    <View style={styles.container}>
      {/* 그래픽 영역 — 로고 하나만 둡니다.
          점선·회전 링을 겹쳐두니 "선이 지저분하다"는 지적이 나왔고, 실제로
          로딩 중 가장 오래 보는 화면이라 요소가 적을수록 낫습니다. */}
      <View style={styles.graphicContainer}>
        {/* 로고 뒤에서 숨 쉬는 빛. 테두리가 없어 선으로 보이지 않습니다. */}
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glowOpacityAnim,
              transform: [{ scale: ringScaleAnim }],
            },
          ]}
        />

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
      <Text style={styles.subStatusText}>보통 10초 안에 끝나요</Text>
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
  glow: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: 'rgba(106, 13, 173, 0.10)',
  },
  logoWrapper: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6A0DAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
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
