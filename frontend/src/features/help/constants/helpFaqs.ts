import type { UserRole } from "@/constants/roles";

/**
 * Help content.
 *
 * Written against what the screens actually say — an FAQ that names a button
 * which does not exist is worse than no FAQ, because it sends the reader
 * looking for something they will not find.
 */
export interface HelpFaqItem {
  question: string;
  answer: string;
}

export type HelpRole = UserRole;

export const roleFaqs: Record<HelpRole, HelpFaqItem[]> = {
  SUPER_ADMIN: [
    {
      question: "How do I create a new organization?",
      answer:
        "Open Organizations in the sidebar and click '+ Add Organization'. The form creates the organization and its first admin user together — you set that admin's name, email and password on the same screen, so there is no separate step afterwards. A user sequence and a subscription are created at the same time.",
    },
    {
      question: "What is the difference between suspending and archiving an organization?",
      answer:
        "Suspending blocks every user in that organization from logging in or calling the API, immediately, but leaves it in your Organizations list. Archiving is the stronger action: it also marks the organization deleted, hides it from the default list, and forces its status to suspended. Both are reversible and both are recorded in the audit log. Archiving keeps the slug and prefix reserved, so nobody can take them afterwards.",
    },
    {
      question: "Why do I have to open an organization before I can see its users or leads?",
      answer:
        "Tenant data is always read in the context of one organization. Opening an organization's workspace sets that context; leaving it clears it again. Without a selected organization the server refuses tenant endpoints outright, which is what stops one request from returning several customers' records at once.",
    },
    {
      question: "What is the difference between a plan's 'code' and its 'slug'?",
      answer:
        "'Code' is the stable machine key used by the application, seed scripts and audit rows — never rename it on an existing plan; create a new plan instead. 'Slug' is the URL-friendly identifier used in pricing pages and deep links. Both must be unique.",
    },
    {
      question: "What do 'Assignable' and 'Offered to customers' do on a plan?",
      answer:
        "'Assignable' off retires the plan: it cannot be put on any new subscription, but organizations already on it stay on it and keep their terms. 'Offered to customers' off hides the plan from customer-facing and self-serve menus while leaving you able to assign it by hand — that is how you run a private or negotiated plan.",
    },
    {
      question: "Why does a subscription show a different status from the one I set?",
      answer:
        "The list shows the effective status, which is resolved against the clock. A subscription still marked active whose period ended reads as expired, and one set to cancel at period end reads as active until that date passes. The stored value has not changed; the effective one is what actually governs access.",
    },
    {
      question: "Who can see the audit log, and what is recorded?",
      answer:
        "You see every entry across the platform. An organization admin sees only their own organization's entries, and platform-level actions — creating, archiving or restoring organizations, plan catalogue edits, platform settings changes — are hidden from them entirely. Passwords, tokens and secrets are stripped before an entry is written. The log is append-only: nothing in the application can edit or delete an entry.",
    },
    {
      question: "Why don't I see every platform announcement in my notification bell?",
      answer:
        "The bell is a reader's feed, not an authoring view. Announcements you publish are managed from Announcements in the sidebar, which is the complete platform list with its filters and statuses.",
    },
    {
      question: "Why can't I change who a published announcement goes to?",
      answer:
        "Once an announcement is published or scheduled its audience is fixed, because some recipients may already have seen it and changing the audience would make read receipts meaningless. Archive it and create a new one instead.",
    },
    {
      question: "Where do I change platform-wide settings?",
      answer:
        "Platform Settings in the sidebar. It holds the product name, the support contacts shown on this page, how long audit history is kept, and the plan new organizations start on. These apply across every organization — the Subscription & Billing page under your profile menu is for a single organization's own preferences, which is why you do not see it.",
    },
  ],
  ADMIN: [
    {
      question: "How do I reset a user's password?",
      answer:
        "Open Users, click the actions menu on the row, and choose 'Reset Password'. A temporary password is generated and shown to you once — it is never written to the audit log, so copy it before closing the dialog.",
    },
    {
      question: "How do I add new items to the system?",
      answer:
        "Go to Items and click '+ Add Item', then enter the name, code, type and price.",
    },
    {
      question: "Why has the system stopped letting me make changes?",
      answer:
        "Your subscription has most likely lapsed. Reading stays available so you can still see your data, but changes are blocked until it is renewed. Open Subscription & Billing from the profile menu — the banner at the top of the screen explains the exact reason.",
    },
  ],
  MANAGER: [
    {
      question: "How do I assign a lead to an Executive?",
      answer:
        "In Leads, open the lead you want to assign, click 'Edit', and pick an Executive from the assignment dropdown.",
    },
    {
      question: "Why can't I see all the users?",
      answer:
        "Managers see Executives, and only those inside their own organization.",
    },
  ],
  EXECUTIVE: [
    {
      question: "How do I update the status of my lead?",
      answer:
        "Open the lead from your dashboard and use the Status control to move it through the pipeline.",
    },
    {
      question: "What happens when a lead is marked as 'Dead'?",
      answer:
        "It leaves your active pipeline and is kept for historical reporting rather than being removed.",
    },
  ],
};

export const generalFaqs: HelpFaqItem[] = [
  {
    question: "How do I change my profile picture?",
    answer:
      "Click your name at the bottom of the sidebar, choose 'Profile', and select a new image. JPG, PNG and WebP up to 5MB are accepted.",
  },
  {
    question: "How do I switch between light and dark mode?",
    answer:
      "The theme toggle is on your Profile page. Your choice is remembered on this device.",
  },
];
