import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SoundProvider } from "@/lib/hooks/sound";
import ConvexClientProvider from "./ConvexClientProvider";
import DemoBanner from "./DemoBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "GovTok",
  description: "See what your city fixes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F4F6F8] font-sans text-[#0F1E33] antialiased">
        <ConvexClientProvider>
          <SoundProvider>
            <DemoBanner />
            {children}
          </SoundProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
