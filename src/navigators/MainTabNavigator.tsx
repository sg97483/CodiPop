// src/navigators/MainTabNavigator.tsx

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Image, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// Tab으로 보여줄 화면들을 import 합니다.
import HomeScreen from '../screens/HomeScreen';
import VirtualFittingScreen from '../screens/VirtualFittingScreen';
import ClosetScreen from '../screens/ClosetScreen';
import RecentCodiScreen from '../screens/RecentCodiScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Tab Navigator의 타입을 정의합니다.
export type MainTabParamList = {
  Home: undefined;
  VirtualFitting: {clothingUrl: string} | undefined;
  Closet: undefined;
  RecentCodi: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        // ✅ route를 받아와서 아이콘을 분기 처리합니다.
        headerShown: false,
        tabBarActiveTintColor: '#6A0DAD',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 76 : 59,
          paddingBottom: Platform.OS === 'ios' ? 25 : 8,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          marginBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -4,
        },
        // ✅ 아이콘 로직을 screenOptions에서 한 번에 관리합니다.
        tabBarIcon: ({focused, color, size}) => {
          let iconSource;

          if (route.name === 'Home') {
            iconSource = focused
              ? require('../assets/icons/icon-home-active.png')
              : require('../assets/icons/icon-home-inactive.png');
          } else if (route.name === 'VirtualFitting') {
            iconSource = focused
              ? require('../assets/icons/icon-fitting-active.png')
              : require('../assets/icons/icon-fitting-inactive.png');
          } else if (route.name === 'Closet') {
            iconSource = focused
              ? require('../assets/icons/icon-closet-active.png')
              : require('../assets/icons/icon-closet-inactive.png');
          } else if (route.name === 'RecentCodi') {
            iconSource = focused
              ? require('../assets/icons/icon-fitting-active.png') // 임시로 피팅룸 아이콘 사용
              : require('../assets/icons/icon-fitting-inactive.png');
          } else if (route.name === 'Profile') {
            // ✅ Profile 아이콘 분기 추가
            iconSource = focused
              ? require('../assets/icons/icon-fitting-active.png') // (준비 필요)
              : require('../assets/icons/icon-fitting-inactive.png'); // (준비 필요)
          }

          return (
            <Image
              source={iconSource}
              style={{width: 22, height: 22, tintColor: color}}
            />
          );
        },
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '홈',
        }}
      />
      <Tab.Screen
        name="VirtualFitting"
        component={VirtualFittingScreen}
        options={{
          title: '피팅룸',
        }}
      />
      <Tab.Screen
        name="Closet"
        component={ClosetScreen}
        options={{
          title: '내 옷장',
        }}
      />
      <Tab.Screen
        name="RecentCodi"
        component={RecentCodiScreen}
        options={{
          title: '코디북',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: '프로필'}}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
