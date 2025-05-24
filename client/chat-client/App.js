import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './redux/store';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ChatListScreen from './screens/ChatListScreen';
import CreateChatScreen from './screens/CreateChatScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import ChatDetailScreen from './screens/ChatDetailScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUser } from './redux/userSlice';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import {
  connectSocket,
  disconnectSocket,
  requestOnlineUsers,
  onOnlineUsers,
  onStatusChange
} from './api/socket';
import { setOnlineUsers, updateUserStatus } from './redux/onlineSlice';
import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';

const Stack = createNativeStackNavigator();

const AppContent = () => {
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();

  useEffect(() => {
    const registerPush = async () => {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled && user?._id) {
        const token = await messaging().getToken();
        const userToken = await AsyncStorage.getItem('token');
        console.log('📲 FCM Token:', token);
        await axios.post('http://localhost:5000/api/auth/save-token', {
          userId: user._id,
          pushToken: token,
        },
          {
            headers: {
              Authorization: `Bearer ${userToken}` 
            }
          }
        );
      }
    };

    registerPush();
  }, [user]);

  useEffect(() => {
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      Alert.alert(remoteMessage.notification.title, remoteMessage.notification.body);
    });

    const unsubscribeNotificationOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('🔙 Opened from background:', remoteMessage.notification);
    });

    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('🆕 Opened from quit state:', remoteMessage.notification);
      }
    });

    return () => {
      unsubscribeForeground();
      unsubscribeNotificationOpened();
    };
  }, []);


  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access media library is required!');
      }
    })();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');
        if (token && userData) {
          dispatch(setUser(JSON.parse(userData)));
        }
      } catch (err) {
        console.error('Failed to load user from storage:', err);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (user?._id) {
      connectSocket(user._id);
      requestOnlineUsers();
      onOnlineUsers(users => dispatch(setOnlineUsers(users)));
      onStatusChange(({ userId, status }) =>
        dispatch(updateUserStatus({ userId, status }))
      );

      return () => disconnectSocket();
    }
  }, [user]);
  useEffect(() => {
    const getFcmToken = async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          const token = await messaging().getToken();
          if (token) {
            console.log('📲 FCM Token:', token);
            Alert.alert('FCM Token', token);
          } else {
            console.log('⚠️ No FCM token retrieved');
          }
        } else {
          console.log('❌ Permission not granted');
        }
      } catch (error) {
        console.error('🔥 Error getting FCM token:', error);
      }
    };

    getFcmToken();
  }, []);

  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="ChatList" component={ChatListScreen} />
          <Stack.Screen name="CreateChat" component={CreateChatScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <AppContent />
        <Toast />
      </NavigationContainer>
    </Provider>
  );
}
