// src/screens/ProfileScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from '../navigation/types';
import {
  getUserReferralCode,
  checkHasClaimedReferral,
  claimReferralCode,
  TICKET_REWARD_REFERRAL,
} from '../services/ticketService';
import { buildStoreLinksText } from '../constants/appLinks';

const ProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = auth().currentUser;
  const insets = useSafeAreaInsets();
  const [isDeleting, setIsDeleting] = useState(false);
  const { t, i18n } = useTranslation();

  const [referralCode, setReferralCode] = useState<string>('');
  const [hasClaimed, setHasClaimed] = useState<boolean>(false);
  const [inputReferral, setInputReferral] = useState<string>('');
  const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      getUserReferralCode().then(code => setReferralCode(code));
      checkHasClaimedReferral().then(claimed => setHasClaimed(claimed));
    }
  }, [user]);

  const handleShareReferral = async () => {
    if (!referralCode) return;
    try {
      await Share.share({
        // "+20장(2회권)" 처럼 단위가 섞여 무슨 뜻인지 읽히지 않는다는 지적을 받았습니다.
        // 티켓 1장 = 피팅 1회이므로 "티켓 N장(N회)" 한 가지로만 씁니다.
        message: [
          '[코디팝] AI 가상 피팅 초대',
          `초대 코드 ${referralCode} 를 입력하시면 피팅 티켓 ${TICKET_REWARD_REFERRAL}장(${TICKET_REWARD_REFERRAL}회)을 드려요.`,
          buildStoreLinksText(),
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (error) {
      console.error('공유하기 실패:', error);
    }
  };

  const handleClaimSubmit = async () => {
    if (!inputReferral || inputReferral.trim().length < 5) {
      Alert.alert('알림', '6자리 초대 코드를 정확히 입력해 주세요.');
      return;
    }
    setIsSubmittingCode(true);
    try {
      const res = await claimReferralCode(inputReferral);
      if (res.success) {
        setHasClaimed(true);
        setInputReferral('');
        Alert.alert('축하합니다! 🎉', res.message);
      } else {
        Alert.alert('안내', res.message);
      }
    } catch (error) {
      Alert.alert('오류', '초대 코드 등록 중 문제가 발생했습니다.');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
      // App.tsx의 onAuthStateChanged가 로그아웃을 감지하고 자동으로 로그인 화면으로 보냅니다.
    } catch (error) {
      console.error('Logout Error:', error);
      Alert.alert('오류', '로그아웃 중 문제가 발생했습니다.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '회원 탈퇴',
      '모든 옷장과 피팅 기록이 영구적으로 삭제됩니다.\n\n정말 탈퇴하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: async () => {
            // 최종 확인
            Alert.alert(
              '최종 확인',
              '정말로 탈퇴하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
              [
                {
                  text: '취소',
                  style: 'cancel',
                },
                {
                  text: '탈퇴',
                  style: 'destructive',
                  onPress: deleteUserData,
                },
              ],
            );
          },
        },
      ],
    );
  };

  const deleteUserData = async () => {
    if (!user) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
      return;
    }

    setIsDeleting(true);

    try {
      const userId = user.uid;

      // 1. Firestore 컬렉션 삭제
      // closet 컬렉션 삭제
      const closetSnapshot = await firestore()
        .collection('users')
        .doc(userId)
        .collection('closet')
        .get();

      const closetDeletePromises = closetSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(closetDeletePromises);

      // recentResults 컬렉션 삭제
      const recentResultsSnapshot = await firestore()
        .collection('users')
        .doc(userId)
        .collection('recentResults')
        .get();

      const recentResultsDeletePromises = recentResultsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(recentResultsDeletePromises);

      // recentCodi 컬렉션 삭제
      const recentCodiSnapshot = await firestore()
        .collection('users')
        .doc(userId)
        .collection('recentCodi')
        .get();

      const recentCodiDeletePromises = recentCodiSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(recentCodiDeletePromises);

      const wishlistSnapshot = await firestore()
        .collection('users')
        .doc(userId)
        .collection('wishlist')
        .get();

      const wishlistDeletePromises = wishlistSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(wishlistDeletePromises);

      // 2. Firebase Storage에서 사용자 폴더 삭제
      try {
        const storageRef = storage().ref(`users/${userId}`);
        const listResult = await storageRef.listAll();

        const deletePromises = listResult.items.map(item => item.delete());
        await Promise.all(deletePromises);

        // 폴더 자체도 삭제 시도 (가능한 경우)
        try {
          await storageRef.delete();
        } catch (folderError) {
          // 폴더 삭제는 실패할 수 있으므로 무시
          console.log('폴더 삭제 실패 (무시됨):', folderError);
        }
      } catch (storageError) {
        console.error('Storage 삭제 중 오류 (계속 진행):', storageError);
        // Storage 삭제 실패해도 계속 진행
      }

      // 3. Firebase Authentication 계정 삭제
      await user.delete();

      Alert.alert(
        '탈퇴 완료',
        '회원 탈퇴가 완료되었습니다.\n이용해 주셔서 감사합니다.',
        [{ text: '확인', onPress: () => { } }],
      );
    } catch (error: any) {
      console.error('회원 탈퇴 오류:', error);

      let errorMessage = '회원 탈퇴 중 문제가 발생했습니다.';

      if (error.code === 'auth/requires-recent-login') {
        errorMessage = '보안을 위해 다시 로그인한 후 탈퇴를 진행해주세요.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = '네트워크 연결을 확인해주세요.';
      }

      Alert.alert('오류', errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.profileInfoContainer}>
          <Text style={styles.infoLabel}>로그인된 계정</Text>
          <Text style={styles.emailText}>
            {user ? user.email : '사용자 정보 없음'}
          </Text>
        </View>

        {/* 친구 초대 및 보너스 티켓 섹션 */}
        <View style={styles.referralContainer}>
          <View style={styles.referralHeader}>
            <Text style={styles.referralTitle}>친구 초대하고 티켓 {TICKET_REWARD_REFERRAL}장 받기</Text>
            <Text style={styles.referralDesc}>
              친구와 내가 모두 피팅 2회권(+20장)을 받아요!
            </Text>
          </View>

          <View style={styles.myCodeBox}>
            <Text style={styles.myCodeLabel}>내 초대 코드</Text>
            <View style={styles.myCodeRow}>
              <Text style={styles.myCodeText}>{referralCode || '로딩 중...'}</Text>
              <TouchableOpacity
                style={styles.shareCodeButton}
                onPress={handleShareReferral}
                disabled={!referralCode}>
                <Text style={styles.shareCodeButtonText}>공유하기</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!hasClaimed ? (
            <View style={styles.claimBox}>
              <Text style={styles.claimLabel}>친구의 초대 코드 등록</Text>
              <View style={styles.claimInputRow}>
                <TextInput
                  style={styles.claimInput}
                  placeholder="6자리 코드 입력"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  maxLength={10}
                  value={inputReferral}
                  onChangeText={setInputReferral}
                />
                <TouchableOpacity
                  style={[
                    styles.claimButton,
                    isSubmittingCode && styles.claimButtonDisabled,
                  ]}
                  onPress={handleClaimSubmit}
                  disabled={isSubmittingCode}>
                  {isSubmittingCode ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.claimButtonText}>등록</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.claimedSuccessBox}>
              <Text style={styles.claimedSuccessText}>
                친구 초대 코드가 등록되어 티켓 {TICKET_REWARD_REFERRAL}장이 지급되었습니다.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.profileInfoContainer}>
          <Text style={styles.infoLabel}>{t('sizeProfileSection')}</Text>
          <TouchableOpacity
            style={styles.bodySizeButton}
            onPress={() => navigation.navigate('BodySize')}>
            <Text style={styles.bodySizeButtonText}>{t('sizeProfileCta')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfoContainer}>
          <Text style={styles.infoLabel}>{t('languageSettings')}</Text>
          <View style={styles.languageButtonContainer}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                i18n.language === 'ko' && styles.activeLanguageButton,
              ]}
              onPress={() => changeLanguage('ko')}>
              <Text
                style={[
                  styles.languageButtonText,
                  i18n.language === 'ko' && styles.activeLanguageButtonText,
                ]}>
                {t('korean')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageButton,
                i18n.language === 'en' && styles.activeLanguageButton,
              ]}
              onPress={() => changeLanguage('en')}>
              <Text
                style={[
                  styles.languageButtonText,
                  i18n.language === 'en' && styles.activeLanguageButtonText,
                ]}>
                {t('english')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {isDeleting ? (
          <View style={[styles.loadingContainer, { marginBottom: insets.bottom + 20 }]}>
            <ActivityIndicator size="large" color="#FF6B9D" />
            <Text style={styles.loadingText}>계정 삭제 중...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.logoutButton, { marginTop: 40 }]}
              onPress={handleLogout}
              disabled={isDeleting}>
              <Text style={styles.logoutButtonText}>로그아웃</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteAccountButton, { marginBottom: insets.bottom + 20 }]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}>
              <Text style={styles.deleteAccountButtonText}>회원 탈퇴</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 22,
    color: '#333333',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#222222',
  },
  profileInfoContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: 'gray',
  },
  emailText: {
    fontSize: 18,
    color: '#000000',
    marginTop: 8,
  },
  bodySizeButton: {
    marginTop: 10,
    backgroundColor: '#F6EDFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0C8F0',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  bodySizeButtonText: {
    color: '#6A0DAD',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutButton: {
    marginHorizontal: 20,
    backgroundColor: '#F0F0F0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    color: 'red',
    fontWeight: '600',
  },
  deleteAccountButton: {
    marginTop: 12,
    marginHorizontal: 20,
    backgroundColor: '#D0D0D0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    fontSize: 16,
    color: 'red',
    fontWeight: '600',
  },
  loadingContainer: {
    marginTop: 40,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  languageButtonContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  languageButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  activeLanguageButton: {
    backgroundColor: '#FF6B9D',
    borderColor: '#FF6B9D',
  },
  languageButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  activeLanguageButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  referralContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFF5F8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE0EC',
  },
  referralHeader: {
    marginBottom: 12,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF4D8D',
  },
  referralDesc: {
    fontSize: 13,
    color: '#666666',
    marginTop: 4,
  },
  myCodeBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 12,
  },
  myCodeLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 6,
  },
  myCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myCodeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222222',
    letterSpacing: 1.5,
  },
  shareCodeButton: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareCodeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  claimBox: {
    borderTopWidth: 1,
    borderTopColor: '#FFE0EC',
    paddingTop: 12,
  },
  claimLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  claimInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  claimInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
  },
  claimButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  claimedSuccessBox: {
    borderTopWidth: 1,
    borderTopColor: '#FFE0EC',
    paddingTop: 12,
    alignItems: 'center',
  },
  claimedSuccessText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
});

export default ProfileScreen;
