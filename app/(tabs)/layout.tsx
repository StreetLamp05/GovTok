import type { ReactNode } from "react";
import TabBar from "./TabBar";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-16">
      {children}
      <TabBar />
    </div>
  );
}
