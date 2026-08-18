import { Provider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { store } from "@/app/store";
import { queryClient } from "@/app/queryClient";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}