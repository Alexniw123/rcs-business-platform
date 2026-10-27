import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { apiFetch } from "../api";

export default function AgentPage() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [campaigns, setCampaigns] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState("");

  async function loadData() {
    const data = await apiFetch("/api/campaigns");
    setCampaigns(data);
  }

  useEffect(() => {
    loadData().catch(console.error);
  }, []);

  async function createCampaignFromUpload(e) {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    const campaign = await apiFetch("/api/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: "Campaign from CSV",
        content: message || "Hello {first_name}, this is your message."
      })
    }).catch(() => null);

    if (!campaign) return;

    const uploadRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/campaigns/${campaign.id}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: formData
    });

    if (!uploadRes.ok) {
      alert("Upload failed");
      return;
    }

    alert("Campaign uploaded successfully");
    loadData();
  }

  async function sendCampaign(campaignId) {
    await apiFetch(`/api/campaigns/${campaignId}/send`, { method: "POST" });
    alert("Campaign sent");
    loadData();
  }

  return (
    <div>
      <Navbar user={user} />
      <div style={{ padding: 20 }}>
        <h2>Agent Dashboard</h2>

        <form onSubmit={createCampaignFromUpload} style={{ background: "#f9fafb", padding: 20, borderRadius: 8 }}>
          <h3>Upload CSV and Send</h3>
          <input type="file" accept=".csv" onChange={(e) => setSelectedFile(e.target.files[0])} style={{ width: "100%", padding: 10, marginTop: 8 }} />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Template: Hello {first_name}, your appointment is confirmed." style={{ width: "100%", minHeight: 110, padding: 10, marginTop: 8 }} />
          <button type="submit" style={{ width: "100%", padding: 12, background: "#059669", color: "white", border: "none", borderRadius: 8 }}>Upload CSV</button>
        </form>

        <div style={{ marginTop: 20 }}>
          <h3>Campaigns</h3>
          {campaigns.map((c) => (
            <div key={c.id} style={{ border: "1px solid #ddd", padding: 16, marginBottom: 12 }}>
              <strong>{c.name}</strong>
              <p>{c.content}</p>
              <p>Status: {c.status}</p>
              <button onClick={() => sendCampaign(c.id)} style={{ padding: "10px 14px", background: "#2563eb", color: "white", border: "none", borderRadius: 8 }}>Send</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
