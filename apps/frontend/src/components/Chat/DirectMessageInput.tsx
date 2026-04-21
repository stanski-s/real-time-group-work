'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/axios';
import { SendHorizontal } from 'lucide-react';

export default function DirectMessageInput({ workspaceId, otherUserId }: { workspaceId: string, otherUserId: string }) {
  const [content, setContent] = useState('');

  const sendMessage = useMutation({
    mutationFn: async () => {
      await api.post(`/dms/${workspaceId}/${otherUserId}`, { content });
    },
    onSuccess: () => {
      setContent('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sendMessage.isPending) return;
    sendMessage.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 bg-[#1a1d21]">
      <form onSubmit={handleSubmit} className="relative rounded-xl border border-gray-700 bg-gray-800 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Napisz bezpośrednią wiadomość..."
          className="w-full resize-none bg-transparent py-4 pl-4 pr-12 text-gray-100 placeholder-gray-500 focus:outline-none min-h-[56px] max-h-32"
          rows={1}
        />
        <button
          type="submit"
          disabled={!content.trim() || sendMessage.isPending}
          className="absolute bottom-3 right-3 rounded-lg p-2 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
