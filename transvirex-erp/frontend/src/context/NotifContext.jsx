import { createContext, useContext, useState, useEffect } from "react";
import { getNotifications } from "../services/api";
import { useAuth } from "./AuthContext";

const NotifContext = createContext();

export function NotifProvider({ children }) {
  const { user } = useAuth();
  const [nonLues, setNonLues] = useState(0);

  async function refreshNotifs() {
    if (!user?._id) return;
    try {
      const res = await getNotifications(user._id, user.role);
      setNonLues(res.data.filter(n => !n.lu).length);
    } catch {}
  }

  useEffect(() => {
    refreshNotifs();
    const interval = setInterval(refreshNotifs, 30000); // refresh toutes les 30s
    return () => clearInterval(interval);
  }, [user]);

  return (
    <NotifContext.Provider value={{ nonLues, refreshNotifs }}>
      {children}
    </NotifContext.Provider>
  );
}

export const useNotifs = () => useContext(NotifContext);