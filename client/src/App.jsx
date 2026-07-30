import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Tokens from "./pages/Tokens";
import AdAccounts from "./pages/AdAccounts";
import Campaigns from "./pages/Campaigns";
import Insights from "./pages/Insights";

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tokens" element={<Tokens />} />
            <Route path="/adaccounts" element={<AdAccounts />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
