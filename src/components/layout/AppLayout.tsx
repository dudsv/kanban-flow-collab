import { ReactNode, useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { ShortcutsDialog } from '@/components/shortcuts/ShortcutsDialog';
import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts';
import { NavItem } from './NavItem';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Home, 
  Users, 
  LogOut, 
  Moon, 
  Sun, 
  Folder, 
  MessageSquare, 
  Bell,
  LayoutDashboard,
  Paperclip,
  Settings
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { id: projectId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  
  useGlobalShortcuts(() => setShortcutsOpen(true));

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Detectar se estamos em contexto de projeto
  const currentProjectId = projectId || (location.pathname.match(/^\/projects\/([^/]+)/))?.[1];

  return (
    <div className="flex min-h-screen w-full bg-gradient-subtle">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-background/80 backdrop-blur-lg flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              KanFlow
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Links globais */}
          <div className="space-y-1">
            <NavItem href="/projects" icon={Folder}>Projetos</NavItem>
            <NavItem href="/people" icon={Users}>Pessoas</NavItem>
            <NavItem href="/chat" icon={MessageSquare}>Chat</NavItem>
            <NavItem href="/notifications" icon={Bell}>Notificações</NavItem>
          </div>

          {/* Links do projeto atual */}
          {currentProjectId && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Projeto Atual
                </div>
                <div className="space-y-1">
                  <NavItem href={`/projects/${currentProjectId}/board`} icon={LayoutDashboard}>
                    Board
                  </NavItem>
                  <NavItem href={`/projects/${currentProjectId}/files`} icon={Paperclip}>
                    Arquivos
                  </NavItem>
                  <NavItem href={`/projects/${currentProjectId}/settings`} icon={Settings}>
                    Configurações
                  </NavItem>
                </div>
              </div>
            </>
          )}
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="text-lg font-semibold">
              {/* Breadcrumb ou título da página pode ir aqui */}
            </div>

            <div className="flex items-center gap-4">
              <NotificationBadge />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShortcutsOpen(true)}
                className="transition-smooth"
                title="Atalhos (?)"
              >
                <span className="text-lg font-bold">?</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="transition-smooth"
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        {user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {user?.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}