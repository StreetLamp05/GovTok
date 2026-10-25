import type { ReactNode } from "react";
import type { FeedSlotProps } from "./FeedCard";

// Stub (US16). US19 fills it with the before/after reveal on fixed cards (§5.1.1).
// `video` is the pooled element playing the original clip (null for slideshows). The pool
// starts it when the card comes on screen. Set `video.loop = false` to take over from there:
// the pool then never restarts it on a tap, so a tap during the stamp or the fix clip doesn't
// replay the original. For the fix clip, either render a separate always-muted <video> at
// z-[2] (muted needs no unlock; load it only when `near`), or swap `video.src` to it and back,
// with `video.dataset.silent = "true"` while it plays so the pool keeps it muted through the
// sound unlock. The pool resets loop, src and silent when it gives the element to another card.
const CardReveal: (props: FeedSlotProps) => ReactNode = () => null;
export default CardReveal;
