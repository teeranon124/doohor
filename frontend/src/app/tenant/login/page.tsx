"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDorm } from "@/context/DormContext";
import { api } from "@/utils/api";

export default function TenantLoginPage() {
  const router = useRouter();
  const { dorm, setRole, setTenantRoom, loading } = useDorm();
  const [pinVal, setPinVal] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handlePinInput = (val: string) => {
    setPinVal(val);
    setErrorMsg("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      doConfirm(pinVal);
    }
  };

  const doConfirm = async (roomKey: string) => {
    const targetKey = roomKey.trim();
    if (!targetKey) return;

    if (targetKey.length !== 36) {
      setErrorMsg("รหัสเข้าใช้งานไม่ถูกต้อง (ต้องเป็นรหัส UUID 36 หลัก)");
      return;
    }

    try {
      const res = await api.getTenantSession(targetKey);
      setRole("tenant");
      setTenantRoom(res.room_id);
      localStorage.setItem("dormy_role", "tenant");
      localStorage.setItem("dormy_tenant_room", res.room_id);
      localStorage.setItem("dormy_tenant_room_number", res.room_number);
      localStorage.setItem("dormy_tenant_dorm_id", res.dorm_id);
      router.push("/tenant/home");
    } catch (err: any) {
      setErrorMsg(err.message || "ไม่พบรหัสเข้าใช้งานห้องพักนี้ หรือห้องยังไม่มีผู้เช่า");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div id="pin-screen" style={{ display: "flex" }}>
        <div className="pin-box">
          <div className="pin-title">เข้าสู่ระบบผู้เช่า</div>
          <div className="pin-desc">กรอกรหัสเข้าใช้งานห้องพัก (Room Key)</div>
          <input
            ref={inputRef}
            className="pin-input"
            id="pin-inp"
            type="text"
            maxLength={36}
            placeholder="รหัส 36 หลัก เช่น f3a1e2..."
            autoComplete="off"
            value={pinVal}
            onChange={(e) => handlePinInput(e.target.value)}
            onKeyDown={handleKeyPress}
            style={{ 
              fontSize: "14px", 
              letterSpacing: "0px",
              textAlign: "center"
            }}
          />
          <div className="pin-err" id="pin-err">
            {errorMsg}
          </div>
          <div className="hint" style={{ textAlign: "center", marginTop: "6px" }}>
            กรอกรหัสผ่าน 36 หลักที่ได้รับจากเจ้าของหอพักของคุณ เพื่อเข้าสู่ระบบ
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
            <button className="btn bg f1" onClick={() => router.push("/")}>
              ย้อนกลับ
            </button>
            <button
              className="btn bp f1"
              id="pin-ok"
              disabled={pinVal.trim().length !== 36}
              onClick={() => doConfirm(pinVal)}
            >
              เข้าใช้งาน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
