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

  const occupiedRooms = dorm?.rooms?.filter((r: any) => r.status === "occupied") || [];

  const handlePinInput = (val: string) => {
    setPinVal(val);
    setErrorMsg("");
  };

  const handleSelectChip = (roomId: string) => {
    setPinVal(roomId);
    setErrorMsg("");
    // Automatically confirm when clicked
    doConfirm(roomId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      doConfirm(pinVal);
    }
  };

  const doConfirm = async (roomNumber: string) => {
    const targetRoom = roomNumber.trim();
    if (!targetRoom) return;

    try {
      // 1. Try to login via API
      const res = await api.loginTenant({ room_number: targetRoom, dorm_id: dorm?.id });
      setRole("tenant");
      setTenantRoom(res.room_id);
      localStorage.setItem("dormy_role", "tenant");
      localStorage.setItem("dormy_tenant_room", res.room_id);
      localStorage.setItem("dormy_tenant_room_number", res.room_number);
      localStorage.setItem("dormy_tenant_dorm_id", res.dorm_id);
      router.push("/tenant/home");
    } catch (err: any) {
      console.warn("API Tenant login failed, falling back to local:", err);
      // 2. Fallback to local mockup search
      if (!dorm || !dorm.rooms) {
        setErrorMsg("ระบบขัดข้อง กรุณารีเฟรช");
        return;
      }
      const room = dorm.rooms.find(
        (r: any) => r.id === targetRoom || r.id === targetRoom.replace(/^0+/, "")
      );
      if (!room) {
        setErrorMsg("ไม่พบหมายเลขห้องนี้");
        return;
      }
      if (room.status !== "occupied") {
        setErrorMsg("ห้องนี้ยังไม่มีผู้เช่า");
        return;
      }
      // Successful local login
      setRole("tenant");
      setTenantRoom(room.uuid || room.id);
      localStorage.setItem("dormy_role", "tenant");
      localStorage.setItem("dormy_tenant_room", room.uuid || room.id);
      localStorage.setItem("dormy_tenant_room_number", room.id);
      localStorage.setItem("dormy_tenant_dorm_id", dorm.id);
      router.push("/tenant/home");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div id="pin-screen" style={{ display: "flex" }}>
        <div className="pin-box">
          <div className="pin-title">เข้าสู่ระบบผู้เช่า</div>
          <div className="pin-desc">พิมพ์หมายเลขห้องของคุณ</div>
          <input
            ref={inputRef}
            className="pin-input"
            id="pin-inp"
            type="text"
            maxLength={4}
            placeholder="101"
            autoComplete="off"
            value={pinVal}
            onChange={(e) => handlePinInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <div className="pin-err" id="pin-err">
            {errorMsg}
          </div>
          <div className="hint" style={{ textAlign: "center", marginTop: "6px" }}>
            กดห้องด้านล่าง หรือพิมพ์แล้วกด Enter
          </div>
          <div className="pin-chips mt3" id="pin-chips">
            {occupiedRooms.length > 0 ? (
              occupiedRooms.map((r: any) => (
                <span key={r.id} className="chip" onClick={() => handleSelectChip(r.id)}>
                  {r.id}
                </span>
              ))
            ) : (
              <span style={{ fontSize: "12px", color: "var(--t3)" }}>ไม่มีห้องที่มีผู้เช่า</span>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
            <button className="btn bg f1" onClick={() => router.push("/")}>
              ย้อนกลับ
            </button>
            <button
              className="btn bp f1"
              id="pin-ok"
              disabled={!pinVal.trim()}
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
