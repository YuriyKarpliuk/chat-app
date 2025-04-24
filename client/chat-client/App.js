import React, { useEffect } from 'react';
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

const Stack = createNativeStackNavigator();

const AppContent = () => {
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();

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
