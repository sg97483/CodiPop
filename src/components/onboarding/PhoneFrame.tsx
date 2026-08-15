import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

/**
 * 온보딩 슬라이드용 폰 목업 프레임.
 *
 * **왜 이미지가 아니라 코드인가.**
 * 예전 온보딩은 실기기 스크린샷 5장(PNG 3.9MB)이었습니다.
 * 앱 화면을 고치면 온보딩은 그대로 남아 **신규 사용자가 온보딩에서 본 화면이
 * 앱에 없는** 상태가 됩니다. 실제로 그렇게 됐습니다 — 결과 화면을 원형 아이콘으로
 * 바꾼 뒤에도 온보딩에는 옛 '사람 변경' 버튼이 찍혀 있었습니다.
 * 여기서는 같은 부품을 코드로 그리므로 앱을 고칠 때 함께 눈에 띕니다.
 *
 * **크기는 고정 좌표 + scale 로 다룹니다.**
 * 안쪽을 전부 비율(%)로 짜면 기기마다 정렬이 미세하게 어긋납니다.
 * 화면을 {@link SCREEN_W} × {@link SCREEN_H} 로 못 박고 바깥에서 배율만 곱하면
 * 어느 기기에서도 **같은 그림**이 나옵니다.
 */

export const SCREEN_W = 280;
export const SCREEN_H = 570;
const BEZEL = 9;
export const FRAME_W = SCREEN_W + BEZEL * 2;
export const FRAME_H = SCREEN_H + BEZEL * 2;

type Props = {
  /** 1 이면 위 고정 크기 그대로. 바깥에서 남는 공간에 맞춰 넣어 줍니다. */
  scale: number;
  children: React.ReactNode;
};

const PhoneFrame: React.FC<Props> = ({ scale, children }) => (
  <View
    style={[
      styles.frame,
      {
        transform: [{ scale }],
      },
    ]}>
    <View style={styles.screen}>{children}</View>
  </View>
);

/** 폰 화면 맨 위 — 시간과 상태 아이콘. 목업이 '화면'으로 읽히게 하는 최소 장치입니다. */
export const MockStatusBar: React.FC<{ dark?: boolean }> = ({ dark }) => {
  const color = dark ? '#FFFFFF' : '#1A1A1A';
  return (
    <View style={styles.statusBar}>
      <Text style={[styles.statusTime, { color }]}>9:41</Text>
      <View style={styles.statusIcons}>
        <View style={[styles.statusBar1, { backgroundColor: color }]} />
        <View style={[styles.statusBar2, { backgroundColor: color }]} />
        <View style={[styles.statusBattery, { borderColor: color }]}>
          <View style={[styles.statusBatteryFill, { backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
};

type TabKey = 'home' | 'fitting' | 'closet' | 'community' | 'codibook';

/**
 * 탭 아이콘은 **앱이 실제로 쓰는 PNG 를 그대로 가져옵니다**
 * (`MainTabNavigator` 와 같은 파일). 비슷하게 다시 그리면 결국 서로 달라지고,
 * 이 온보딩을 코드로 옮긴 이유가 바로 그것이었습니다.
 * 색도 실제 탭바와 같은 값을 씁니다.
 */
const TAB_ACTIVE = '#6A0DAD';
const TAB_INACTIVE = '#8E8E93';

const TABS: {
  key: TabKey;
  label: string;
  on: ReturnType<typeof require>;
  off: ReturnType<typeof require>;
}[] = [
  {
    key: 'home',
    label: '홈',
    on: require('../../assets/icons/icon-home-active.png'),
    off: require('../../assets/icons/icon-home-inactive.png'),
  },
  {
    key: 'fitting',
    label: '피팅룸',
    on: require('../../assets/icons/icon-fitting-active.png'),
    off: require('../../assets/icons/icon-fitting-inactive.png'),
  },
  {
    key: 'closet',
    label: '내 옷장',
    on: require('../../assets/icons/icon-closet-active.png'),
    off: require('../../assets/icons/icon-closet-inactive.png'),
  },
  {
    key: 'community',
    label: '커뮤니티',
    on: require('../../assets/icons/icon-community-active.png'),
    off: require('../../assets/icons/icon-community-inactive.png'),
  },
  {
    key: 'codibook',
    label: '코디북',
    on: require('../../assets/icons/icon-codibook-active.png'),
    off: require('../../assets/icons/icon-codibook-inactive.png'),
  },
];

/**
 * 하단 탭바. 슬라이드마다 **켜져 있는 탭이 다릅니다** —
 * 다섯 장을 넘기는 동안 "앱 안을 돌아다니고 있다"는 느낌을 주는 건 이 점 하나입니다.
 */
export const MockTabBar: React.FC<{ active: TabKey }> = ({ active }) => (
  <View style={styles.tabBar}>
    {TABS.map(tab => {
      const on = tab.key === active;
      const color = on ? TAB_ACTIVE : TAB_INACTIVE;
      return (
        <View key={tab.key} style={styles.tabItem}>
          <Image
            source={on ? tab.on : tab.off}
            style={[styles.tabIcon, { tintColor: color }]}
            resizeMode="contain"
          />
          <Text style={[styles.tabLabel, { color }, on && styles.tabLabelOn]}>{tab.label}</Text>
        </View>
      );
    })}
  </View>
);

/** 목업 안에서 반복되는 알약형 버튼. */
export const MockPill: React.FC<{
  label: string;
  bg: string;
  color: string;
  small?: boolean;
}> = ({ label, bg, color, small }) => (
  <View style={[styles.pill, { backgroundColor: bg }, small && styles.pillSmall]}>
    <Text style={[styles.pillText, { color }, small && styles.pillTextSmall]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderRadius: 40,
    backgroundColor: '#15151A',
    padding: BEZEL,
    shadowColor: '#2A1A4A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  screen: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  statusBar: {
    height: 26,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTime: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statusBar1: { width: 3, height: 6, borderRadius: 1 },
  statusBar2: { width: 3, height: 9, borderRadius: 1 },
  statusBattery: {
    width: 14,
    height: 8,
    borderRadius: 2,
    borderWidth: 1,
    padding: 1,
  },
  statusBatteryFill: { flex: 1, borderRadius: 1 },
  tabBar: {
    flexDirection: 'row',
    height: 42,
    borderTopWidth: 1,
    borderTopColor: '#EFEFF3',
    backgroundColor: '#FFFFFF',
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabIcon: {
    width: 15,
    height: 15,
  },
  tabLabel: {
    fontSize: 7,
    fontWeight: '600',
  },
  tabLabelOn: {
    fontWeight: '800',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillSmall: {
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  pillTextSmall: {
    fontSize: 8.5,
  },
});

export default PhoneFrame;
