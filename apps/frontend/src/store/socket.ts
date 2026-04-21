import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  connect: () => void;
  disconnect: () => void;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: [],
  
  connect: () => {
    if (get().socket) return;
    
    const socket = io('http://localhost:3000', {
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('Połączono z WebSocket!');
      set({ isConnected: true });
    });

    socket.on('online_users_list', (users: string[]) => {
      set({ onlineUsers: users });
    });

    socket.on('user_online', (userId: string) => {
      set((state) => ({ 
        onlineUsers: state.onlineUsers.includes(userId) ? state.onlineUsers : [...state.onlineUsers, userId] 
      }));
    });

    socket.on('user_offline', (userId: string) => {
      set((state) => ({ 
        onlineUsers: state.onlineUsers.filter(id => id !== userId) 
      }));
    });

    socket.on('disconnect', () => {
      console.log('Odłączono z WebSocket!');
      set({ isConnected: false, onlineUsers: [] });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  joinChannel: (channelId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('joinChannel', channelId);
    }
  },

  leaveChannel: (channelId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('leaveChannel', channelId);
    }
  }
}));
