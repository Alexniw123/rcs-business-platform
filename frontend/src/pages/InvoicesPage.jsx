import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { apiFetch } from "../api";

export default function InvoicesPage() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState({
    customer_name: "",
    amount: 0,
    currency: "USD",
    status: "draft",
    due_date: "",
    notes: "",
    campaign_id: ""
  });

  async function loadInvoices() {
    const data = await apiFetch("/api/invoices");
    setInvoices(data);
  }

  useEffect(() => {
    loadInvoices().catch(console.error);
  }, []);

  async function createInvoice(e) {
    e.preventDefault();
    await apiFetch("/api/invoices", {
      method: "POST",
      body: JSON.stringify(form)
    });
    setForm({ customer_name: "", amount: 0, currency: "USD", status: "draft", due_date: "", notes: "", campaign_id: "" });
    loadInvoices();
  }

  return (
    <div>
      <Navbar user={user} />
      <div style={{ padding: 20 }}>
        <h2>Invoices</h2>

        <form onSubmit={createInvoice} style={{ background: "#f9fafb", padding: 20, borderRadius: 8 }}>
          <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Customer name" style={{ width: "100%", padding: 10, marginTop: 8 }} />
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount" style={{ width: "100%", padding: 10, marginTop: 8 }} />
          <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="Currency" style={{ width: "100%", padding: 10, marginTop: 8 }} />
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={{ width: "100%", padding: 10, marginTop: 8 }} />
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" style={{ width: "100%", padding: 10, marginTop: 8, minHeight: 100 }} />
          <button type="submit" style={{ width: "100%", padding: 12, background: "#2563eb", color: "white", border: "none", borderRadius: 8 }}>Create Invoice</button>
        </form>

        <div style={{ marginTop: 20 }}>
          <h3>Invoice List</h3>
          {invoices.map((inv) => (
            <div key={inv.id} style={{ border: "1px solid #ddd", padding: 16, marginBottom: 10 }}>
              <strong>{inv.invoice_number}</strong> - {inv.customer_name}
              <p>Amount: {inv.amount} {inv.currency}</p>
              <p>Status: {inv.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
