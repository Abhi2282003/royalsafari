import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}

export function MultiSelect({
  values,
  onValuesChange,
  placeholder = "Type and press Enter...",
  suggestions = [],
}: MultiSelectProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !values.includes(s)
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!values.includes(inputValue.trim())) {
        onValuesChange([...values, inputValue.trim()]);
      }
      setInputValue("");
      setShowSuggestions(false);
    }
  };

  const removeValue = (valueToRemove: string) => {
    onValuesChange(values.filter((v) => v !== valueToRemove));
  };

  const addSuggestion = (suggestion: string) => {
    if (!values.includes(suggestion)) {
      onValuesChange([...values, suggestion]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background">
        {values.map((value) => (
          <Badge
            key={value}
            variant="secondary"
            className="px-2 py-1 text-sm"
          >
            {value}
            <button
              type="button"
              onClick={() => removeValue(value)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(e.target.value.length > 0);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(inputValue.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={values.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
          {filteredSuggestions.map((suggestion) => (
            <div
              key={suggestion}
              onClick={() => addSuggestion(suggestion)}
              className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm"
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
