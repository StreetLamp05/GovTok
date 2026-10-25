"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// Placeholder home page (US1): proves the Convex round trip. US6 replaces it with the feed.
export default function Home() {
  const row = useQuery(api.placeholder.get);
  const bump = useMutation(api.placeholder.bump);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">GovTok</h1>
      <p className="text-gray-600">
        {row === undefined ? "Loading…" : row === null ? "No value yet." : `Live count: ${row.count}`}
      </p>
      <button
        onClick={() => bump()}
        className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white"
      >
        Bump
      </button>
    </main>
  );
}
