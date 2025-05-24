import { createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState = {
  user: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.user = null;
      AsyncStorage.removeItem('token');
      AsyncStorage.removeItem('user');
    },
  },
});

export const { setUser, logout } = userSlice.actions;
export default userSlice.reducer;
