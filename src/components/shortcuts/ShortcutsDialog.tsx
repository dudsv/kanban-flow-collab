import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const shortcuts = [
    {
      category: 'Navegação',
      items: [
        { keys: ['G', 'P'], description: 'Ir para Projetos' },
        { keys: ['G', 'B'], description: 'Ir para Board' },
        { keys: ['G', 'C'], description: 'Ir para Chat' },
        { keys: ['G', 'N'], description: 'Ir para Notificações' },
        { keys: ['G', 'S'], description: 'Ir para Configurações' },
      ],
    },
    {
      category: 'Ações',
      items: [
        { keys: ['N'], description: 'Novo card' },
        { keys: ['C'], description: 'Novo comentário' },
        { keys: ['M'], description: 'Atribuir a mim' },
        { keys: ['E'], description: 'Exportar projeto' },
        { keys: ['I'], description: 'Importar dados' },
      ],
    },
    {
      category: 'Outros',
      items: [
        { keys: ['/'], description: 'Busca global' },
        { keys: ['Esc'], description: 'Fechar modal' },
        { keys: ['?'], description: 'Exibir atalhos' },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Atalhos de Teclado</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {shortcuts.map((category) => (
            <div key={category.category}>
              <h3 className="text-sm font-semibold mb-3">{category.category}</h3>
              <div className="space-y-2">
                {category.items.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <Badge
                          key={keyIdx}
                          variant="outline"
                          className="font-mono text-xs px-2 py-1"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
