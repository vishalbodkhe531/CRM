import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HelpSearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

/**
 * The filter button that used to sit here had no handler and no props to
 * receive one — there are no categories to filter by. Replaced with a clear
 * control, which is the action a search field actually needs.
 */
const HelpSearchBar = ({ searchQuery, onSearchChange }: HelpSearchBarProps) => {
  return (
    <div className="mb-8 flex gap-3">
      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search questions and answers..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-10 h-11"
        />
      </div>
      {searchQuery && (
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11"
          aria-label="Clear search"
          onClick={() => onSearchChange("")}
        >
          <X className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default HelpSearchBar;
