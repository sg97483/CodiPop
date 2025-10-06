// src/screens/ProfileScreen.tsx

import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';

const ProfileScreen = () => {
  const user = auth().currentUser;

  const handleLogout = async () => {
    try {
      await auth().signOut();
      // App.tsx의 onAuthStateChanged가 로그아웃을 감지하고 자동으로 로그인 화면으로 보냅니다.
    } catch (error) {
      console.error('Logout Error:', error);
      Alert.alert('오류', '로그아웃 중 문제가 발생했습니다.');
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

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>로그아웃</Text>
      </TouchableOpacity>
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
    marginTop: 40,
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
});

export default ProfileScreen;
