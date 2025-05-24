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
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import api from '../api/axiosInstance';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { onNewChatCreated, requestOnlineUsers, onOnlineUsers, onStatusChange, onChatDeleted, onLastMessageUpdate } from '../api/socket';
import { setOnlineUsers, updateUserStatus } from '../redux/onlineSlice';

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
  const onlineUsers = useSelector(state => state.online.onlineUsers);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [chats, setChats] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [now, setNow] = useState(Date.now());

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
    const isOnline = onlineUsers.includes(user._id);

    navigation.setOptions({
      headerRight: () => {
        return (
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile')} style={{ marginRight: 10 }}>
            <View style={{ position: 'relative' }}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={{ width: 30, height: 30, borderRadius: 15 }} />
              ) : (
                <Ionicons name="person-circle-outline" size={28} color="#007AFF" />
              )}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: isOnline ? 'green' : 'gray',
                  borderWidth: 1,
                  borderColor: '#fff',
                }}
              />
            </View>
          </TouchableOpacity>
        );
      },
      title: 'Chats',
    });
  }, [navigation, user.avatar, onlineUsers]);

  useEffect(() => {
    if (isFocused) fetchChats();
  }, [isFocused]);

  useEffect(() => {
    onNewChatCreated((newChat) => {
      setChats(prev => {
        const exists = prev.some(chat => chat._id === newChat._id);
        return exists ? prev : [newChat, ...prev];
      });
    });

    requestOnlineUsers();
    onOnlineUsers(users => dispatch(setOnlineUsers(users)));
    onStatusChange(({ userId, status }) => {
      dispatch(updateUserStatus({ userId, status }));
    });
    onChatDeleted((chatId) => {
      setChats(prev => prev.filter(chat => chat._id !== chatId));
    });


    const handleLastMessageUpdate = (msg) => {
      const chatId = typeof msg.chat === 'string' ? msg.chat : msg.chat._id;

      setChats(prevChats => {
        const existingChat = prevChats.find(chat => chat._id === chatId);
        if (!existingChat) return prevChats;

        const updatedChat = { ...existingChat, lastMessage: msg };
        const otherChats = prevChats.filter(chat => chat._id !== chatId);

        return [updatedChat, ...otherChats].sort((a, b) => {
          const aTime = new Date(a.lastMessage?.timestamp || 0).getTime();
          const bTime = new Date(b.lastMessage?.timestamp || 0).getTime();
          return bTime - aTime;
        });
      });
    };

    onLastMessageUpdate(handleLastMessageUpdate);

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

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
    const isOnline = !isGroup && onlineUsers.includes(targetUser?._id);

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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.chatName}>{chatName}</Text>
                {!isGroup && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      marginLeft: 6,
                      backgroundColor: isOnline ? 'green' : 'gray',
                    }}
                  />
                )}
              </View>
              <Text style={styles.lastMessage} numberOfLines={1}>{lastMsg}</Text>
            </View>
            <Text style={styles.timestamp}>{time}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
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
