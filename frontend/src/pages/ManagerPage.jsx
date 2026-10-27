import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { apiFetch } from "../api";

export default function ManagerPage() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [campaigns, setCampaigns] = useState([]);
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState({ name: "", content: "" });

  async function loadData() {
    const campaignData = await apiFetch("/api/campaigns");
    const providerData = await apiFetch("/api/providers");
    setCampaigns(campaignData);
    setProviders(providerData);
  }

  useEffect(() => {
    loadData().catch(console.error);
  }, []);

  async function createCampaign(e) {
    e.preventDefault();
    await apiFetch("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(form)
    });
    setForm({ name: "", content: "" });
    loadData();
  }

  return (
    <div>
      <Navbar user={user} />
      <div style={{ padding: 20 }}>
        <h2>Manager Dashboard</h2>

        <form onSubmit={createCampaign} style={{ background: "#f9fafb", padding: 20, borderRadius: 8 }}>
          <h3>Create Campaign</h3>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Campaign name" style={{ width: "100%", padding: 10, marginTop: 8 }} />
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Message template, e.g. Hello {first_name}, your order is ready." style={{ width: "100%", padding: 10, marginTop: 8, minHeight: 100 }} />
          <button type="submit" style={{ width: "100%", padding: 12, background: "#0f766e", color: "white", border: "none", borderRadius: 8 }}>Create</button>
        </form>

        <div style={{ marginTop: 20 }}>
          <h3>Campaigns</h3>
          {campaigns.map((c) => (
            <div key={c.id} style={{ background: "#fff", border: "1px solid #ddd", padding: 16, marginBottom: 10 }}>
              <strong>{c.name}</strong>
              <p>{c.content}</p>
              <p>Status: {c.status}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <h3>Available Providers</h3>
          {providers.map((p) => (
            <div key={p.id} style={{ padding: 12, borderBottom: "1px solid #ddd" }}>{p.name} - {p.provider_type}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
