import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import onlineReducer from './onlineSlice';


export const store = configureStore({
  reducer: {
    user: userReducer,
    online: onlineReducer,
  },
});
