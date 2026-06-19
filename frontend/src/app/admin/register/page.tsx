"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";

export default function AdminRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (nameRef.current) {
      nameRef.current.focus();
    }
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRegister();
    }
  };

  const handleRegister = async () => {
    const targetName = name.trim();
    const targetEmail = email.trim();
    const targetPassword = password.trim();

    if (!targetName || !targetEmail || !targetPassword) {
      setErrorMsg("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    if (targetPassword.length < 6) {
      setErrorMsg("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (targetPassword !== confirmPassword.trim()) {
      setErrorMsg("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await api.registerAdmin({
        name: targetName,
        email: targetEmail,
        password: targetPassword
      });
      
      setSuccessMsg("ลงทะเบียนสำเร็จแล้ว! กำลังพาท่านไปหน้าเข้าสู่ระบบ...");
      setTimeout(() => {
        router.push("/admin/login");
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div id="pin-screen" style={{ display: "flex" }}>
        <div className="pin-box" style={{ maxWidth: "380px" }}>
          <div className="pin-title" style={{ fontSize: "20px" }}>สมัครสมาชิกผู้ดูแลหอพัก</div>
          <div className="pin-desc" style={{ marginBottom: "16px" }}>สร้างบัญชีเจ้าของหอพักใหม่เพื่อเริ่มต้นใช้งาน</div>
          
          <div className="fg">
            <label className="fl">ชื่อผู้ดูแล / ชื่อหอพักหลัก</label>
            <input
              ref={nameRef}
              className="inp"
              type="text"
              placeholder="เช่น สมชาย ใจดี"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrorMsg(""); }}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
          </div>

          <div className="fg">
            <label className="fl">อีเมล</label>
            <input
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
              placeholder="•••••••• (อย่างน้อย 6 ตัวอักษร)"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
          </div>

          <div className="fg">
            <label className="fl">ยืนยันรหัสผ่าน</label>
            <input
              className="inp"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrorMsg(""); }}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
          </div>

          {errorMsg && (
            <div className="pin-err" style={{ minHeight: "20px", marginBottom: "8px" }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ color: "var(--green)", fontSize: "13px", marginBottom: "8px", textAlign: "center" }}>
              {successMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button className="btn bg f1" onClick={() => router.push("/admin/login")} disabled={loading}>
              ย้อนกลับ
            </button>
            <button
              className="btn bp f1"
              disabled={loading || !name.trim() || !email.trim() || !password.trim()}
              onClick={handleRegister}
            >
              {loading ? "กำลังบันทึก..." : "สมัครสมาชิก"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
