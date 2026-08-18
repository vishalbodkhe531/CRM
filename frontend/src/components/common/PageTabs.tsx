import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utils/cn";

/**
 * Underline page tabs.
 *
 * The single tab style used for in-page sections (organization workspace,
 * settings, billing console). Extracted so the classes live in ONE place —
 * they were previously copied inline, which is how two screens end up with
 * subtly different tabs nobody notices until they sit side by side.
 *
 * Works in two modes:
 *   - route tabs: pass `getHref`, and each trigger renders a <Link>
 *   - state tabs: pass `onValueChange`, and each trigger is a button
 */

export interface PageTab {
  value: string;
  label: string;
}

interface PageTabsProps {
  tabs: readonly PageTab[];
  value: string;
  /** Route mode. Takes precedence over onValueChange when supplied. */
  getHref?: (value: string) => string;
  /** State mode. */
  onValueChange?: (value: string) => void;
  className?: string;
}

const TRIGGER_CLASS = `
  h-10 rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-semibold
  text-muted-foreground shadow-none hover:text-foreground
  data-[state=active]:border-primary data-[state=active]:bg-transparent
  data-[state=active]:text-foreground data-[state=active]:shadow-none
`;

const PageTabs = ({
  tabs,
  value,
  getHref,
  onValueChange,
  className,
}: PageTabsProps) => {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      {/* Negative margin + padding keeps the focus ring visible while scrolling. */}
      <div className="-mx-1 overflow-x-auto px-1">
        <TabsList className="h-auto w-max justify-start gap-1 rounded-none border-b border-border bg-transparent p-0 text-muted-foreground">
          {tabs.map((tab) =>
            getHref ? (
              <TabsTrigger
                asChild
                key={tab.value}
                value={tab.value}
                className={cn(TRIGGER_CLASS)}
              >
                <Link to={getHref(tab.value)}>{tab.label}</Link>
              </TabsTrigger>
            ) : (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(TRIGGER_CLASS)}
              >
                {tab.label}
              </TabsTrigger>
            ),
          )}
        </TabsList>
      </div>
    </Tabs>
  );
};

export default PageTabs;
