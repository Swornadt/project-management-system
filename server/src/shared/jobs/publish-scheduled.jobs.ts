import { approvalsService } from "../../features/approvals/approvals.service";

//approved items can be published or can published according to a schedule."
const INTERVAL_MS = 60_000;

let timer: NodeJS.Timeout | null = null;

async function tick() {
  try {
    const published = await approvalsService.publishDue();
    if (published > 0) {
      console.log(`[publish-scheduled] published ${published} content item(s)`);
    }
  } catch (err) {
    console.error("[publish-scheduled] error:", err);
  }
}

export function startPublishScheduler(): void {
  if (timer) return;
  timer = setInterval(tick, INTERVAL_MS);
  console.log("[publish-scheduled] scheduler started (60s interval)");
}

export function stopPublishScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}