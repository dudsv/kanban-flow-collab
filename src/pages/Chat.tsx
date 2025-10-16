import { useState, useEffect, useCallback, useRef } from 'react';
import { useConversations, type Conversation } from '@/hooks/useConversations';
import { useMessages, type Message } from '@/hooks/useMessages';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { useChatPresence } from '@/hooks/useChatPresence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Smile } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { loadConversations } = useConversations();
  const { loadMessages, sendMessage, markAsRead } = useMessages(selectedConversation?.id || '');
  const { typingUsers, setTyping } = useChatPresence(selectedConversation?.id || '');

  const loadConversationMessages = useCallback(async () => {
    if (!selectedConversation) return;
    const msgs = await loadMessages();
    setMessages(msgs.reverse());
    
    // Mark last message as read
    if (msgs.length > 0) {
      markAsRead(msgs[msgs.length - 1].id);
    }
  }, [selectedConversation, loadMessages, markAsRead]);

  useChatRealtime(selectedConversation?.id || '', loadConversationMessages);

  useEffect(() => {
    loadConversations().then(setConversations);
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversation?.id) {
      loadConversationMessages();
    }
  }, [selectedConversation?.id, loadConversationMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

    const sent = await sendMessage(messageText);
    if (sent) {
      setMessageText('');
      setTyping(false);
    }
  };

  const handleTyping = (text: string) => {
    setMessageText(text);
    setTyping(text.length > 0);
  };

  return (
    <div className="flex h-screen">
      {/* Conversations List */}
      <div className="w-80 border-r border-border bg-muted/30">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Messages</h2>
        </div>
        <ScrollArea className="h-[calc(100vh-73px)]">
          {conversations.map(conv => (
            <button
              key={conv.id}
              className={`w-full p-4 text-left hover:bg-muted/50 transition-colors border-b border-border ${
                selectedConversation?.id === conv.id ? 'bg-muted' : ''
              }`}
              onClick={() => setSelectedConversation(conv)}
            >
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>
                    <MessageSquare className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {conv.title || `${conv.type} conversation`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">
                {selectedConversation.title || `${selectedConversation.type} conversation`}
              </h3>
              {typingUsers.length > 0 && (
                <p className="text-sm text-muted-foreground">Someone is typing...</p>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-medium">User</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => handleTyping(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <Button type="button" size="icon" variant="ghost">
                  <Smile className="h-5 w-5" />
                </Button>
                <Button type="submit" size="icon">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
