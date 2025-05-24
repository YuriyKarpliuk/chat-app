import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import { useRoute } from '@react-navigation/native';
import api from '../api/axiosInstance';
import moment from 'moment';
import { joinChat, onNewMessage, sendMessageSocket, onMessageDeleted, onMessageUpdated } from '../api/socket';

const confirmDialog = (message, onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert('Confirm', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirm },
    ]);
  }
};

const ChatDetailScreen = () => {
  const { params } = useRoute();
  const { chatId } = params;
  const user = useSelector(state => state.user.user);
  const onlineUsers = useSelector(state => state.online.onlineUsers);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const inputRef = useRef(null);
  const flatListRef = useRef();

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${chatId}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!content.trim() && !selectedImage) return;

    try {
      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('content', content);
      if (selectedImage) {
        formData.append('image', selectedImage.file);
      }

      const res = await api.post('/message', formData);
      sendMessageSocket(chatId, { ...res.data, chat: chatId });
      setContent('');
      setSelectedImage(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error('Error sending message:', err?.response?.data || err.message);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const submitEdit = async () => {
    if (!editingContent.trim()) return;

    try {
      const res = await api.patch(`/message/edit/${editingMessageId}`, {
        content: editingContent,
      });

      setMessages(prev =>
        prev.map(msg =>
          msg._id === editingMessageId
            ? { ...msg, content: res.data.content, timestamp: res.data.timestamp }
            : msg
        )
      );
      setEditingMessageId(null);
      setEditingContent('');
    } catch (err) {
      console.error('Error updating message:', err.message);
    }
  };

  useEffect(() => {
    fetchMessages();
    joinChat(chatId);

    const handleNewMessage = (msg) => {
      const msgChatId = typeof msg.chat === 'string' ? msg.chat : msg.chat._id;

      if (msgChatId === chatId) {
        setMessages(prev => [...prev, msg]);
      }
    };

    const handleMessageDeleted = (messageId) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    const handleMessageUpdated = (updatedMsg) => {
      setMessages(prev =>
        prev.map(m =>
          m._id === updatedMsg._id ? { ...m, content: updatedMsg.content } : m
        )
      );
    };

    onNewMessage(handleNewMessage);
    onMessageDeleted(handleMessageDeleted);
    onMessageUpdated(handleMessageUpdated);
  }, [chatId]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item._id}
        renderItem={({ item }) => {
          const isOwnMessage = item.sender?._id === user._id;
          const isOnline = onlineUsers.includes(item.sender?._id);
          const avatarUri = item.sender?.avatarUrl
            ? `http://localhost:5000${item.sender.avatarUrl}`
            : 'http://localhost:5000/uploads/default.png';

          return (
            <View
              style={[
                styles.messageWrapper,
                isOwnMessage ? styles.ownWrapper : styles.otherWrapper,
              ]}
            >
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
              <View
                style={[
                  styles.messageBubble,
                  isOwnMessage ? styles.ownMessage : styles.otherMessage,
                ]}
              >
                <View style={styles.userRow}>
                  <Text style={styles.username}>{item.sender?.username || 'Unknown'}</Text>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: isOnline ? 'green' : 'gray',
                      marginLeft: 6,
                    }}
                  />
                </View>

                {editingMessageId === item._id ? (
                  <>
                    <TextInput
                      ref={inputRef}
                      style={[styles.messageText, styles.editInput]}
                      value={editingContent}
                      onChangeText={setEditingContent}
                      onSubmitEditing={submitEdit}
                      onBlur={submitEdit}
                      returnKeyType="done"
                      blurOnSubmit={true}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        setEditingMessageId(null);
                        setEditingContent('');
                      }}
                    >
                      <Text style={{ color: 'gray', marginTop: 4 }}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {item.imageUrl && (
                      <Image
                        source={{ uri: 'http://localhost:5000' + item.imageUrl }}
                        style={styles.image}
                      />
                    )}
                    {item.content ? (
                      <Text style={styles.messageText}>{item.content}</Text>
                    ) : null}
                  </>
                )}

                <Text style={styles.timestamp}>
                  {moment(item.timestamp).format('HH:mm')}
                </Text>

                {isOwnMessage && (
                  <View style={styles.actionButtons}>
                    {!item.imageUrl && (
                      <TouchableOpacity
                        onPress={() => {
                          const fresh = messages.find(m => m._id === item._id);
                          setEditingMessageId(item._id);
                          setEditingContent(fresh?.content || '');
                          setTimeout(() => {
                            requestAnimationFrame(() => {
                              inputRef.current?.focus();
                            });
                          }, 0);
                        }}
                        style={{ marginRight: 12 }}
                      >
                        <Text style={{ color: 'blue' }}>✏️</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() =>
                        confirmDialog('Are you sure you want to delete this message?', async () => {
                          try {
                            await api.delete(`/message/delete/${item._id}`);
                            setMessages(prev => prev.filter(m => m._id !== item._id));
                          } catch (err) {
                            console.error('Failed to delete message:', err.message);
                          }
                        })
                      }
                    >
                      <Text style={{ color: 'red' }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {selectedImage && (
        <View style={{ alignItems: 'center', padding: 8 }}>
          <Image
            source={{ uri: selectedImage.uri }}
            style={{ width: 200, height: 120, borderRadius: 8 }}
          />
          <TouchableOpacity onPress={() => setSelectedImage(null)}>
            <Text style={{ color: 'red', marginTop: 4 }}>Remove Image</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          value={content}
          onChangeText={setContent}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={pickImage} style={styles.imageButton}>
          <Text>📷</Text>
        </TouchableOpacity>
        <Button title="Send" onPress={sendMessage} />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    marginVertical: 4,
  },
  ownWrapper: { justifyContent: 'flex-end' },
  otherWrapper: { justifyContent: 'flex-start' },
  messageBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownMessage: { backgroundColor: '#cce5ff' },
  otherMessage: { backgroundColor: '#ffffff' },
  username: { fontWeight: 'bold', fontSize: 14 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageText: { fontSize: 14, marginBottom: 4 },
  editInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    padding: 4,
    borderRadius: 4,
  },
  timestamp: { fontSize: 11, color: '#999', textAlign: 'right' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8 },
  image: { width: 200, height: 130, borderRadius: 8, marginBottom: 6 },
  actionButtons: { flexDirection: 'row', marginTop: 4 },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    marginRight: 8,
    padding: 8,
    borderRadius: 4,
  },
  imageButton: { marginRight: 8 },
});

export default ChatDetailScreen;
