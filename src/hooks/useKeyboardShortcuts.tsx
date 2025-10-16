import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface ShortcutConfig {
  key: string;
  modifier?: 'ctrl' | 'alt' | 'shift' | 'meta';
  description: string;
  action: () => void;
  global?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const modifierPressed =
          !shortcut.modifier ||
          (shortcut.modifier === 'ctrl' && e.ctrlKey) ||
          (shortcut.modifier === 'alt' && e.altKey) ||
          (shortcut.modifier === 'shift' && e.shiftKey) ||
          (shortcut.modifier === 'meta' && e.metaKey);

        if (e.key.toLowerCase() === shortcut.key.toLowerCase() && modifierPressed) {
          // Ignora se usuário está digitando em input/textarea
          const target = e.target as HTMLElement;
          if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
          ) {
            continue;
          }

          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export function useGlobalShortcuts(onOpenShortcuts: () => void) {
  const navigate = useNavigate();
  const location = useLocation();

  const shortcuts: ShortcutConfig[] = [
    {
      key: '?',
      description: 'Exibir atalhos',
      action: onOpenShortcuts,
      global: true,
    },
    {
      key: '/',
      description: 'Busca global',
      action: () => {
        // TODO: Implementar busca global
        console.log('Busca global');
      },
      global: true,
    },
  ];

  // Atalhos com 'g' prefix
  useEffect(() => {
    let gPressed = false;
    let gTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key.toLowerCase() === 'g') {
        if (gPressed) {
          clearTimeout(gTimeout);
          gPressed = false;
        } else {
          e.preventDefault();
          gPressed = true;
          gTimeout = setTimeout(() => {
            gPressed = false;
          }, 1000);
        }
      } else if (gPressed) {
        e.preventDefault();
        gPressed = false;
        clearTimeout(gTimeout);

        switch (e.key.toLowerCase()) {
          case 'p':
            navigate('/projects');
            break;
          case 'c':
            navigate('/chat');
            break;
          case 'n':
            navigate('/notifications');
            break;
          case 'b':
            // Volta para o último board visitado
            const match = location.pathname.match(/\/projects\/([^/]+)/);
            if (match) {
              navigate(`/projects/${match[1]}/board`);
            }
            break;
          case 's':
            // Vai para settings do projeto atual
            const settingsMatch = location.pathname.match(/\/projects\/([^/]+)/);
            if (settingsMatch) {
              navigate(`/projects/${settingsMatch[1]}/settings`);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(gTimeout);
    };
  }, [navigate, location]);

  useKeyboardShortcuts(shortcuts);
}
