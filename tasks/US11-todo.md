# US11: Transcribe a video's audio with Groq Whisper

- [x] Create black-frame MP4 and WebM variants containing only the audio from each provided MOV, so visual details are not sent to Groq.
- [x] Add the audio-only variants to `scripts/try-transcribe.ts`.
- [x] Run the fixture runner against the selected Convex deployment: 14/14 succeeded, each returned one segment; near-silent variants returned 10 characters.
- [x] Save the full text-and-segments run to `scripts/fixtures/transcription-output.json` with the user's authorization.
- [x] Require an expiring Convex-admin session for every public intake endpoint and verify upload size against Convex storage metadata.
- [x] Automatically delete intake records and uploaded files after seven days; expire admin sessions after 30 minutes.
- [x] Re-run focused tests (18 passed), both type checks, lint, and production build after the access-control changes.
- [x] Save the authorized full spoken output for PR review; inspect transcript content before publishing the PR.
