// src/screens/DetailScreen.tsx

import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share, // ✅ Share API import
  Alert,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../App'; // App.tsx의 타입을 가져옵니다.

type DetailScreenRouteProp = RouteProp<RootStackParamList, 'Detail'>;

const DetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<DetailScreenRouteProp>();
  const {imageUrl} = route.params; // 홈 화면에서 전달받은 이미지 URL

  const onShare = async () => {
    try {
      await Share.share({
        message: `CodiPOP 앱에서 생성한 새로운 스타일을 확인해보세요! ✨\n${imageUrl}`,
        url: imageUrl, // iOS에서는 url이 이미지와 함께 공유됩니다.
      });
    } catch (error: any) {
      Alert.alert(error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* --- 헤더 --- */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.button}>
          <Text style={styles.buttonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>피팅 결과</Text>
        <TouchableOpacity onPress={onShare} style={styles.button}>
          <Text style={styles.buttonText}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* --- 이미지 --- */}
      <View style={styles.imageContainer}>
        <Image
          source={{uri: imageUrl}}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  button: {
    padding: 8,
  },
  buttonText: {
    fontSize: 24,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default DetailScreen;
