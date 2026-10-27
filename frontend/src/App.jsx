import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import ManagerPage from "./pages/ManagerPage";
import AgentPage from "./pages/AgentPage";
import InvoicesPage from "./pages/InvoicesPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>} />
      <Route path="/manager" element={<ProtectedRoute requiredRole="manager"><ManagerPage /></ProtectedRoute>} />
      <Route path="/agent" element={<ProtectedRoute requiredRole="agent"><AgentPage /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute requiredRole={["admin","manager"]}><InvoicesPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
