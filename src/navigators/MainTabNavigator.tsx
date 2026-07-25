// src/navigators/MainTabNavigator.tsx

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Image, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import VirtualFittingScreen from '../screens/VirtualFittingScreen';
import ClosetScreen from '../screens/ClosetScreen';
import RecentCodiScreen from '../screens/RecentCodiScreen';
import CommunityScreen from '../screens/CommunityScreen';

export type MainTabParamList = {
  Home: undefined;
  VirtualFitting:
    | {clothingUrl?: string; clothingUrls?: string[]}
    | undefined;
  Closet: undefined;
  Community: undefined;
  RecentCodi: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
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
        tabBarIcon: ({focused, color}) => {
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
          } else if (route.name === 'Community') {
            iconSource = focused
              ? require('../assets/icons/icon-community-active.png')
              : require('../assets/icons/icon-community-inactive.png');
          } else {
            iconSource = focused
              ? require('../assets/icons/icon-codibook-active.png')
              : require('../assets/icons/icon-codibook-inactive.png');
          }

          return (
            <Image
              source={iconSource}
              style={{width: 26, height: 26, tintColor: color}}
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
        name="Community"
        component={CommunityScreen}
        options={{
          title: '커뮤니티',
        }}
      />
      <Tab.Screen
        name="RecentCodi"
        component={RecentCodiScreen}
        options={{
          title: '코디북',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
