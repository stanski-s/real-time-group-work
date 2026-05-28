'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/axios';
import { SendHorizontal, Paperclip, X, Bold, Italic, Strikethrough, Code, Terminal, Loader2 } from 'lucide-react';

export default function DirectMessageInput({ otherUserId }: { otherUserId: string }) {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to expand naturally with text
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
      await api.post(`/dms/${otherUserId}`, { 
        content,
        ...(fileData ? { fileUrl: fileData.fileUrl, fileType: fileData.fileType, fileName: fileData.fileName } : {})
      });
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Hotkeys support (Ctrl/Cmd + B for Bold, Ctrl/Cmd + I for Italic)
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); insertFormatting('**'); }
      if (e.key === 'i') { e.preventDefault(); insertFormatting('*'); }
    }
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
    
    // Maintain selection and focus after insert
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
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
      <form onSubmit={handleSubmit} className="flex flex-col rounded-xl border border-gray-700 bg-gray-800 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
        
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
            onKeyDown={handleKeyDown}
            placeholder="Napisz bezpośrednią wiadomość... (Shift+Enter dla nowej linii)"
            className="w-full bg-transparent px-2 py-2 text-gray-100 placeholder-gray-500 focus:outline-none resize-none min-h-[40px] text-[15px]"
            rows={1}
          />
          
          <button
            type="submit"
            disabled={(!content.trim() && !selectedFile) || sendMessage.isPending}
            className="mb-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {sendMessage.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
