import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { VisibilitySection } from '@/components/settings/VisibilitySection';
import { MembersSection } from '@/components/settings/MembersSection';
import { WipSection } from '@/components/settings/WipSection';
import { TagsSection } from '@/components/settings/TagsSection';
import { AuditSection } from '@/components/settings/AuditSection';
import { DangerZone } from '@/components/settings/DangerZone';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsRealtime } from '@/hooks/useSettingsRealtime';
import { Skeleton } from '@/components/ui/skeleton';

export default function Settings() {
  const { id: projectId } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadProject = async () => {
    if (!projectId) return;

    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    setProject(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  useSettingsRealtime(projectId!, loadProject);

  if (loading) {
    return (
      <AppLayout>
        <div className="container max-w-5xl py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="container max-w-5xl py-8">
          <p>Projeto não encontrado</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-5xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">{project.name}</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="members">Membros</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="audit">Auditoria</TabsTrigger>
            <TabsTrigger value="danger">Zona de Perigo</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <VisibilitySection
              projectId={projectId!}
              currentVisibility={project.visibility}
              onUpdate={loadProject}
            />
          </TabsContent>

          <TabsContent value="members">
            <MembersSection projectId={projectId!} />
          </TabsContent>

          <TabsContent value="workflow" className="space-y-6">
            <WipSection projectId={projectId!} />
            <TagsSection projectId={projectId!} />
          </TabsContent>

          <TabsContent value="audit">
            <AuditSection projectId={projectId!} />
          </TabsContent>

          <TabsContent value="danger">
            <DangerZone projectId={projectId!} projectName={project.name} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
