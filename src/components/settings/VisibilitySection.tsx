import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Globe, Lock } from 'lucide-react';

interface VisibilitySectionProps {
  projectId: string;
  currentVisibility: 'private' | 'public';
  onUpdate: () => void;
}

export function VisibilitySection({
  projectId,
  currentVisibility,
  onUpdate,
}: VisibilitySectionProps) {
  const [visibility, setVisibility] = useState<'private' | 'public'>(currentVisibility);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ visibility })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Visibilidade atualizada',
        description: `Projeto agora é ${visibility === 'public' ? 'público' : 'privado'}.`,
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar visibilidade',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visibilidade</CardTitle>
        <CardDescription>
          Controle quem pode ver este projeto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={visibility} onValueChange={(v: 'private' | 'public') => setVisibility(v)}>
          <div className="flex items-start space-x-3 p-4 rounded-lg border cursor-pointer hover:bg-accent">
            <RadioGroupItem value="private" id="private" />
            <div className="flex-1">
              <Label htmlFor="private" className="cursor-pointer flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span className="font-medium">Privado</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Apenas membros do projeto podem visualizar
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-4 rounded-lg border cursor-pointer hover:bg-accent">
            <RadioGroupItem value="public" id="public" />
            <div className="flex-1">
              <Label htmlFor="public" className="cursor-pointer flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="font-medium">Público</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Qualquer pessoa pode visualizar este projeto
              </p>
            </div>
          </div>
        </RadioGroup>
        {visibility !== currentVisibility && (
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
