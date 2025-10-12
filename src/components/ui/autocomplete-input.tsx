import * as React from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'autoCapitalize'> {
  suggestions: string[];
  onValueSelect?: (value: string) => void;
  enableAutoCapitalize?: boolean;
}

export const AutocompleteInput = React.forwardRef<HTMLInputElement, AutocompleteInputProps>(
  ({ suggestions, onValueSelect, enableAutoCapitalize = true, className, onChange, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState(props.value as string || "");
    const [filteredSuggestions, setFilteredSuggestions] = React.useState<string[]>([]);

    React.useEffect(() => {
      if (value && value.length > 0) {
        const filtered = suggestions.filter((s) =>
          s.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredSuggestions(filtered);
        setOpen(filtered.length > 0);
      } else {
        setFilteredSuggestions([]);
        setOpen(false);
      }
    }, [value, suggestions]);

    const capitalizeFirstLetter = (text: string) => {
      if (!enableAutoCapitalize) return text;
      return text.charAt(0).toUpperCase() + text.slice(1);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;
      if (enableAutoCapitalize && newValue.length === 1) {
        newValue = capitalizeFirstLetter(newValue);
      }
      setValue(newValue);
      if (onChange) onChange(e);
    };

    const handleSelect = (selectedValue: string) => {
      setValue(selectedValue);
      setOpen(false);
      if (onValueSelect) onValueSelect(selectedValue);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Input
            ref={ref}
            className={className}
            value={value}
            onChange={handleInputChange}
            {...props}
          />
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-popover" align="start" sideOffset={4}>
          <Command className="bg-popover">
            <CommandList>
              {filteredSuggestions.length === 0 ? (
                <CommandEmpty>No suggestions found</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredSuggestions.map((suggestion, index) => (
                    <CommandItem
                      key={index}
                      value={suggestion}
                      onSelect={() => handleSelect(suggestion)}
                      className="cursor-pointer"
                    >
                      {suggestion}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

AutocompleteInput.displayName = "AutocompleteInput";
