/**
 * Portfolio embed readiness handshake.
 *
 * When bye-bg is framed inside the portfolio Showcase as a live Embed, the parent fades its
 * Poster out exactly when this app signals it is interactive. We announce `portfolio:ready`
 * (protocol v1) on a retry interval until the parent acks, and re-announce whenever the parent
 * posts `portfolio:hello` (covers the child-ready-before-parent-listener race). See the
 * portfolio embed contract (ADR 0004).
 *
 * No-op when not framed. If the parent never acks (standalone, or an older portfolio without
 * the handshake), the retry stops after a bounded number of tries and the parent still reveals
 * via its own load/ceiling fallback.
 */
const PARENT_ORIGINS = ['https://salvarecuero.dev', 'http://localhost:4321'];
const PROTOCOL_VERSION = 1;
const MAX_TRIES = 10;
const RETRY_MS = 250;

export function announcePortfolioReady(): () => void {
  // Not in a frame → nothing to announce.
  if (window.parent === window) return () => {};

  let acked = false;
  let tries = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const announce = () => {
    if (acked || tries++ >= MAX_TRIES) return;
    for (const origin of PARENT_ORIGINS) {
      try {
        window.parent.postMessage({ type: 'portfolio:ready', v: PROTOCOL_VERSION }, origin);
      } catch {
        /* targetOrigin mismatch for this parent — ignore and try the next */
      }
    }
    timer = setTimeout(announce, RETRY_MS);
  };

  const onMessage = (e: MessageEvent) => {
    if (!PARENT_ORIGINS.includes(e.origin)) return;
    const data = e.data as { type?: string; v?: number } | null;
    if (data?.v !== PROTOCOL_VERSION) return;
    if (data.type === 'portfolio:ack') acked = true;
    else if (data.type === 'portfolio:hello') announce(); // parent asked us to re-announce
  };

  window.addEventListener('message', onMessage);
  announce();

  return () => {
    acked = true; // stop any pending retry
    if (timer) clearTimeout(timer);
    window.removeEventListener('message', onMessage);
  };
}
