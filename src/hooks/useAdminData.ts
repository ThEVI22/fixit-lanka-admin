import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function useAdminData() {
  const [name, setName] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdmin = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const adminRef = doc(db, "admins", user.email!);
      const snap = await getDoc(adminRef);

      if (snap.exists()) {
        setName(snap.data().name);
        setRole(snap.data().role);
      }

      setLoading(false);
    };

    fetchAdmin();
  }, []);

  return { name, role, loading };
}
