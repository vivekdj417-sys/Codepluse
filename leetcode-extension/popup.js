const apiInput = document.getElementById("api");
const tokenInput = document.getElementById("token");
const syncButton = document.getElementById("sync");
const status = document.getElementById("status");

const formatDate = (timestamp) =>
  timestamp ? new Date(timestamp).toLocaleString() : "Not synced yet";

const showSavedStatus = async () => {
  const { apiUrl, token, lastFullSyncAt, lastFullSyncTotal, syncError } =
    await chrome.storage.local.get([
      "apiUrl",
      "token",
      "lastFullSyncAt",
      "lastFullSyncTotal",
      "syncError",
    ]);

  if (apiUrl) apiInput.value = apiUrl;
  if (token) tokenInput.value = token;
  if (syncError) {
    status.textContent = `Last sync error: ${syncError}`;
    status.className = "error";
  } else if (lastFullSyncAt) {
    status.textContent =
      `Last full sync: ${formatDate(lastFullSyncAt)} (${lastFullSyncTotal} solved). ` +
      `Next sync: ${formatDate(lastFullSyncAt + 2 * 24 * 60 * 60 * 1000)}.`;
    status.className = "";
  } else {
    status.textContent = "Save your token and sync once to enable automatic 2-day sync.";
    status.className = "";
  }
};

syncButton.addEventListener("click", async () => {
  syncButton.disabled = true;
  status.textContent = "Fetching your full solved list from LeetCode...";
  status.className = "";

  try {
    const result = await chrome.runtime.sendMessage({
      type: "configure-and-sync",
      apiUrl: apiInput.value,
      token: tokenInput.value,
    });
    if (!result?.ok) throw new Error(result?.message || "Unable to complete sync.");

    status.textContent =
      `Synced ${result.totalSolved} solved questions. Next full sync: ${formatDate(result.nextSyncAt)}.`;
    status.className = "success";
  } catch (error) {
    status.textContent = error.message || "Unable to complete sync.";
    status.className = "error";
  } finally {
    syncButton.disabled = false;
  }
});

showSavedStatus().catch((error) => {
  status.textContent = error.message || "Unable to load extension settings.";
  status.className = "error";
});
