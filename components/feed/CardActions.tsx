import type { ReactNode } from "react";
import type { FeedSlotProps } from "./FeedCard";

// Stub (US16). US23 fills it with "Is it fixed?" on open cards the city doesn't own (§4.3.2).
const CardActions: (props: FeedSlotProps) => ReactNode = () => null;
export default CardActions;
