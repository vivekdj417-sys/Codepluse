import { syncAllSolvedProblems } from "./leetcodeSync.js";

const ALARM_NAME = "codepulse-full-sync";
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const RETRY_DELAY_MS = 30 * 60 * 1000;
let currentSync;

const scheduleSync = async (when) => {
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.alarms.create(ALARM_NAME, { when: Math.max(when, Date.now() + 60_000) });
};

const syncConfiguredAccount = async () => {
  if (currentSync) return currentSync;

  currentSync = (async () => {
    const { apiUrl, token } = await chrome.storage.local.get(["apiUrl", "token"]);
    if (!apiUrl || !token) {
      await chrome.storage.local.set({
        syncError: "Open the extension and save your CodePulse API URL and token to enable scheduled sync.",
      });
      return;
    }

    try {
      const result = await syncAllSolvedProblems(apiUrl, token);
      const syncedAt = Date.now();
      await chrome.storage.local.set({
        lastFullSyncAt: syncedAt,
        lastFullSyncTotal: result.totalSolved,
        syncError: "",
      });
      await scheduleSync(syncedAt + TWO_DAYS_MS);
    } catch (error) {
      await chrome.storage.local.set({ syncError: error.message || "Scheduled LeetCode sync failed." });
      await scheduleSync(Date.now() + RETRY_DELAY_MS);
      throw error;
    }
  })();

  try {
    await currentSync;
  } finally {
    currentSync = null;
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "configure-and-sync") return false;

  (async () => {
    const apiUrl = String(message.apiUrl || "").trim().replace(/\/+$/, "");
    const token = String(message.token || "").trim().replace(/^Bearer\s+/i, "");
    if (!apiUrl || !token) throw new Error("CodePulse API URL and token are required.");

    await chrome.storage.local.set({ apiUrl, token, syncError: "" });
    await syncConfiguredAccount();
    const { lastFullSyncAt, lastFullSyncTotal } = await chrome.storage.local.get([
      "lastFullSyncAt",
      "lastFullSyncTotal",
    ]);
    return {
      syncedAt: lastFullSyncAt,
      totalSolved: lastFullSyncTotal,
      nextSyncAt: lastFullSyncAt + TWO_DAYS_MS,
    };
  })()
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, message: error.message }));

  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) syncConfiguredAccount().catch(() => {});
});

chrome.runtime.onStartup.addListener(async () => {
  const { apiUrl, token, lastFullSyncAt } = await chrome.storage.local.get([
    "apiUrl",
    "token",
    "lastFullSyncAt",
  ]);
  if (!apiUrl || !token) return;

  const nextSyncAt = (lastFullSyncAt || 0) + TWO_DAYS_MS;
  if (nextSyncAt <= Date.now()) {
    await syncConfiguredAccount().catch(() => {});
  } else {
    await scheduleSync(nextSyncAt);
  }
});
