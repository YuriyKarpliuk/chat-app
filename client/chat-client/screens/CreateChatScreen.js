import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Button,
  StyleSheet,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/axiosInstance';
import {
  requestOnlineUsers,
  onOnlineUsers,
  onStatusChange,
} from '../api/socket';
import { setOnlineUsers, updateUserStatus } from '../redux/onlineSlice';

const CreateChatScreen = () => {
  const user = useSelector(state => state.user.user);
  const onlineUsers = useSelector(state => state.online.onlineUsers);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState(null);
  const [search, setSearch] = useState('');
  const [privateChats, setPrivateChats] = useState([]);

  const fetchUsers = async () => {
    try {
      const usersRes = await api.get('/auth/users');
      const API_BASE = 'http://localhost:5000';
      const availableUsers = usersRes.data
        .filter(u => u._id !== user._id)
        .map(u => ({
          ...u,
          avatar: u.avatarUrl ? `${API_BASE}${u.avatarUrl}` : null,
        }));

      setUsers(availableUsers);
    } catch (err) {
      Alert.alert('Error', 'Could not fetch users');
    }
  };

  const fetchPrivateChats = async () => {
    try {
      const res = await api.get('/chats');
      const privateChatUserIds = res.data
        .filter(chat => !chat.isGroup)
        .map(chat => chat.members.find(m => m._id !== user._id)?._id);

      setPrivateChats(privateChatUserIds);
    } catch (err) {
      console.error('Failed to fetch private chats', err);
    }
  };

  useEffect(() => {
    if (isFocused && user?.token) {
      fetchUsers();
      fetchPrivateChats();
    }
  }, [isFocused, user]);

  useEffect(() => {
    requestOnlineUsers();
    onOnlineUsers(users => dispatch(setOnlineUsers(users)));
    onStatusChange(({ userId, status }) => {
      dispatch(updateUserStatus({ userId, status }));
    });
  }, []);

  const toggleUser = userId => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const pickGroupImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setGroupImage(result.assets[0]);
    }
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      return Alert.alert('Please select at least one user');
    }

    const isGroupChat = selectedUsers.length > 1;

    if (isGroupChat && !groupName.trim()) {
      return Alert.alert('Group name is required');
    }

    try {
      let formData;
      let createdChat;

      if (isGroupChat) {
        formData = new FormData();
        formData.append('name', groupName.trim());
        formData.append('isGroup', true);
        selectedUsers.forEach(id => formData.append('members', id));
        if (groupImage) {
          formData.append('groupImage', groupImage.file);
        }

        const res = await api.post('/chat/create', formData);
        createdChat = res.data;
      } else {
        const res = await api.post('/chat/create', { members: [selectedUsers[0]] });
        createdChat = res.data;
      }

      navigation.goBack();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not create chat';
      Alert.alert('Error', msg);
    }
  };

  const filteredUsers = users
    .filter(u => u.username.toLowerCase().includes(search.toLowerCase()))
    .filter(u => selectedUsers.length > 1 || !privateChats.includes(u._id));

  return (
    <View style={styles.container}>
      {selectedUsers.length > 1 && (
        <>
          <TextInput
            placeholder="Group name"
            value={groupName}
            onChangeText={setGroupName}
            style={styles.input}
          />
          <TouchableOpacity onPress={pickGroupImage} style={styles.imagePicker}>
            {groupImage ? (
              <Image source={{ uri: groupImage.uri }} style={styles.groupImage} />
            ) : (
              <Text style={styles.imagePickerText}>Pick Group Image</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <TextInput
        placeholder="Search user"
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />

      <FlatList
        data={filteredUsers}
        keyExtractor={item => item._id}
        renderItem={({ item }) => {
          const isOnline = onlineUsers.includes(item._id);
          return (
            <TouchableOpacity onPress={() => toggleUser(item._id)} style={styles.userItem}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <Text
                style={{
                  fontWeight: selectedUsers.includes(item._id) ? 'bold' : 'normal',
                  marginLeft: 10,
                }}
              >
                {item.username}
              </Text>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isOnline ? 'green' : 'gray',
                  marginLeft: 6,
                }}
              />
            </TouchableOpacity>
          );
        }}
      />

      <Button
        title={`Create ${selectedUsers.length > 1 ? 'Group' : 'Private'} Chat`}
        onPress={handleCreateChat}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderColor: '#ccc',
  },
  userItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ddd',
  },
  imagePicker: {
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickerText: {
    color: '#007AFF',
  },
  groupImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
});

export default CreateChatScreen;
