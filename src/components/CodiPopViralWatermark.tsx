// src/components/CodiPopViralWatermark.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import qrcode from 'qrcode-generator';

interface CodiPopViralWatermarkProps {
  referralCode?: string;
  isVisible?: boolean;
}

export const CodiPopViralWatermark: React.FC<CodiPopViralWatermarkProps> = ({
  referralCode = 'CODI20',
  isVisible = true,
}) => {
  const qrMatrix = useMemo(() => {
    try {
      const url = `https://codipop.app/invite?code=${referralCode}`;
      const qr = qrcode(4, 'L');
      qr.addData(url);
      qr.make();
      const count = qr.getModuleCount();
      const matrix: boolean[][] = [];
      for (let r = 0; r < count; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < count; c++) {
          row.push(qr.isDark(r, c));
        }
        matrix.push(row);
      }
      return matrix;
    } catch (e) {
      console.error('QR Matrix Generation Error:', e);
      return [];
    }
  }, [referralCode]);

  const qrSize = 64;
  const cellSize = qrMatrix.length > 0 ? qrSize / qrMatrix.length : 2;

  return (
    <View style={[styles.container, !isVisible && { opacity: 0 }]} pointerEvents="none">
      <View style={styles.leftSection}>
        <View style={styles.headerRow}>
          <Image
            source={require('../assets/images/codipop_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>CodiPop AI</Text>
        </View>

        <Text style={styles.tagline}>✨ AI가 제안하는 나만의 트렌디 가상 피팅</Text>

        <View style={styles.referralBox}>
          <Text style={styles.referralText}>
            🎁 초대코드 <Text style={styles.codeHighlight}>[ {referralCode} ]</Text> 입력 시 무료 티켓 +20장!
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={[styles.qrContainer, { width: qrSize + 10, height: qrSize + 10 }]}>
          {qrMatrix.length > 0 ? (
            qrMatrix.map((row, rIdx) => (
              <View key={rIdx} style={styles.qrRow}>
                {row.map((isDark, cIdx) => (
                  <View
                    key={cIdx}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: isDark ? '#000000' : '#FFFFFF',
                    }}
                  />
                ))}
              </View>
            ))
          ) : (
            <View style={styles.qrFallback} />
          )}
        </View>
        <Text style={styles.qrCaption}>📷 스캔하여 피팅하기</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#16112A', // 다크 프리미엄 배경
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(216, 180, 248, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  leftSection: {
    flex: 1,
    marginRight: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 26,
    height: 26,
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 11,
    color: '#CCCCCC',
    marginTop: 4,
    fontWeight: '500',
  },
  referralBox: {
    backgroundColor: 'rgba(216, 180, 248, 0.18)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 7,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(216, 180, 248, 0.35)',
  },
  referralText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  codeHighlight: {
    color: '#D8B4F8',
    fontWeight: '800',
    fontSize: 12,
  },
  rightSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrRow: {
    flexDirection: 'row',
  },
  qrFallback: {
    width: 54,
    height: 54,
    backgroundColor: '#CCCCCC',
  },
  qrCaption: {
    fontSize: 9.5,
    color: '#D8B4F8',
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
});
