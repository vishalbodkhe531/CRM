import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import LoadingState from "@/components/common/LoadingState";
import { AnnouncementBanner } from "@/features/announcements";
import { SubscriptionBanner } from "@/features/billing";
import MobileHeader from "./MobileHeader";

const DashboardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  return (
    <div
      className="h-screen flex bg-background  overflow-hidden font-inter"
      style={{ height: "100dvh" }}
    >
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isDesktopOpen={isDesktopSidebarOpen}
        onDesktopToggle={() => setIsDesktopSidebarOpen((isOpen) => !isOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
        {/*
          Outside <main> so both survive route changes. Billing sits above
          announcements: a lapsed subscription blocks the user's work, and an
          announcement never does.
        */}
        <SubscriptionBanner />
        <AnnouncementBanner />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 lg:p-6">
          <div className="mx-auto w-full max-w-screen-2xl">
            {/*
              Suspense lives inside the layout so loading a lazy page chunk only
              swaps the content area — the sidebar stays mounted (no white flash
              on navigation). The app-level Suspense in App.tsx still covers the
              initial layout load and non-layout routes.
            */}
            <Suspense fallback={<LoadingState message="Loading..." />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
