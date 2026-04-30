'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/axios';
import { SendHorizontal, Paperclip, X } from 'lucide-react';

export default function DirectMessageInput({ workspaceId, otherUserId }: { workspaceId: string, otherUserId: string }) {
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
      await api.post(`/dms/${workspaceId}/${otherUserId}`, { 
        content,
        ...(fileData ? { fileUrl: fileData.fileUrl, fileType: fileData.fileType, fileName: fileData.fileName } : {})
      });
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 bg-[#1a1d21]">
      {selectedFile && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-800 rounded-lg w-max max-w-full overflow-hidden border border-gray-700">
          <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-300 truncate">{selectedFile.name}</span>
          <button type="button" onClick={() => setSelectedFile(null)} className="ml-2 text-gray-400 hover:text-red-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="relative rounded-xl border border-gray-700 bg-gray-800 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all flex items-end">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mb-2 ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <Paperclip className="h-5 w-5" />
        </button>
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
          disabled={(!content.trim() && !selectedFile) || sendMessage.isPending}
          className="absolute bottom-3 right-3 rounded-lg p-2 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
