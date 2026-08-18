import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { HelpFaqItem } from "../../constants/helpFaqs";

interface HelpFaqSectionProps {
  roleLabel: string;
  faqs: HelpFaqItem[];
  expandedIndex: number | null;
  onToggle: (index: number) => void;
}

const HelpFaqSection = ({
  roleLabel,
  faqs,
  expandedIndex,
  onToggle,
}: HelpFaqSectionProps) => {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Frequently Asked Questions - {roleLabel}
      </h2>
      <Card className="border-border">
        <CardContent className="p-0 flex flex-col divide-y divide-border">
          {faqs.length > 0 ? (
            faqs.map((faq, index) => {
              const isExpanded = expandedIndex === index;
              const panelId = `faq-panel-${index}`;

              return (
                <div key={`${faq.question}-${index}`} className="flex flex-col">
                  {/*
                    A button, not a div: the row is interactive, so it has to be
                    reachable by keyboard and announced as expandable. aria-expanded
                    is what tells a screen reader the answer below is this row's.
                  */}
                  <button
                    type="button"
                    onClick={() => onToggle(index)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {faq.question}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {isExpanded && (
                    <div
                      id={panelId}
                      className="p-4 pt-0 text-sm text-muted-foreground bg-muted/10 leading-relaxed"
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-6 text-sm text-center text-muted-foreground">
              No FAQs match your search.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HelpFaqSection;
