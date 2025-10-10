import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Calendar as CalendarIcon,
  MapPin,
  Tag,
  Users,
  Clock,
  CheckCheck,
  SlidersHorizontal,
  RotateCcw,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

// Filter types and interfaces
export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'boolean';
  options?: Array<{ value: string; label: string; count?: number }>;
  placeholder?: string;
  icon?: React.ReactNode;
  defaultValue?: string | number | boolean | string[] | Date;
  validation?: (value: string | number | boolean | string[] | Date) => boolean;
}

export interface FilterState {
  [key: string]: string | number | boolean | string[] | Date | { from?: Date; to?: Date } | null | undefined;
}

export interface SearchConfig {
  placeholder?: string;
  fields: string[];
  debounceMs?: number;
  minLength?: number;
}

export interface SortConfig {
  options: Array<{
    value: string;
    label: string;
    direction?: 'asc' | 'desc';
  }>;
  defaultValue?: string;
}

// Filter system props
interface FilterSystemProps {
  filters: FilterConfig[];
  searchConfig?: SearchConfig;
  sortConfig?: SortConfig;
  onFiltersChange: (filters: FilterState) => void;
  onSearchChange?: (search: string) => void;
  onSortChange?: (sort: { field: string; direction: 'asc' | 'desc' }) => void;
  initialFilters?: FilterState;
  initialSearch?: string;
  initialSort?: { field: string; direction: 'asc' | 'desc' };
  className?: string;
  compact?: boolean;
  showActiveCount?: boolean;
}

