import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem("token", data.access_token);
      const me = await apiFetch("/api/me");
      localStorage.setItem("user", JSON.stringify(me));
      if (me.role === "admin") navigate("/admin");
      else if (me.role === "manager") navigate("/manager");
      else navigate("/agent");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <form onSubmit={handleLogin} style={{ width: 360, background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}>
        <h2>RCS Business Login</h2>
        {error && <div style={{ color: "red" }}>{error}</div>}
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" style={{ width: "100%", padding: 10, marginTop: 10 }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" style={{ width: "100%", padding: 10, marginTop: 10 }} />
        <button type="submit" style={{ width: "100%", background: "#2563eb", color: "white", padding: 12, marginTop: 16, border: "none", borderRadius: 8 }}>Login</button>
      </form>
    </div>
  );
}
