"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDorm } from "@/context/DormContext";
import { api } from "@/utils/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const { setRole } = useDorm();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus();
    }
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  const handleLogin = async () => {
    const targetEmail = email.trim();
    const targetPassword = password.trim();
    if (!targetEmail || !targetPassword) {
      setErrorMsg("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await api.loginAdmin({ email: targetEmail, password: targetPassword });
      
      // Save JWT token in cookie for middleware
      const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `dormy_admin_token=${res.session_token}; path=/; max-age=86400; SameSite=Lax${secureFlag}`;
      
      // Save role in state & local storage
      setRole("admin");
      localStorage.setItem("dormy_role", "admin");
      
      // Redirect to dashboard
      window.location.href = "/admin/dashboard";
    } catch (err: any) {
      setErrorMsg(err.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div id="pin-screen" style={{ display: "flex" }}>
        <div className="pin-box" style={{ maxWidth: "380px" }}>
          <div className="pin-title" style={{ fontSize: "20px" }}>เข้าสู่ระบบผู้ดูแลหอพัก</div>
          <div className="pin-desc" style={{ marginBottom: "16px" }}>กรอกอีเมลและรหัสผ่านผู้ดูแลระบบ</div>
          
          <div className="fg">
            <label className="fl">อีเมล</label>
            <input
              ref={emailRef}
              className="inp"
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
          </div>

          <div className="fg">
            <label className="fl">รหัสผ่าน</label>
            <input
              className="inp"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
          </div>

          <div className="pin-err" id="pin-err" style={{ minHeight: "20px", marginBottom: "8px" }}>
            {errorMsg}
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button className="btn bg f1" onClick={() => router.push("/")} disabled={loading}>
              ย้อนกลับ
            </button>
            <button
              className="btn bp f1"
              id="pin-ok"
              disabled={loading || !email.trim() || !password.trim()}
              onClick={handleLogin}
            >
              {loading ? "กำลังโหลด..." : "เข้าสู่ระบบ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
