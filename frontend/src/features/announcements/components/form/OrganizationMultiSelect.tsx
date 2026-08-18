import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/useDebounce";
import { useOrganizations } from "@/features/organizations";

interface OrganizationMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/**
 * Searchable organization picker for announcement targeting.
 *
 * The previous picker loaded a fixed first-100 with no search, so an org past
 * that cap was unreachable. This searches the server (debounced) so any org is
 * selectable. Selection state lives in the caller's `value`, so a checked org
 * stays selected even after it scrolls out of the current results.
 */
const SEARCH_MIN_LENGTH = 2;
const RESULT_LIMIT = 50;

const OrganizationMultiSelect = ({
  value,
  onChange,
  disabled = false,
}: OrganizationMultiSelectProps) => {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 400);

  const { data, isLoading } = useOrganizations({
    search: debounced.length >= SEARCH_MIN_LENGTH ? debounced : undefined,
    limit: RESULT_LIMIT,
  });
  const results = data?.data ?? [];

  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...value, id] : value.filter((v) => v !== id));
  };

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search organizations by name..."
        disabled={disabled}
      />

      {value.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {value.length} organization{value.length === 1 ? "" : "s"} selected
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-primary hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Searching…</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {debounced.length >= SEARCH_MIN_LENGTH
              ? "No organizations match your search."
              : "Type to search organizations."}
          </p>
        ) : (
          results.map((org) => {
            const checked = value.includes(org.id);
            return (
              <div key={org.id} className="flex items-center gap-2">
                <Checkbox
                  id={`org-${org.id}`}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(next) => toggle(org.id, Boolean(next))}
                />
                <Label htmlFor={`org-${org.id}`} className="cursor-pointer">
                  {org.name}
                </Label>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrganizationMultiSelect;
