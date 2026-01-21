/**
 * Combobox Component with Search
 * Searchable dropdown with keyboard navigation
 */

'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
  category?: string; // For grouping options
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  /**
   * If true, the combobox will allow free text input and call onValueChange
   * with the raw typed text as the user types. Useful for inputs that accept
   * both selecting an option and arbitrary text (e.g. zipcode).
   */
  allowFreeInput?: boolean;
  /**
   * Optional callback to provide dynamic search results based on search value.
   * Useful for zipcode search where we need to query thai-address-database.
   */
  onSearch?: (search: string) => ComboboxOption[];
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  className,
  allowFreeInput = false,
  onSearch,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options;
    
    // If onSearch callback provided, use it for dynamic search
    if (onSearch) {
      const dynamicResults = onSearch(searchValue);
      if (dynamicResults.length > 0) return dynamicResults;
    }
    
    const search = searchValue.toLowerCase();
    return options.filter((option) => {
      // Search in label
      if (option.label.toLowerCase().includes(search)) return true;
      
      // Search in keywords
      if (option.keywords?.some(k => {
        const keyword = k.toLowerCase();
        
        // For zipcode (1-2 digits only)
        if (/^\d{1,2}$/.test(search)) {
          return search.startsWith(keyword);
        }
        
        // For text search (3+ chars or any non-digit)
        return keyword.includes(search);
      })) return true;
      
      return false;
    });
  }, [options, searchValue, onSearch]);

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        className={cn('w-full pr-8', className)}
        value={searchValue || (selectedOption ? selectedOption.label : '')}
        onChange={(e) => {
          const v = e.target.value;
          setSearchValue(v);
          if (!open) setOpen(true);
          
          // Clear selection if user clears the input
          if (v === '' && !allowFreeInput) {
            onValueChange?.('');
          }
          
          if (allowFreeInput) {
            onValueChange?.(v);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay to allow click on dropdown items
          setTimeout(() => setOpen(false), 200);
        }}
        placeholder={placeholder}
      />
      <ChevronsUpDown 
        className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none"
      />
      
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border shadow-lg rounded-md">
          <Command shouldFilter={false} className="bg-white">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              <div className="max-h-[300px] overflow-auto p-1">
                {(() => {
                  // Group options by category
                  const grouped = new Map<string, ComboboxOption[]>();
                  filteredOptions.forEach(option => {
                    const cat = option.category || 'อื่นๆ';
                    if (!grouped.has(cat)) {
                      grouped.set(cat, []);
                    }
                    grouped.get(cat)!.push(option);
                  });

                  return Array.from(grouped.entries()).map(([category, options]) => (
                    <div key={category} className="mb-2">
                      {/* Category Header */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 rounded-sm mb-1">
                        {category}
                      </div>
                      {/* Options in this category */}
                      {options.map((option) => (
                        <div
                          key={option.value}
                          className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                          onClick={() => {
                            onValueChange?.(option.value);
                            setOpen(false);
                            setSearchValue('');
                            setTimeout(() => inputRef.current?.blur(), 0);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4 shrink-0',
                              value === option.value ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm truncate">{option.label}</span>
                            {option.description && (
                              <span className="text-xs text-muted-foreground truncate">
                                {option.description}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}
          </Command>
        </div>
      )}
    </div>
  );
}
