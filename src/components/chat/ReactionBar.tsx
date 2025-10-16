import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Smile } from 'lucide-react';

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
}

interface ReactionBarProps {
  messageId: string;
  reactions: Reaction[];
  onReact: (messageId: string, emoji: string) => Promise<void>;
  currentUserId: string;
}

export function ReactionBar({ messageId, reactions, onReact, currentUserId }: ReactionBarProps) {
  const [open, setOpen] = useState(false);

  // Group reactions by emoji
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {} as Record<string, Reaction[]>);

  const handleEmojiClick = async (emojiData: EmojiClickData) => {
    await onReact(messageId, emojiData.emoji);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {/* Display existing reactions */}
      {Object.entries(grouped).map(([emoji, list]) => {
        const userReacted = list.some(r => r.user_id === currentUserId);
        return (
          <Button
            key={emoji}
            variant={userReacted ? 'default' : 'outline'}
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => onReact(messageId, emoji)}
          >
            {emoji} {list.length}
          </Button>
        );
      })}

      {/* Add new reaction */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Smile className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-0">
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
