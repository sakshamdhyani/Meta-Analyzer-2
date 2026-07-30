import { createContext, useContext, useState, useCallback } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState(null);

  const toast$ = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <AppContext.Provider value={{ selectedTokenId, setSelectedTokenId, sidebarOpen, setSidebarOpen, toast, toast$ }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
