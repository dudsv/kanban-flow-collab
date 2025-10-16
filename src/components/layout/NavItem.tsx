import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
}

export function NavItem({ href, icon: Icon, children }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <Link
      to={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-smooth',
        isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{children}</span>
    </Link>
  );
}