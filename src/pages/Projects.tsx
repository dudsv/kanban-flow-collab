import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Lock, Globe, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  visibility: 'public' | 'private';
  created_at: string;
  owner_id: string;
}

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    visibility: 'private' as 'public' | 'private',
  });

  useEffect(() => {
    loadProjects();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
        },
        () => {
          loadProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar projetos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o projeto",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    const { error } = await supabase
      .from('projects')
      .insert({
        name: newProject.name,
        visibility: newProject.visibility,
        owner_id: user!.id,
      });

    setCreating(false);

    if (error) {
      toast({
        title: "Erro ao criar projeto",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Projeto criado!",
        description: "Colunas e tags padrão foram configuradas automaticamente",
      });
      setDialogOpen(false);
      setNewProject({ name: '', visibility: 'private' });
      loadProjects();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
            <p className="text-muted-foreground">
              Gerencie seus projetos e acompanhe o progresso
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Projeto</DialogTitle>
                <DialogDescription>
                  Configure seu projeto. Colunas e tags padrão serão criadas automaticamente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Projeto</Label>
                  <Input
                    id="name"
                    placeholder="Meu Projeto Incrível"
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Visibilidade</Label>
                  <RadioGroup
                    value={newProject.visibility}
                    onValueChange={(value: 'public' | 'private') =>
                      setNewProject({ ...newProject, visibility: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private" className="flex items-center gap-2 font-normal">
                        <Lock className="h-4 w-4" />
                        Privado - Apenas membros podem ver
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public" className="flex items-center gap-2 font-normal">
                        <Globe className="h-4 w-4" />
                        Público - Visível para todos
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateProject} disabled={creating}>
                  {creating ? "Criando..." : "Criar Projeto"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-16 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer shadow-card transition-smooth hover:shadow-primary/20"
                onClick={() => navigate(`/projects/${project.id}/board`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    {project.visibility === 'public' ? (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Criado{' '}
                    {formatDistanceToNow(new Date(project.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="mb-4 text-muted-foreground">Nenhum projeto ainda</p>
              <Button variant="hero" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Projeto
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