// Search component
const SearchInput: React.FC<{
  config: SearchConfig;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}> = ({ config, value, onChange, className }) => {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebounce(localValue, config.debounceMs || 300);

  React.useEffect(() => {
    if (debouncedValue.length >= (config.minLength || 0)) {
      onChange(debouncedValue);
    } else if (debouncedValue.length === 0) {
      onChange('');
    }
  }, [debouncedValue, onChange, config.minLength]);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={config.placeholder || 'Search...'}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-10"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
          onClick={() => {
            setLocalValue('');
            onChange('');
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

// Individual filter component
interface FilterComponentProps {
  config: FilterConfig;
  value: string | number | boolean | string[] | Date | { from?: Date; to?: Date } | null | undefined;
  onChange: (value: string | number | boolean | string[] | Date | { from?: Date; to?: Date } | null) => void;
}

const FilterComponent: React.FC<FilterComponentProps> = ({ config, value, onChange }) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const renderFilter = () => {
    switch (config.type) {
      case 'text':
        return (
          <Input
            placeholder={config.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={config.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center justify-between w-full">
                    {option.label}
                    {option.count !== undefined && (
                      <Badge variant="secondary" className="ml-2">
                        {option.count}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect': {
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="truncate">
                  {selectedValues.length === 0
                    ? config.placeholder || 'Select...'
                    : `${selectedValues.length} selected`}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search options..." />
                <CommandEmpty>No options found.</CommandEmpty>
                <CommandGroup>
                  {config.options?.map((option) => (
                    <CommandItem
                      key={option.value}
                      onSelect={() => {
                        const newValue = selectedValues.includes(option.value)
                          ? selectedValues.filter(v => v !== option.value)
                          : [...selectedValues, option.value];
                        onChange(newValue);
                      }}
                    >
                      <div className="flex items-center space-x-2 w-full">
                        <Checkbox
                          checked={selectedValues.includes(option.value)}
                          onChange={() => {}}
                        />
                        <span className="flex-1">{option.label}</span>
                        {option.count !== undefined && (
                          <Badge variant="outline">{option.count}</Badge>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        );
      }

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? new Date(value).toLocaleDateString() : config.placeholder || 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => onChange(date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'daterange':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value?.from && value?.to
                  ? `${new Date(value.from).toLocaleDateString()} - ${new Date(value.to).toLocaleDateString()}`
                  : config.placeholder || 'Select date range'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="range"
                defaultMonth={value?.from ? new Date(value.from) : new Date()}
                selected={value}
                onSelect={onChange}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={config.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value || false}
              onCheckedChange={onChange}
              id={config.key}
            />
            <Label htmlFor={config.key}>{config.placeholder || 'Enable'}</Label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        {config.icon}
        {config.label}
      </Label>
      {renderFilter()}
    </div>
  );
};

// Active filters display
const ActiveFilters: React.FC<{
  filters: FilterConfig[];
  activeFilters: FilterState;
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
}> = ({ filters, activeFilters, onRemoveFilter, onClearAll }) => {
  const activeFilterEntries = Object.entries(activeFilters).filter(([_, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
    return value !== null && value !== undefined && value !== '';
  });

  if (activeFilterEntries.length === 0) return null;

  const getFilterLabel = (key: string, value: string | number | boolean | string[] | Date | { from?: Date; to?: Date }) => {
    const config = filters.find(f => f.key === key);
    if (!config) return `${key}: ${value}`;

    if (config.type === 'multiselect' && Array.isArray(value)) {
      const labels = value.map(v => 
        config.options?.find(opt => opt.value === v)?.label || v
      );
      return `${config.label}: ${labels.join(', ')}`;
    }

    if (config.type === 'select') {
      const option = config.options?.find(opt => opt.value === value);
      return `${config.label}: ${option?.label || value}`;
    }

    if (config.type === 'daterange' && value?.from && value?.to) {
      return `${config.label}: ${new Date(value.from).toLocaleDateString()} - ${new Date(value.to).toLocaleDateString()}`;
    }

    if (config.type === 'date' && value) {
      return `${config.label}: ${new Date(value).toLocaleDateString()}`;
    }

    return `${config.label}: ${value}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
      {activeFilterEntries.map(([key, value]) => (
        <Badge key={key} variant="secondary" className="flex items-center gap-1">
          {getFilterLabel(key, value)}
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={() => onRemoveFilter(key)}
          >
            <X className="h-2 w-2" />
          </Button>
        </Badge>
      ))}
      {activeFilterEntries.length > 1 && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 text-xs">
          <RotateCcw className="h-3 w-3 mr-1" />
          Clear all
        </Button>
      )}
    </div>
  );
};

// Main filter system component
export const FilterSystem: React.FC<FilterSystemProps> = ({
  filters,
  searchConfig,
  sortConfig,
  onFiltersChange,
  onSearchChange,
  onSortChange,
  initialFilters = {},
  initialSearch = '',
  initialSort,
  className,
  compact = false,
  showActiveCount = true,
}) => {
  const [filterState, setFilterState] = useState<FilterState>(initialFilters);
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [sortValue, setSortValue] = useState(initialSort);
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Apply filters when state changes
  React.useEffect(() => {
    onFiltersChange(filterState);
  }, [filterState, onFiltersChange]);

  // Apply search when value changes
  React.useEffect(() => {
    onSearchChange?.(searchValue);
  }, [searchValue, onSearchChange]);

  // Apply sort when value changes
  React.useEffect(() => {
    if (sortValue) {
      onSortChange?.(sortValue);
    }
  }, [sortValue, onSortChange]);

  const updateFilter = useCallback((key: string, value: string | number | boolean | string[] | Date | { from?: Date; to?: Date } | null) => {
    setFilterState(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const removeFilter = useCallback((key: string) => {
    setFilterState(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterState({});
    setSearchValue('');
  }, []);

  const activeFilterCount = useMemo(() => {
    return Object.entries(filterState).filter(([_, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
      return value !== null && value !== undefined && value !== '';
    }).length + (searchValue.trim() ? 1 : 0);
  }, [filterState, searchValue]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters & Search
            {showActiveCount && activeFilterCount > 0 && (
              <Badge variant="default" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {isExpanded ? 'Hide' : 'Show'} Filters
              </Button>
            )}
            
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={cn('space-y-4', !isExpanded && 'hidden')}>
        {/* Search */}
        {searchConfig && (
          <div>
            <SearchInput
              config={searchConfig}
              value={searchValue}
              onChange={setSearchValue}
            />
          </div>
        )}

        {/* Sort */}
        {sortConfig && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <CheckCheck className="h-4 w-4" />
              Sort by
            </Label>
            <Select
              value={sortValue ? `${sortValue.field}-${sortValue.direction}` : ''}
              onValueChange={(value) => {
                const [field, direction] = value.split('-');
                setSortValue({ field, direction: direction as 'asc' | 'desc' });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose sort option..." />
              </SelectTrigger>
              <SelectContent>
                {sortConfig.options.map((option) => (
                  <SelectItem 
                    key={`${option.value}-${option.direction || 'asc'}`}
                    value={`${option.value}-${option.direction || 'asc'}`}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {searchConfig && sortConfig && <Separator />}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filters.map((filter) => (
            <FilterComponent
              key={filter.key}
              config={filter}
              value={filterState[filter.key]}
              onChange={(value) => updateFilter(filter.key, value)}
            />
          ))}
        </div>

        {/* Active Filters */}
        <ActiveFilters
          filters={filters}
          activeFilters={filterState}
          onRemoveFilter={removeFilter}
          onClearAll={clearAllFilters}
        />
      </CardContent>
    </Card>
  );
};

// Preset filter configurations for different entities
export const churchFilters: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'multiselect',
    icon: <Tag className="h-4 w-4" />,
    options: [
      { value: 'approved', label: 'Approved', count: 45 },
      { value: 'pending', label: 'Pending Review', count: 23 },
      { value: 'heritage_review', label: 'Heritage Review', count: 12 },
      { value: 'needs_revision', label: 'Needs Revision', count: 6 },
    ],
    placeholder: 'Select statuses...',
  },
  {
    key: 'diocese',
    label: 'Diocese',
    type: 'select',
    icon: <MapPin className="h-4 w-4" />,
    options: [
      { value: 'tagbilaran', label: 'Tagbilaran' },
      { value: 'talibon', label: 'Talibon' },
    ],
    placeholder: 'Select diocese...',
  },
  {
    key: 'municipality',
    label: 'Municipality',
    type: 'text',
    icon: <MapPin className="h-4 w-4" />,
    placeholder: 'Enter municipality...',
  },
  {
    key: 'heritageClassification',
    label: 'Heritage Classification',
    type: 'multiselect',
    icon: <Star className="h-4 w-4" />,
    options: [
      { value: 'ICP', label: 'Important Cultural Property', count: 12 },
      { value: 'NCT', label: 'National Cultural Treasure', count: 3 },
      { value: 'none', label: 'Not Classified', count: 71 },
    ],
    placeholder: 'Select classifications...',
  },
  {
    key: 'yearBuilt',
    label: 'Year Built (From)',
    type: 'number',
    icon: <Calendar className="h-4 w-4" />,
    placeholder: 'e.g., 1800',
  },
  {
    key: 'lastUpdated',
    label: 'Last Updated',
    type: 'daterange',
    icon: <Clock className="h-4 w-4" />,
    placeholder: 'Select date range...',
  },
];

export const announcementFilters: FilterConfig[] = [
  {
    key: 'scope',
    label: 'Scope',
    type: 'select',
    icon: <Users className="h-4 w-4" />,
    options: [
      { value: 'diocese', label: 'Diocese Wide' },
      { value: 'parish', label: 'Parish Specific' },
      { value: 'all', label: 'All Churches' },
    ],
    placeholder: 'Select scope...',
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'multiselect',
    icon: <Tag className="h-4 w-4" />,
    options: [
      { value: 'urgent', label: 'Urgent', count: 3 },
      { value: 'high', label: 'High', count: 8 },
      { value: 'normal', label: 'Normal', count: 25 },
      { value: 'low', label: 'Low', count: 12 },
    ],
    placeholder: 'Select priorities...',
  },
  {
    key: 'publishedDate',
    label: 'Published Date',
    type: 'daterange',
    icon: <CalendarIcon className="h-4 w-4" />,
    placeholder: 'Select date range...',
  },
  {
    key: 'isActive',
    label: 'Active Only',
    type: 'boolean',
    placeholder: 'Show active announcements only',
  },
];

export default FilterSystem;
