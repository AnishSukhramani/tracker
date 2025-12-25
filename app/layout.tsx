import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { ErrorBoundary } from "@/components/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal Finance & Wealth Tracker",
  description: "Track your finances, analyze spending, and follow Dave Ramsey's Baby Steps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <ErrorBoundary>
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <TopBar />
                  <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    {children}
                  </main>
                </SidebarInset>
              </SidebarProvider>
            </ErrorBoundary>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
