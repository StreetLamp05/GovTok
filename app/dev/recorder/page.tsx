import type { Metadata } from "next";
import RecorderLab from "./RecorderLab";

// Dev-only check (US7): records with the shared VideoRecorder, audio on or off, and shows what
// it hands back. Not linked from anywhere and not indexed; hide or remove before submission.
export const metadata: Metadata = {
  title: "Recorder check · GovTok",
  robots: { index: false, follow: false },
};

export default function RecorderPage() {
  return <RecorderLab />;
}
