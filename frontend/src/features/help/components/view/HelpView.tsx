import { useMemo, useState } from "react";
import HelpActionCards from "../shared/HelpActionCards";
import HelpFaqSection from "../shared/HelpFaqSection";
import HelpHeader from "../shared/HelpHeader";
import HelpSearchBar from "../filters/HelpSearchBar";
import HelpSupportContacts from "../shared/HelpSupportContacts";
import { generalFaqs, roleFaqs, type HelpRole } from "../../constants/helpFaqs";
import { useAppSelector } from "@/hooks/useRedux";

const HelpView = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const { user } = useAppSelector((state) => state.auth);
  const role: HelpRole = (user?.role as HelpRole) ?? "EXECUTIVE";

  const currentFaqs = useMemo(() => {
    return [...(roleFaqs[role] || roleFaqs.EXECUTIVE), ...generalFaqs];
  }, [role]);

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return currentFaqs;
    }
    // Answers are searched too: people look for the term they saw on screen
    // ("assignable", "archive", "slug"), which lives in the answer far more
    // often than in the question.
    return currentFaqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query),
    );
  }, [currentFaqs, searchQuery]);

  const toggleFaq = (index: number) => {
    setExpandedIndex((previous) => (previous === index ? null : index));
  };

  // Collapse on a new search: the open index refers to the previous result
  // list, so keeping it would expand an unrelated entry.
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setExpandedIndex(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <HelpHeader />
      <HelpSearchBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />
      <HelpActionCards />
      <HelpFaqSection
        roleLabel={role.replace("_", " ").toUpperCase()}
        faqs={filteredFaqs}
        expandedIndex={expandedIndex}
        onToggle={toggleFaq}
      />
      <HelpSupportContacts />
    </div>
  );
};

export default HelpView;
