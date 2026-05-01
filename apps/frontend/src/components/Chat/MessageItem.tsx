'use client';

import { MessageSquareReply, FileText, Download } from 'lucide-react';
import ReactionMenu from './ReactionMenu';
import { useAuthStore } from '../../store/auth';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/axios';
import { Message, Reaction } from '../../types';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageItemProps {
  msg: Message;
  entityType: 'message' | 'directMessage';
  onReply?: () => void;
}

export default function MessageItem({ msg, entityType, onReply }: MessageItemProps) {
  const { user } = useAuthStore();

  const toggleReaction = useMutation({
    mutationFn: async (emoji: string) => {
      const existing = msg.reactions?.find((r: Reaction) => r.emoji === emoji && r.userId === user?.id);
      if (existing) {
        await api.delete('/reactions', { data: { emoji, entityId: msg.id, entityType } });
      } else {
        await api.post('/reactions', { emoji, entityId: msg.id, entityType });
      }
    }
  });

  const groupedReactions = msg.reactions?.reduce((acc: Record<string, string[]>, r: Reaction) => {
    acc[r.emoji] = acc[r.emoji] || [];
    acc[r.emoji].push(r.userId);
    return acc;
  }, {}) || {};

  return (
    <div className="flex items-start gap-4 hover:bg-gray-800/30 p-2 rounded-lg transition-colors group relative">
      {/* Actions (Hover) */}
      <div className="absolute right-4 -top-3 hidden group-hover:flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1 shadow-sm z-10">
        <ReactionMenu onReact={(emoji) => toggleReaction.mutate(emoji)} />
        {onReply && (
          <button onClick={onReply} className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Odpowiedz w wątku">
            <MessageSquareReply className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-indigo-500/20 flex items-center justify-center overflow-hidden">
        {msg.author.image ? (
          <img src={msg.author.image} alt={msg.author.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-indigo-400 font-bold">{msg.author.name?.charAt(0).toUpperCase() || '?'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-gray-200">{msg.author.name}</span>
          <span className="text-xs text-gray-500">
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        {/* Renderowanie treści w formacie Rich Text (Markdown) */}
        <div className="mt-1 break-words text-gray-300 leading-relaxed text-[15px]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => <a {...props} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" />,
              p: ({ node, ...props }) => <p {...props} className="m-0 whitespace-pre-wrap" />,
              strong: ({ node, ...props }) => <strong {...props} className="font-bold text-white" />,
              em: ({ node, ...props }) => <em {...props} className="italic" />,
              del: ({ node, ...props }) => <del {...props} className="line-through text-gray-500" />,
              blockquote: ({ node, ...props }) => <blockquote {...props} className="border-l-4 border-gray-600 pl-3 py-0.5 my-1 text-gray-400 bg-gray-800/30 rounded-r" />,
              ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 my-1" />,
              ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 my-1" />,
              code(props) {
                const {children, className, node, ...rest} = props;
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  // @ts-expect-error: SyntaxHighlighter types can be mismatched with React 19
                  <SyntaxHighlighter
                    {...rest}
                    PreTag="div"
                    children={String(children).replace(/\n$/, '')}
                    language={match[1]}
                    style={vscDarkPlus}
                    className="rounded-md border border-gray-700 !bg-[#1e1e1e] !my-2 text-sm scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                  />
                ) : (
                  <code {...rest} className="bg-gray-800 text-[#ff8787] px-1.5 py-0.5 rounded text-[13px] font-mono border border-gray-700">
                    {children}
                  </code>
                )
              }
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
        
        {/* Renderowanie załącznika */}
        {msg.fileUrl && (
          <div className="mt-2 rounded-lg overflow-hidden max-w-sm border border-gray-700 bg-gray-800/50">
            {msg.fileType?.startsWith('image/') ? (
              <a href={`http://localhost:3000${msg.fileUrl}`} target="_blank" rel="noopener noreferrer" className="block cursor-zoom-in">
                <img 
                  src={`http://localhost:3000${msg.fileUrl}`} 
                  alt={msg.fileName || 'Załącznik'} 
                  className="w-full h-auto max-h-64 object-contain bg-gray-900"
                />
              </a>
            ) : (
              <a 
                href={`http://localhost:3000${msg.fileUrl}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 hover:bg-gray-700/50 transition-colors group"
              >
                <div className="h-10 w-10 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{msg.fileName}</p>
                  <p className="text-xs text-gray-500 uppercase">{msg.fileType?.split('/')[1] || 'PLIK'}</p>
                </div>
                <Download className="h-4 w-4 text-gray-500 group-hover:text-white" />
              </a>
            )}
          </div>
        )}
        
        {/* Reactions List */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(groupedReactions).map(([emoji, userIds]) => {
              const hasReacted = userIds.includes(user?.id || '');
              return (
                <button
                  key={emoji}
                  onClick={() => toggleReaction.mutate(emoji)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    hasReacted 
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' 
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Replies indicator */}
        {(msg._count?.replies ?? 0) > 0 && onReply && (
          <button 
            onClick={onReply}
            className="mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            {msg._count?.replies} {msg._count?.replies === 1 ? 'odpowiedź' : 'odpowiedzi'}
          </button>
        )}
      </div>
    </div>
  );
}
