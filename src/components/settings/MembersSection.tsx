import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Member {
  user_id: string;
  role: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
}

interface MembersSectionProps {
  projectId: string;
}

export function MembersSection({ projectId }: MembersSectionProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('project_members')
      .select('user_id, role, profiles(name, avatar_url)')
      .eq('project_id', projectId);

    if (!error && data) {
      setMembers(data as any);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  const handleAddMember = async () => {
    if (!searchEmail) return;

    setLoading(true);
    try {
      // Buscar usuário por email
      const { data: userData } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', searchEmail)
        .single();

      if (!userData) {
        toast({
          title: 'Usuário não encontrado',
          description: 'Verifique o email e tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.from('project_members').insert({
        project_id: projectId,
        user_id: userData.id,
        role: 'member',
      });

      if (error) throw error;

      toast({
        title: 'Membro adicionado',
        description: 'O usuário foi adicionado ao projeto.',
      });
      setSearchEmail('');
      loadMembers();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar membro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Papel atualizado',
        description: 'O papel do membro foi alterado com sucesso.',
      });
      loadMembers();
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar papel',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Membro removido',
        description: 'O usuário foi removido do projeto.',
      });
      loadMembers();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover membro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membros do Projeto</CardTitle>
        <CardDescription>
          Gerencie quem tem acesso a este projeto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Email do usuário"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
          <Button onClick={handleAddMember} disabled={loading}>
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{member.profiles.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{member.profiles.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={member.role}
                  onValueChange={(value: 'viewer' | 'member' | 'admin' | 'owner') => handleChangeRole(member.user_id, value)}
                  disabled={member.role === 'owner' || member.user_id === user?.id}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner" disabled>
                      Dono
                    </SelectItem>
                  </SelectContent>
                </Select>
                {member.role !== 'owner' && member.user_id !== user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMember(member.user_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
