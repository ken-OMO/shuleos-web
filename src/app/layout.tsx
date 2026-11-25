import type { Metadata } from "next";
import { AppProvider } from "@/providers/app-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME ?? "ShuleOS",
    template: `%s · ${process.env.NEXT_PUBLIC_APP_NAME ?? "ShuleOS"}`,
  },
  description:
    "The Intelligent School Operating System. Less paperwork. More teaching. Better learning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <div aria-hidden="true" className="kenyan-flag-ribbon" />
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
