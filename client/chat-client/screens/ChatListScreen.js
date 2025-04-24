import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import api from '../api/axiosInstance';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

// ✅ Платформо-залежна функція підтвердження
const showConfirm = (message, onConfirm) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(message);
    if (confirmed) onConfirm();
  } else {
    Alert.alert(
      'Delete Chat',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm },
      ],
      { cancelable: true }
    );
  }
};

const ChatListScreen = () => {
  const user = useSelector(state => state.user.user);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [chats, setChats] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchChats = async () => {
    try {
      const res = await api.get('/chats');
      setChats(res.data);
    } catch (err) {
      console.error('Failed to fetch chats', err);
    }
  };

  const deleteChat = async (chatId) => {
    try {
      await api.delete(`/chat/delete/${chatId}`);
      setChats(prev => prev.filter(chat => chat._id !== chatId));
    } catch (err) {
      console.error('Failed to delete chat:', err?.response?.data || err.message);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('UserProfile')} style={{ marginRight: 10 }}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={{ width: 30, height: 30, borderRadius: 15 }} />
          ) : (
            <Ionicons name="person-circle-outline" size={28} color="#007AFF" />
          )}
        </TouchableOpacity>
      ),
      title: 'Chats',
    });
  }, [navigation, user.avatar]);

  useEffect(() => {
    if (isFocused) fetchChats();
  }, [isFocused]);

  const filteredChats = chats.filter(chat => {
    const isGroup = chat.isGroup;
    const targetUser = chat.members?.find(m => m._id !== user._id);
    const name = isGroup ? chat.name : targetUser?.username || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const renderChatItem = ({ item }) => {
    const isGroup = item.isGroup;
    const lastMsg = item.lastMessage?.content || 'No messages yet';
    const time = item.lastMessage?.timestamp
      ? moment(item.lastMessage.timestamp).fromNow()
      : '';

    const targetUser = item.members?.find(m => m._id !== user._id);
    const avatarUri = isGroup
      ? 'http://localhost:5000' + item.groupImageUrl
      : 'http://localhost:5000' + targetUser?.avatarUrl;
    const chatName = isGroup ? item.name : targetUser?.username || 'Unknown';

    return (
      <View style={styles.chatItem}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ChatDetail', { chatId: item._id })}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          >
            <Image
              source={{ uri: avatarUri || 'http://localhost:5000/uploads/default.png' }}
              style={styles.avatar}
            />
            <View style={styles.chatInfo}>
              <Text style={styles.chatName}>{chatName}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>{lastMsg}</Text>
            </View>
            <Text style={styles.timestamp}>{time}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              console.log('Delete button pressed for chat:', item._id);
              showConfirm('Are you sure you want to delete this chat?', () => deleteChat(item._id));
            }}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#ff3b30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search chats..."
        value={searchTerm}
        onChangeText={setSearchTerm}
      />

      {filteredChats.length === 0 ? (
        <View style={styles.empty}>
          <Text>No chats found.</Text>
          <Button title="Create New Chat" onPress={() => navigation.navigate('CreateChat')} />
        </View>
      ) : (
        <>
          <FlatList
            data={[...filteredChats].sort((a, b) => {
              const aTime = new Date(a.lastMessage?.timestamp || 0).getTime();
              const bTime = new Date(b.lastMessage?.timestamp || 0).getTime();
              return bTime - aTime;
            })}
            keyExtractor={item => item._id}
            renderItem={renderChatItem}
          />
          <Button title="Create New Chat" onPress={() => navigation.navigate('CreateChat')} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
    marginRight: 10,
  },
  chatInfo: {
    flex: 1,
  },
  deleteButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  lastMessage: {
    color: '#666',
    fontSize: 13,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginLeft: 5,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatListScreen;
