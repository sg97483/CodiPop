// src/navigators/MainTabNavigator.tsx

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Image, Platform} from 'react-native';

// Tab으로 보여줄 화면들을 import 합니다.
import HomeScreen from '../screens/HomeScreen';
import VirtualFittingScreen from '../screens/VirtualFittingScreen';
import ClosetScreen from '../screens/ClosetScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Tab Navigator의 타입을 정의합니다.
export type MainTabParamList = {
  Home: undefined;
  VirtualFitting: undefined;
  Closet: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        // ✅ route를 받아와서 아이콘을 분기 처리합니다.
        headerShown: false,
        tabBarActiveTintColor: '#6A0DAD',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
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
          } else if (route.name === 'Profile') {
            // ✅ Profile 아이콘 분기 추가
            iconSource = focused
              ? require('../assets/icons/icon-fitting-active.png') // (준비 필요)
              : require('../assets/icons/icon-fitting-inactive.png'); // (준비 필요)
          }

          return (
            <Image
              source={iconSource}
              style={{width: 24, height: 24, tintColor: color}}
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
        name="Profile"
        component={ProfileScreen}
        options={{title: '프로필'}}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
