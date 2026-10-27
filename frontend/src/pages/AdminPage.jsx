import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { apiFetch } from "../api";

export default function AdminPage() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [users, setUsers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", role: "agent", email: "" });

  async function loadData() {
    const data = await apiFetch("/api/users");
    const providerData = await apiFetch("/api/providers");
    setUsers(data);
    setProviders(providerData);
  }

  useEffect(() => {
    loadData().catch(console.error);
  }, []);

  async function createUser(e) {
    e.preventDefault();
    await apiFetch("/api/users", {
      method: "POST",
      body: JSON.stringify(form)
    });
    setForm({ username: "", password: "", role: "agent", email: "" });
    loadData();
  }

  async function createProvider(e) {
    e.preventDefault();
    const name = prompt("Provider name");
    const provider_type = prompt("Provider type (sinch)", "sinch");
    const api_url = prompt("API URL", "https://conversation.api.sinch.com/v1/batches");
    const api_key = prompt("API key");
    const sender_id = prompt("Sender ID");
    await apiFetch("/api/providers", {
      method: "POST",
      body: JSON.stringify({ name, provider_type, api_url, api_key, sender_id })
    });
    loadData();
  }

  return (
    <div>
      <Navbar user={user} />
      <div style={{ padding: 20 }}>
        <h2>Admin Panel</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <form onSubmit={createUser} style={{ background: "#f9fafb", padding: 20, borderRadius: 8 }}>
            <h3>Create User</h3>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username" style={{ width: "100%", padding: 10, marginTop: 8 }} />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" style={{ width: "100%", padding: 10, marginTop: 8 }} />
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" style={{ width: "100%", padding: 10, marginTop: 8 }} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ width: "100%", padding: 10, marginTop: 8 }}>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="agent">Agent</option>
            </select>
            <button type="submit" style={{ width: "100%", marginTop: 10, padding: 12, background: "#2563eb", color: "white", border: "none", borderRadius: 8 }}>Create User</button>
          </form>

          <form onSubmit={createProvider} style={{ background: "#f9fafb", padding: 20, borderRadius: 8 }}>
            <h3>Create Provider</h3>
            <p>Prompt-based creation to keep it simple.</p>
            <button type="submit" style={{ width: "100%", padding: 12, background: "#111827", color: "white", border: "none", borderRadius: 8 }}>Add Provider</button>
          </form>
        </div>

        <div style={{ marginTop: 20, background: "#f9fafb", padding: 20, borderRadius: 8 }}>
          <h3>Users</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr><th>Username</th><th>Email</th><th>Role</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.email || "-"}</td>
                  <td>{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
