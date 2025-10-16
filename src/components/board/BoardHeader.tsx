import { Search, Tag, Users, Flag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Database } from '@/integrations/supabase/types';

type Tag = Database['public']['Tables']['tags']['Row'];

interface BoardHeaderProps {
  projectId: string;
  tags: Tag[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedPriorities: string[];
  onPrioritiesChange: (priorities: string[]) => void;
  selectedAssignees: string[];
  onAssigneesChange: (assignees: string[]) => void;
}

export function BoardHeader({
  searchQuery,
  onSearchChange,
  tags,
  selectedTags,
  onTagsChange,
  selectedPriorities,
  onPrioritiesChange,
  selectedAssignees,
  onAssigneesChange
}: BoardHeaderProps) {
  const priorities = ['low', 'medium', 'high', 'critical'];

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cards..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tags Filter */}
        <Select
          value={selectedTags[0] || ''}
          onValueChange={(value) => {
            if (value === 'all') {
              onTagsChange([]);
            } else {
              onTagsChange([value]);
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <Tag className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Todas as tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tags</SelectItem>
            {tags.map(tag => (
              <SelectItem key={tag.id} value={tag.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value={selectedPriorities[0] || ''}
          onValueChange={(value) => {
            if (value === 'all') {
              onPrioritiesChange([]);
            } else {
              onPrioritiesChange([value]);
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <Flag className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Todas prioridades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            {priorities.map(priority => (
              <SelectItem key={priority} value={priority}>
                {priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active Filters */}
        <div className="flex gap-2 flex-wrap ml-auto">
          {selectedTags.length > 0 && (
            <Badge variant="secondary">
              {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''}
            </Badge>
          )}
          {selectedPriorities.length > 0 && (
            <Badge variant="secondary">
              {selectedPriorities.length} prioridade{selectedPriorities.length > 1 ? 's' : ''}
            </Badge>
          )}
          {(selectedTags.length > 0 || selectedPriorities.length > 0 || selectedAssignees.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onTagsChange([]);
                onPrioritiesChange([]);
                onAssigneesChange([]);
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}