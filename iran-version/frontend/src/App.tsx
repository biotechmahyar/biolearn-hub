import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/use-auth";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0a0f1a] text-slate-200" dir="rtl">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
