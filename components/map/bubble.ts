import { bubbleSize } from "./counts";

// The round count bubble from the mockup, shared by report markers (React) and cluster
// markers (plain DOM, built by the clusterer). Strings only, so it works as a React style
// and with Object.assign(el.style, …).
export function bubbleStyle(count: number, color: string, highlighted = false): Record<string, string> {
  const size = bubbleSize(count);
  return {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    background: color,
    color: "#FFFFFF",
    border: "3px solid #FFFFFF",
    boxShadow: highlighted
      ? "0 0 0 6px rgba(15,30,51,.35), 0 4px 12px rgba(0,0,0,.3)"
      : "0 3px 8px rgba(0,0,0,.25)",
    fontSize: count > 99 ? "12px" : "14px",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    cursor: "pointer",
  };
}

export function clusterBubble(count: number, color: string): HTMLDivElement {
  const el = document.createElement("div");
  Object.assign(el.style, bubbleStyle(count, color), {
    boxShadow: "0 0 0 6px rgba(30,58,95,.2), 0 3px 8px rgba(0,0,0,.25)",
    // AdvancedMarkerElement anchors content at its bottom center; center it on the point.
    transform: "translateY(50%)",
  });
  el.textContent = String(count);
  return el;
}
