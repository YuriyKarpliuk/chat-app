import { createSlice } from '@reduxjs/toolkit';

const onlineSlice = createSlice({
  name: 'online',
  initialState: {
    onlineUsers: [],
  },
  reducers: {
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    updateUserStatus: (state, action) => {
      const { userId, status } = action.payload;
      if (status === 'online' && !state.onlineUsers.includes(userId)) {
        state.onlineUsers.push(userId);
      } else if (status === 'offline') {
        state.onlineUsers = state.onlineUsers.filter(id => id !== userId);
      }
    },
  },
});

export const { setOnlineUsers, updateUserStatus } = onlineSlice.actions;
export default onlineSlice.reducer;
