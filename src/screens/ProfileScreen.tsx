// src/screens/ProfileScreen.tsx

import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useTranslation } from 'react-i18next';

const ProfileScreen = () => {
  const user = auth().currentUser;
  const insets = useSafeAreaInsets();
  const [isDeleting, setIsDeleting] = useState(false);
  const { t, i18n } = useTranslation();

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
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>프로필</Text>

      <View style={styles.profileInfoContainer}>
        <Text style={styles.infoLabel}>로그인된 계정</Text>
        <Text style={styles.emailText}>
          {user ? user.email : '사용자 정보 없음'}
        </Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
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
});

export default ProfileScreen;
