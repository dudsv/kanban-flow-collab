import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NotificationFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function NotificationFilters({
  activeFilter,
  onFilterChange,
}: NotificationFiltersProps) {
  return (
    <Tabs value={activeFilter} onValueChange={onFilterChange}>
      <TabsList>
        <TabsTrigger value="all">Todas</TabsTrigger>
        <TabsTrigger value="unread">Não lidas</TabsTrigger>
        <TabsTrigger value="mention">Menções</TabsTrigger>
        <TabsTrigger value="assigned">Atribuições</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
