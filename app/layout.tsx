import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AnalyticsProvider } from "@/lib/AnalyticsProvider";
import { ToastProvider } from "@/lib/ToastProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "ForgeVoice Studio Dashboard",
  description: "A comprehensive and visually rich dashboard for ForgeVoice Studio clients to track their content production pipeline, from submission to publication. Features include a Kanban board, KPI tracking, notifications, and a content calendar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-[#0B0B0B] text-white`}>
          <AnalyticsProvider>
            <ToastProvider>
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </ToastProvider>
          </AnalyticsProvider>
      </body>
    </html>
  );
}