import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { logout, setUser } from '../redux/userSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axiosInstance';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { requestOnlineUsers, onOnlineUsers, onStatusChange } from '../api/socket';
import { setOnlineUsers, updateUserStatus } from '../redux/onlineSlice';

const UserProfileScreen = () => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.user);
  const onlineUsers = useSelector(state => state.online.onlineUsers);

  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(user.avatar || null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    requestOnlineUsers();
    onOnlineUsers(users => dispatch(setOnlineUsers(users)));
    onStatusChange(({ userId, status }) => {
      dispatch(updateUserStatus({ userId, status }));
    });
  }, []);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0]);
    }
  };

  const showToast = (type, text) => {
    Toast.show({
      type,
      text1: text,
      position: 'bottom',
      visibilityTime: 3000,
    });
  };

  const handleUpdate = async () => {
    if (password && password !== confirmPassword) {
      showToast('error', 'Passwords do not match');
      return;
    }

    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    if (password) formData.append('password', password);
    if (avatar) {
      formData.append('avatar', avatar.file);
    }

    try {
      const res = await api.patch('/auth/user/update', formData);
      const API_BASE = 'http://localhost:5000';
      const avatarFullUrl = res.data.avatarUrl ? `${API_BASE}${res.data.avatarUrl}` : null;
      const updatedUser = {
        ...user,
        username: res.data.username,
        email: res.data.email,
        avatarUrl: res.data.avatarUrl,
        avatar: avatarFullUrl,
      };
      dispatch(setUser(updatedUser));
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      showToast('success', 'Profile updated successfully');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not update profile';
      showToast('error', msg);
    }
  };

  const handleLogout = async () => {
    dispatch(logout());
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
  };

  const isOnline = onlineUsers.includes(user._id);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <TouchableOpacity onPress={pickAvatar} style={styles.avatar}>
        {avatar ? (
          <Image source={{ uri: avatar.uri || avatar }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarPlaceholder}>+</Text>
        )}
      </TouchableOpacity>
      <Text style={[styles.statusText, { color: isOnline ? 'green' : 'gray' }]}>
        Status: {isOnline ? 'Online' : 'Offline'}
      </Text>

      <Text>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />

      <Text>Username</Text>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} />

      <Text>New Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholder="Leave blank to keep current"
        />
        <TouchableOpacity style={styles.icon} onPress={() => setShowPassword(prev => !prev)}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#888" />
        </TouchableOpacity>
      </View>

      <Text>Confirm Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity style={styles.icon} onPress={() => setShowConfirmPassword(prev => !prev)}>
          <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color="#888" />
        </TouchableOpacity>
      </View>

      <Button title="Update Profile" onPress={handleUpdate} />
      <View style={{ marginTop: 12 }} />
      <Button title="Logout" onPress={handleLogout} color="red" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarPlaceholder: {
    fontSize: 40,
    color: '#999',
  },
  avatar: {
    alignSelf: 'center',
    marginBottom: 20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },

  statusText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center'
  },

  passwordContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    paddingRight: 40,
  },
  icon: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
});

export default UserProfileScreen;
