import type { Metadata } from "next";
import CameraPreview from "./CameraPreview";

// Dev-only check (US4): proves the HTTPS deploy can open the rear camera on a phone.
// Not linked from anywhere and not indexed; hide or remove before submission.
export const metadata: Metadata = {
  title: "Camera check · GovTok",
  robots: { index: false, follow: false },
};

export default function CameraPage() {
  return <CameraPreview />;
}
