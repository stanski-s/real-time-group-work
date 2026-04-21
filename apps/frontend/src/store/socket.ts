import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  
  connect: () => {
    if (get().socket) return;
    
    const socket = io('http://localhost:3000', {
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('Połączono z WebSocket!');
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      console.log('Odłączono z WebSocket!');
      set({ isConnected: false });
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
