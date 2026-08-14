import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * 단색 라인 아이콘 모음.
 *
 * 기획 요청(0812)의 조건은 **"모든 아이콘은 단색, 컬러 안 됨"** 이고,
 * 참고로 준 화면은 구글 쇼핑의 가상 피팅입니다 — 흰 원 안에 남색 선 아이콘.
 *
 * **아이콘 라이브러리를 새로 넣지 않습니다.**
 * `react-native-svg` 를 추가하면 iOS·Android 네이티브 재빌드가 필요하고,
 * 아이콘 때문에 빌드가 깨지는 위험을 지는 것은 남는 장사가 아닙니다.
 * 대신 View 로 그립니다 — `color` 하나로 전체가 바뀌므로 단색 규칙을 어길 수 없습니다.
 *
 * 좌표는 모두 24 기준으로 그리고 `size/24` 배율만 곱합니다.
 */

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const DEFAULT_COLOR = '#2C3A57'; // 구글 쇼핑이 쓰는 남색 계열

/** 아래 화살표 + 받침선 — 저장/다운로드 */
export const DownloadIcon: React.FC<IconProps> = ({
  size = 22,
  color = DEFAULT_COLOR,
  strokeWidth = 2,
}) => {
  const s = size / 24;
  const w = strokeWidth;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
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

/** 상자에서 위로 나가는 화살표 — 공유 */
export const ShareIcon: React.FC<IconProps> = ({
  size = 22,
  color = DEFAULT_COLOR,
  strokeWidth = 2,
}) => {
  const s = size / 24;
  const w = strokeWidth;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {/* 상자 (윗변 없음) */}
      <View
        style={{
          position: 'absolute',
          left: 4 * s,
          top: 10 * s,
          width: 16 * s,
          height: 11 * s,
          borderLeftWidth: w,
          borderRightWidth: w,
          borderBottomWidth: w,
          borderColor: color,
          borderBottomLeftRadius: 3 * s,
          borderBottomRightRadius: 3 * s,
        }}
      />
      {/* 화살표 몸통 */}
      <View
        style={{
          position: 'absolute',
          left: 12 * s - w / 2,
          top: 3 * s,
          width: w,
          height: 11 * s,
          backgroundColor: color,
          borderRadius: w / 2,
        }}
      />
      {/* 화살촉 (위를 향한 V) */}
      <View
        style={{
          position: 'absolute',
          left: 12 * s - 4 * s,
          top: 4 * s,
          width: 8 * s,
          height: 8 * s,
          borderLeftWidth: w,
          borderTopWidth: w,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
};

/** 아래가 V 로 파인 리본 — 북마크/저장 */
export const BookmarkIcon: React.FC<IconProps> = ({
  size = 22,
  color = DEFAULT_COLOR,
  strokeWidth = 2,
}) => {
  const s = size / 24;
  const w = strokeWidth;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={{
          position: 'absolute',
          left: 5 * s,
          top: 3 * s,
          width: 14 * s,
          height: 15 * s,
          borderWidth: w,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: 2 * s,
          borderTopRightRadius: 2 * s,
        }}
      />
      {/* 아래쪽 V 홈 — 배경색 사각형을 45도 돌려 리본 끝을 파냅니다 */}
      <View
        style={{
          position: 'absolute',
          left: 12 * s - 5 * s,
          top: 13 * s,
          width: 10 * s,
          height: 10 * s,
          borderLeftWidth: w,
          borderBottomWidth: w,
          borderColor: color,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
};

/** 원형 화살표 — 다시 하기 */
export const RefreshIcon: React.FC<IconProps> = ({
  size = 22,
  color = DEFAULT_COLOR,
  strokeWidth = 2,
}) => {
  const s = size / 24;
  const w = strokeWidth;
  const ring = 17 * s;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {/* 테두리 한 변을 투명하게 두면 3/4 호가 됩니다 */}
      <View
        style={{
          position: 'absolute',
          left: (size - ring) / 2,
          top: (size - ring) / 2,
          width: ring,
          height: ring,
          borderWidth: w,
          borderColor: color,
          borderTopColor: 'transparent',
          borderRadius: ring / 2,
          transform: [{ rotate: '-45deg' }],
        }}
      />
      {/* 호 끝의 화살촉 */}
      <View
        style={{
          position: 'absolute',
          right: 3 * s,
          top: 2.5 * s,
          width: 7 * s,
          height: 7 * s,
          borderRightWidth: w,
          borderTopWidth: w,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
};

/** 아래를 향한 꺾쇠 — 접기 */
export const ChevronDownIcon: React.FC<IconProps> = ({
  size = 22,
  color = DEFAULT_COLOR,
  strokeWidth = 2,
}) => {
  const s = size / 24;
  const w = strokeWidth;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={{
          position: 'absolute',
          left: 12 * s - 5 * s,
          top: 7 * s,
          width: 10 * s,
          height: 10 * s,
          borderRightWidth: w,
          borderBottomWidth: w,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
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
