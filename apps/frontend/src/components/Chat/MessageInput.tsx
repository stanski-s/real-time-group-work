'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Loader2, Paperclip, X, Bold, Italic, Strikethrough, Code, Terminal } from 'lucide-react';
import api from '../../lib/axios';

interface MessageInputProps {
  channelId: string;
}

export default function MessageInput({ channelId }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [content]);

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
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && !selectedFile) return;
    if (sendMessage.isPending) return;
    sendMessage.mutate();
  };

  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = content;
    
    const before = text.substring(0, start);
    const selected = text.substring(start, end) || 'tekst';
    const after = text.substring(end);

    const newText = before + prefix + selected + suffix + after;
    setContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
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
      <div className="flex flex-col rounded-xl border border-gray-600 bg-[#222529] focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all shadow-sm">
        
        {/* Markdown Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-700 bg-[#1e2124] rounded-t-xl">
          <button type="button" onClick={() => insertFormatting('**')} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors" title="Pogrubienie (Ctrl+B)">
            <Bold className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => insertFormatting('*')} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors" title="Kursywa (Ctrl+I)">
            <Italic className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => insertFormatting('~')} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors" title="Przekreślenie">
            <Strikethrough className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-gray-700 mx-1"></div>
          <button type="button" onClick={() => insertFormatting('`')} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors" title="Kod inline">
            <Code className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => insertFormatting('```\n', '\n```')} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors" title="Blok kodu">
            <Terminal className="h-4 w-4" />
          </button>
        </div>

        {/* Input Area */}
        <div className="flex items-end gap-2 pr-2 pl-2 pb-2 pt-1">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mb-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
              // Optional: Hotkeys
              if (e.ctrlKey || e.metaKey) {
                if (e.key === 'b') { e.preventDefault(); insertFormatting('**'); }
                if (e.key === 'i') { e.preventDefault(); insertFormatting('*'); }
              }
            }}
            placeholder="Napisz wiadomość... (Shift+Enter dla nowej linii)"
            className="w-full bg-transparent px-2 py-2 text-gray-100 placeholder-gray-500 focus:outline-none resize-none min-h-[40px] text-[15px]"
            rows={1}
          />
          
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={(!content.trim() && !selectedFile) || sendMessage.isPending}
            className="mb-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {sendMessage.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </form>
  );
}
