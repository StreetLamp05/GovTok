"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useResidentToken } from "@/lib/hooks/useResidentToken";

// "Checking…" (§4.2.1): the poster waits here, subscribed to their report, until screening
// moves it out of pending. Simple open / held states only; the verdict screens are US14.
export default function CheckingScreen({
  reportId,
  onPostAnother,
}: {
  reportId: Id<"reports">;
  onPostAnother: () => void;
}) {
  const token = useResidentToken();
  const report = useQuery(api.posts.myReport, token ? { token, reportId } : "skip");

  if (report === null) {
    return (
      <Screen title="We couldn't find this post" onPostAnother={onPostAnother}>
        <p className="text-[#4A5A6E]">It may have been removed.</p>
      </Screen>
    );
  }

  if (report === undefined || report.status === "pending") {
    return (
      <main className="flex flex-col items-center gap-4 p-6 pt-16 text-center" aria-busy="true">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#C9D3DE] border-t-[#157A47]" />
        <h1 className="text-2xl font-extrabold">Checking…</h1>
        <p className="text-[#4A5A6E]">We&apos;re checking your post before it goes live. This takes a few seconds.</p>
      </main>
    );
  }

  if (report.status === "held") {
    return (
      <Screen title="We held this post" onPostAnother={onPostAnother}>
        <p className="text-[#4A5A6E]">{report.reason ?? "It didn't pass our check, so it isn't public."}</p>
      </Screen>
    );
  }

  return (
    <Screen title="Your post is live" onPostAnother={onPostAnother}>
      {report.title && (
        <p className="text-[#4A5A6E]">
          {report.title}
          {report.agency && ` · ${report.agency}`}
        </p>
      )}
      <Link
        href={`/?report=${report._id}`}
        className="rounded-lg bg-[#157A47] px-4 py-3 font-semibold text-white"
      >
        See it in the feed
      </Link>
    </Screen>
  );
}

function Screen({
  title,
  onPostAnother,
  children,
}: {
  title: string;
  onPostAnother: () => void;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-col items-center gap-4 p-6 pt-16 text-center">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      {children}
      <button onClick={onPostAnother} className="rounded-lg border px-4 py-3 font-semibold">
        Post another
      </button>
    </main>
  );
}
