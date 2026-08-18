import { Suspense } from "react";
import { useAuthBootstrap } from "@/features/auth";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import AppRoutes from "@/components/routing/AppRoutes";
import { TooltipProvider } from "@/components/ui/tooltip";

import LoadingState from "@/components/common/LoadingState";

const RouteFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <LoadingState message="Loading application..." />
  </div>
);

const App = () => {
  useAuthBootstrap();

  return (
    <TooltipProvider>
      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <AppRoutes />
        </Suspense>
      </ErrorBoundary>

      <Toaster position="top-right" />
    </TooltipProvider>
  );
};

export default App;
