import React from "react";
import { DM_Sans } from "next/font/google";
const dm = DM_Sans({ subsets: ["latin"] });
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className={dm.className}>{children}</div>;
}
