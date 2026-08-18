import React from "react";
import welcomeImage from "@/assets/images/welcome_image.svg";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL — light green bg + illustration ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-light flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* CRM brand top-left */}
        <div className="absolute top-8 left-8 flex items-center gap-2">
          <span className="font-bold text-lg text-foreground">CRM</span>
        </div>

        {/* Illustration */}
        <img
          src={welcomeImage}
          alt="Welcome illustration"
          className="w-full max-w-sm object-contain drop-shadow-md"
        />

        {/* Tagline below image */}
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-foreground">Welcome!</h2>
          <p className="mt-2 text-muted-foreground text-sm max-w-xs mx-auto">
            Manage your leads, customers, and reports — all in one place.
          </p>
        </div>

        {/* Bottom footer */}
        <p className="absolute bottom-6 text-muted-foreground text-xs">
          © {new Date().getFullYear()} Emvesso Solutions. All rights reserved.
        </p>
      </div>

      {/* ── RIGHT PANEL — white form container ── */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-primary-light p-6 sm:p-12">
        <div className="w-full max-w-lg">
          {/* Mobile logo (only on small screens) */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-primary rounded-2xl flex items-center justify-center">
              <span className="text-primary-foreground font-extrabold text-sm">CRM</span>
            </div>
            <span className="font-bold text-lg text-foreground">CRM</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
