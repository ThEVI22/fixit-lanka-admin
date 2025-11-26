import { useEffect, useState } from "react";
import { auth } from "../firebase";

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(() => {
      setReady(true);
    });
    return () => unsub();
  }, []);

  if (!ready) return <div className="p-10 text-center">Loading…</div>;

  return <>{children}</>;
};

export default AuthGate;
