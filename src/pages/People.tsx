import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePresence } from '@/hooks/usePresence';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string;
}

export default function People() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingDM, setCreatingDM] = useState<string | null>(null);

  const { onlineUsers } = usePresence('presence:people', user?.id, {
    name: user?.user_metadata?.name || 'Unknown',
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: "Erro ao carregar pessoas",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  const filteredProfiles = profiles.filter((profile) =>
    profile.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartDM = async (profileId: string) => {
    if (!user || profileId === user.id) return;
    
    setCreatingDM(profileId);
    try {
      // Check if DM conversation already exists
      const { data: existingConvs, error: searchError } = await supabase
        .from('conversations')
        .select('id, conversation_members!inner(user_id)')
        .eq('type', 'dm');

      if (searchError) throw searchError;

      // Find DM with exactly these 2 users
      let conversationId: string | null = null;
      
      for (const conv of existingConvs || []) {
        const { data: members } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', conv.id);
        
        const memberIds = members?.map(m => m.user_id) || [];
        if (
          memberIds.length === 2 &&
          memberIds.includes(user.id) &&
          memberIds.includes(profileId)
        ) {
          conversationId = conv.id;
          break;
        }
      }

      // Create new DM if doesn't exist
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            type: 'dm',
            created_by: user.id
          })
          .select()
          .single();

        if (convError) throw convError;

        // Add both users as members
        const { error: membersError } = await supabase
          .from('conversation_members')
          .insert([
            { conversation_id: newConv.id, user_id: user.id },
            { conversation_id: newConv.id, user_id: profileId }
          ]);

        if (membersError) throw membersError;
        
        conversationId = newConv.id;
      }

      // Navigate to chat with this conversation
      navigate(`/chat?conversation=${conversationId}`);
      
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar conversa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingDM(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pessoas</h1>
            <p className="text-muted-foreground">
              {onlineUsers.size} {onlineUsers.size === 1 ? 'pessoa' : 'pessoas'} online agora
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar pessoas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProfiles.map((profile) => {
              const isOnline = onlineUsers.has(profile.id);
              return (
                <Card
                  key={profile.id}
                  className="shadow-card transition-smooth hover:shadow-primary/20"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={profile.avatar_url || ''} />
                            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                              {profile.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card bg-accent" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{profile.name}</h3>
                          <Badge variant="secondary" className="mt-1">
                            {profile.role}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleStartDM(profile.id)}
                        disabled={profile.id === user?.id || creatingDM === profile.id}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && filteredProfiles.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhuma pessoa encontrada</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
