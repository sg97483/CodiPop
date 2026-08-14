import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * 사진 위에 뜨는 흰 원형 아이콘 버튼.
 *
 * 구글 쇼핑 가상 피팅의 조작 버튼이 이 형태입니다 — 흰 원, 남색 선 아이콘, 글씨 없음.
 * 결과 사진이 주인공인 화면에서 **글씨가 들어간 박스는 사진을 가립니다.**
 * 아이콘만 쓰면 같은 기능을 1/3 면적으로 놓을 수 있습니다.
 *
 * 글씨가 없으므로 **`label` 을 반드시 받습니다** — 화면에는 안 보이지만
 * 스크린리더가 읽습니다. 아이콘만 있는 버튼에서 이걸 빠뜨리면
 * 시각장애 사용자에게는 버튼이 아예 존재하지 않는 것과 같습니다.
 */
type Props = {
  /** 접근성 라벨. 화면에 보이지 않지만 반드시 넣습니다. */
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  size?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** 오른쪽 위에 붙는 작은 숫자/문자 (예: 남은 티켓) */
  badge?: string;
};

export const CircleIconButton: React.FC<Props> = ({
  label,
  onPress,
  children,
  size = 46,
  style,
  disabled = false,
  badge,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        disabled && styles.disabled,
        style,
      ]}>
      {children}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {badge}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    // 사진이 밝든 어둡든 버튼이 보이도록 은은한 그림자를 둡니다.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  disabled: {
    opacity: 0.45,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    paddingHorizontal: 4,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#6A0DAD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
