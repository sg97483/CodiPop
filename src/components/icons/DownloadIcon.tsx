import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * 다운로드 아이콘 (아래 화살표 + 받침선).
 *
 * 기획에서 **정확한 아이콘 모양을 지정**했고, 조건은 "최대한 심플하게 · 단색"입니다.
 * (컬러 이모지 📥 를 쓰던 자리를 대체합니다.)
 *
 * 아이콘 라이브러리를 새로 넣지 않고 View 로 그립니다 —
 * `react-native-svg` 같은 네이티브 의존성을 추가하면 iOS·Android 재빌드가 필요하고,
 * 아이콘 하나 때문에 빌드가 깨질 위험을 지는 것은 남는 장사가 아닙니다.
 *
 * `color` 하나로 전체 색이 바뀌므로 단색 규칙을 어길 수 없는 구조입니다.
 */
type Props = {
  size?: number;
  color?: string;
  /** 선 두께. 크기를 키우면 함께 키우세요. */
  strokeWidth?: number;
};

export const DownloadIcon: React.FC<Props> = ({
  size = 22,
  color = '#111111',
  strokeWidth = 2,
}) => {
  // 24 기준으로 그린 좌표를 요청 크기에 맞춰 배율만 바꿉니다.
  const s = size / 24;
  const w = strokeWidth;

  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {/* 화살표 몸통 */}
      <View
        style={{
          position: 'absolute',
          left: 12 * s - w / 2,
          top: 3 * s,
          width: w,
          height: 10 * s,
          backgroundColor: color,
          borderRadius: w / 2,
        }}
      />
      {/* 화살촉 — 정사각형의 두 변만 남기고 45도 돌리면 아래를 향한 V 가 됩니다 */}
      <View
        style={{
          position: 'absolute',
          left: 12 * s - 4.5 * s,
          top: 4.5 * s,
          width: 9 * s,
          height: 9 * s,
          borderRightWidth: w,
          borderBottomWidth: w,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
      {/* 받침선 */}
      <View
        style={{
          position: 'absolute',
          left: 4 * s,
          top: 19 * s,
          width: 16 * s,
          height: w,
          backgroundColor: color,
          borderRadius: w / 2,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
