import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import PopupMessage from "../components/PopupMessage";

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Popup Controller
  const [popup, setPopup] = useState<{
    type?: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  } | null>(null);

  const showPopup = (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message: string
  ) => setPopup({ type, title, message });

  // Email validation
  const isEmailValid = (email: string) =>
    email.endsWith("@rda.gov.lk") && email.trim().length > 10;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      showPopup(
        "warning",
        "Missing Information",
        "Please enter both email and password."
      );
      return;
    }

    if (!isEmailValid(email.trim())) {
      showPopup(
        "warning",
        "Unauthorized Email",
        "Only authorized @rda.gov.lk emails can access this system."
      );
      return;
    }

    setLoading(true);

    try {
      // Check admin access
      const adminRef = doc(db, "admins", email.trim());
      const adminSnap = await getDoc(adminRef);

      if (!adminSnap.exists()) {
        showPopup(
          "error",
          "Access Denied",
          "This email address is not registered as an admin."
        );
        return;
      }

      // Login
      await signInWithEmailAndPassword(auth, email.trim(), password);

      // Success popup
      showPopup(
        "success",
        "Login successful 🎉",
        "Welcome back! Redirecting to your dashboard…"
      );

      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (err: any) {
      const msg = err?.message || "";

      if (msg.includes("auth/user-not-found")) {
        showPopup("error", "Account Not Found", "No admin exists with this email.");
      } else if (msg.includes("auth/wrong-password")) {
        showPopup(
          "error",
          "Incorrect Password",
          "The password you entered is incorrect. Please try again."
        );
      } else if (msg.includes("auth/invalid-email")) {
        showPopup(
          "warning",
          "Invalid Email",
          "Please enter a valid email address."
        );
      } else {
        showPopup("error", "Error", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl grid grid-cols-1 md:grid-cols-2 overflow-hidden">

        {/* LEFT PANEL */}
        <div className="bg-black text-white px-10 py-10 flex flex-col justify-between">
          <div>
            <p className="text-[11px] tracking-[0.25em] uppercase text-[#FFD54F] mb-1">
              Admin dashboard
            </p>
            <p className="text-2xl font-semibold mb-8">Fixit Lanka</p>

            <h1 className="text-3xl font-semibold mb-4">
              Welcome back, officer. 👋
            </h1>

            <p className="text-sm text-slate-200 leading-relaxed">
              Sign in to review, triage, and track road issue reports across
              Sri Lanka. Keep the roads safer, one report at a time.
            </p>
          </div>

          <p className="text-[11px] text-slate-400 mt-10">
            © 2025 Fixit Lanka · RDA internal use only
          </p>
        </div>

        {/* RIGHT PANEL */}
        <div className="px-10 py-10 flex flex-col justify-center">
          <div className="mb-8">
            <p className="text-[11px] tracking-[0.25em] uppercase text-slate-400 mb-2">
              Admin login
            </p>
            <h2 className="text-2xl font-semibold mb-2">
              Sign in to your account
            </h2>
            <p className="text-sm text-slate-500">
              Use your official RDA email and password to continue.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="admin@rda.gov.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-black focus:bg-white transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-black focus:bg-white transition"
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black text-white py-3 text-sm font-semibold shadow-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Logging in…" : "Login"}
            </button>
          </form>

          <p className="mt-6 text-[11px] text-slate-400 leading-relaxed">
            You’re accessing the internal Fixit Lanka reporting console.
            If you don’t have access, contact your RDA system administrator.
          </p>
        </div>
      </div>

      {/* POPUP MESSAGE */}
      {popup && (
        <PopupMessage
          type={popup.type}
          title={popup.title}
          message={popup.message}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
};

export default AdminLogin;
