'use client';

import { SmilePlus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '👀'];

interface ReactionMenuProps {
  onReact: (emoji: string) => void;
}

export default function ReactionMenu({ onReact }: ReactionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        title="Dodaj reakcję"
      >
        <SmilePlus className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 flex gap-1 z-50">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(emoji);
                setIsOpen(false);
              }}
              className="hover:bg-gray-700 p-1 rounded text-xl transition-transform hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
