import { Link, useNavigate } from "react-router-dom";

export default function Navbar({ user }) {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <nav style={{ display: "flex", gap: "16px", padding: "16px 20px", background: "#111827", color: "white", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <Link to={`/${user?.role}`} style={{ color: "white", textDecoration: "none" }}>Home</Link>
        {(user?.role === "admin" || user?.role === "manager") && (
          <Link to="/invoices" style={{ color: "white", textDecoration: "none" }}>Invoices</Link>
        )}
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <span>{user?.username}</span>
        <button onClick={logout} style={{ padding: "8px 12px", borderRadius: "6px", border: "none", cursor: "pointer" }}>Logout</button>
      </div>
    </nav>
  );
}
