import { useState } from "react";
import { importLeetCodeUsername } from "../api.js";

export default function ImportLeetCodeModal({ open, onClose, onImported }) {
  const [tab, setTab] = useState("quick");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!open) return null;

  const handleQuickImport = async () => {
    if (!username.trim()) {
      setMessage("Enter a LeetCode username.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const result = await importLeetCodeUsername(username.trim());
      onImported?.(result.data);
      setMessage("LeetCode public profile imported successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to import LeetCode profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <button className="dialog-close" onClick={onClose}>×</button>
        <p className="eyebrow">IMPORT LEETCODE</p>
        <h2>Sync your progress</h2>

        <div className="auth-tabs">
          <button className={tab === "quick" ? "selected" : ""} type="button" onClick={() => setTab("quick")}>Quick Import</button>
          <button className={tab === "extension" ? "selected" : ""} type="button" onClick={() => setTab("extension")}>Full Sync via Extension</button>
        </div>

        {tab === "quick" && (
          <div>
            <label>
              LeetCode username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. vivek123"
              />
            </label>
            <button className="primary" type="button" onClick={handleQuickImport} disabled={loading}>
              {loading ? "Importing..." : "Import profile"}
            </button>
          </div>
        )}

        {tab === "extension" && (
          <div>
            <p className="muted">Use the CodePulse Chrome extension while logged into LeetCode. It reads the active browser session and syncs the full solved list automatically.</p>
            <button className="secondary" type="button" onClick={() => window.open("#", "_blank")}>Install extension</button>
          </div>
        )}

        {message && <p className="message success">{message}</p>}
      </div>
    </div>
  );
}
