import { useState, useEffect, useCallback, useRef } from 'react';
import { useConversations, type Conversation } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { useChatPresence } from '@/hooks/useChatPresence';
import { AppLayout } from '@/components/layout/AppLayout';
import { MessageInput } from '@/components/chat/MessageInput';
import { FileAttachment } from '@/components/chat/FileAttachment';
import { ReactionBar } from '@/components/chat/ReactionBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { loadConversations } = useConversations();
  const { loadMessages, sendMessage, toggleReaction, markAsRead } = useMessages(selectedConversation?.id || '');
  const { typingUsers, setTyping } = useChatPresence(selectedConversation?.id || '');

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Load conversations
  const loadConversationsList = useCallback(async () => {
    setLoadingConvs(true);
    const convs = await loadConversations();
    setConversations(convs);
    setLoadingConvs(false);
  }, [loadConversations]);

  // Load messages for selected conversation
  const loadConversationMessages = useCallback(async () => {
    if (!selectedConversation) return;
    setLoadingMsgs(true);
    const msgs = await loadMessages();
    setMessages(msgs.reverse());
    setLoadingMsgs(false);
    
    // Mark last message as read
    if (msgs.length > 0) {
      markAsRead(msgs[msgs.length - 1].id);
    }
  }, [selectedConversation, loadMessages, markAsRead]);

  // Realtime updates
  useChatRealtime(selectedConversation?.id || '', loadConversationMessages);

  // Realtime for conversations list
  useEffect(() => {
    const channel = supabase.channel('conversations-list')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'conversations' 
      }, () => {
        loadConversationsList();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadConversationsList]);

  useEffect(() => {
    loadConversationsList();
  }, [loadConversationsList]);

  useEffect(() => {
    if (selectedConversation?.id) {
      loadConversationMessages();
    }
  }, [selectedConversation?.id, loadConversationMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Optimistic send message
  const handleSendMessage = async (text: string, file?: File) => {
    if (!text.trim() && !file) return;
    if (!selectedConversation) return;

    // Optimistic: add temp message
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      conversation_id: selectedConversation.id,
      author_id: currentUserId,
      body: text,
      created_at: new Date().toISOString(),
      author: {
        name: 'Você',
        avatar_url: null,
        email: null
      },
      files: [],
      message_reactions: [],
      message_reads: []
    };
    setMessages(prev => [...prev, tempMsg]);

    // Send
    const sent = await sendMessage(text, file);
    
    if (!sent) {
      // Rollback
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast({
        title: 'Failed to send',
        description: 'Message could not be sent',
        variant: 'destructive'
      });
    } else {
      // Replace temp with real
      setMessages(prev => prev.map(m => m.id === tempId ? sent : m));
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await toggleReaction(messageId, emoji);
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Conversations List */}
        <div className="w-80 border-r">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Messages</h2>
          </div>
          <ScrollArea className="h-[calc(100vh-9rem)]">
            {loadingConvs ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  className={`w-full p-4 text-left hover:bg-muted/50 transition-colors border-b ${
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
              ))
            )}
          </ScrollArea>
        </div>

        {/* Messages Thread */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b">
                <h3 className="font-semibold">
                  {selectedConversation.title || `${selectedConversation.type} conversation`}
                </h3>
                {typingUsers.length > 0 && (
                  <p className="text-sm text-muted-foreground">Someone is typing...</p>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {loadingMsgs ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map(msg => {
                      const isTemp = msg.id.startsWith('temp-');
                      return (
                        <div 
                          key={msg.id} 
                          className={`flex gap-3 ${isTemp ? 'opacity-60' : ''}`}
                        >
                          <Avatar className="h-8 w-8">
                            {msg.author?.avatar_url ? (
                              <AvatarImage src={msg.author.avatar_url} />
                            ) : (
                              <AvatarFallback>
                                {(msg.author?.name || msg.author?.email || 'U')
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <p className="text-sm font-medium">
                                {msg.author?.name || msg.author?.email || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            {msg.body && (
                              <p className="text-sm mt-1 whitespace-pre-wrap">{msg.body}</p>
                            )}
                            
                            {/* File attachments */}
                            {msg.files?.map((file: any) => (
                              <FileAttachment key={file.id} file={file} />
                            ))}
                            
                            {/* Reactions */}
                            {!isTemp && (
                              <ReactionBar
                                messageId={msg.id}
                                reactions={msg.message_reactions || []}
                                onReact={handleReaction}
                                currentUserId={currentUserId}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <MessageInput
                onSend={handleSendMessage}
                onTyping={setTyping}
                disabled={loadingMsgs}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
