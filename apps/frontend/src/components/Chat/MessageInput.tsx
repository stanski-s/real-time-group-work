'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Loader2, Paperclip, X } from 'lucide-react';
import api from '../../lib/axios';

interface MessageInputProps {
  channelId: string;
}

export default function MessageInput({ channelId }: MessageInputProps) {
  const [content, setContent] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessage = useMutation({
    mutationFn: async () => {
      let fileData = null;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        fileData = uploadRes.data;
      }
      const res = await api.post(`/messages/${channelId}`, { 
        content,
        ...(fileData ? { fileUrl: fileData.fileUrl, fileType: fileData.fileType, fileName: fileData.fileName } : {})
      });
      return res.data;
    },
    onSuccess: () => {
      setContent('');
      setSelectedFile(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedFile) return;
    if (sendMessage.isPending) return;
    sendMessage.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-[#1a1d21]">
      {selectedFile && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-800 rounded-lg w-max max-w-full overflow-hidden border border-gray-700">
          <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-300 truncate">{selectedFile.name}</span>
          <button type="button" onClick={() => setSelectedFile(null)} className="ml-2 text-gray-400 hover:text-red-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2 rounded-xl border border-gray-600 bg-[#222529] focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all shadow-sm pr-2 pl-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mb-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Napisz wiadomość na #general"
          className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none resize-none max-h-32 min-h-[50px] text-[15px]"
          rows={1}
        />
        <button
          type="submit"
          disabled={(!content.trim() && !selectedFile) || sendMessage.isPending}
          className="mb-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {sendMessage.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}
