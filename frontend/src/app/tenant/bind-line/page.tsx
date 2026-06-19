"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/utils/api";

declare global {
  interface Window {
    liff: any;
  }
}

export default function TenantBindLinePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlKey = searchParams.get("key") || "";

  // Form & System States
  const [roomKey, setRoomKey] = useState(urlKey);
  const [lineUser, setLineUser] = useState<{
    userId: string;
    displayName: string;
    pictureUrl: string;
  } | null>(null);
  
  const [isLiffInit, setIsLiffInit] = useState(false);
  const [isSimulation, setIsSimulation] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [resolvingRoom, setResolvingRoom] = useState(false);
  const [resolvedRoom, setResolvedRoom] = useState<any>(null);
  const [binding, setBinding] = useState(false);
  const [boundSuccess, setBoundSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [customLineId, setCustomLineId] = useState(""); // For simulation manual edit

  // Load LINE LIFF SDK
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";
    
    // Helper to setup mock user in Simulation Mode
    const setupSimulation = () => {
      setIsSimulation(true);
      setLineUser({
        userId: "Umock_" + Math.random().toString(36).substring(2, 15),
        displayName: "ผู้ใช้งานจำลอง (LINE Sandbox)",
        pictureUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=DormyLINE"
      });
      setLoadingProfile(false);
    };

    if (typeof window === "undefined") return;

    // Load LIFF SDK script
    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.async = true;
    script.onload = () => {
      if (window.liff) {
        if (!liffId || liffId === "mock-liff-id") {
          console.warn("No NEXT_PUBLIC_LIFF_ID found, entering Simulation Mode.");
          setupSimulation();
          return;
        }

        window.liff
          .init({ liffId })
          .then(() => {
            setIsLiffInit(true);
            if (!window.liff.isLoggedIn()) {
              window.liff.login();
            } else {
              window.liff
                .getProfile()
                .then((profile: any) => {
                  setLineUser({
                    userId: profile.userId,
                    displayName: profile.displayName,
                    pictureUrl: profile.pictureUrl || "https://api.dicebear.com/7.x/adventurer/svg?seed=Default"
                  });
                  setLoadingProfile(false);
                })
                .catch((err: any) => {
                  console.error("Failed to load LIFF profile:", err);
                  setupSimulation();
                });
            }
          })
          .catch((err: any) => {
            console.error("LIFF initialization failed:", err);
            setupSimulation();
          });
      } else {
        setupSimulation();
      }
    };
    script.onerror = () => {
      setupSimulation();
    };

    document.head.appendChild(script);
  }, []);

  // Fetch Room & Dorm details when Room Key changes
  const resolveRoomDetails = async (key: string) => {
    const cleanKey = key.trim();
    if (cleanKey.length !== 36 && cleanKey.length !== 8) {
      setResolvedRoom(null);
      return;
    }
    setResolvingRoom(true);
    setErrorMsg("");
    try {
      const session = await api.getTenantSession(cleanKey);
      setResolvedRoom(session);
    } catch (err: any) {
      setResolvedRoom(null);
      const isNetworkError = err.message?.includes("Failed to fetch") || err.name === "TypeError";
      setErrorMsg(isNetworkError 
        ? "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้งเมื่อเซิร์ฟเวอร์ออนไลน์"
        : (err.message || "ไม่พบข้อมูลห้องพักหรือสัญญาหมดอายุแล้ว")
      );
    } finally {
      setResolvingRoom(false);
    }
  };

  // Resolve room key immediately if loaded from URL
  useEffect(() => {
    if (urlKey) {
      resolveRoomDetails(urlKey);
    }
  }, [urlKey]);

  const handleKeyInput = (val: string) => {
    setRoomKey(val);
    setErrorMsg("");
    const clean = val.trim();
    if (clean.length === 36 || clean.length === 8) {
      resolveRoomDetails(clean);
    } else {
      setResolvedRoom(null);
    }
  };

  const handleBind = async () => {
    const cleanKey = roomKey.trim();
    if (!cleanKey || (cleanKey.length !== 36 && cleanKey.length !== 8)) {
      setErrorMsg("กรุณากรอกรหัสยืนยันตัวตน 8 หลัก หรือรหัส 36 หลักที่ถูกต้อง");
      return;
    }
    if (!lineUser) {
      setErrorMsg("ไม่สามารถดึงข้อมูลโปรไฟล์ LINE ได้");
      return;
    }

    setBinding(true);
    setErrorMsg("");
    
    // Determine target line ID (manual mock input overrides default simulation)
    const finalLineId = isSimulation && customLineId ? customLineId.trim() : lineUser.userId;

    try {
      await api.updateTenantLineId({
        room_uuid: cleanKey,
        line_user_id: finalLineId
      });
      setBoundSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล ลองใหม่อีกครั้ง");
    } finally {
      setBinding(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #111e25 0%, #1e3a47 100%)",
      fontFamily: "'Sarabun', sans-serif",
      color: "#e8eff1",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "20px",
      boxSizing: "border-box"
    }}>
      
      {/* Simulation Banner */}
      {isSimulation && (
        <div style={{
          background: "rgba(245, 158, 11, 0.2)",
          border: "1px solid rgb(245, 158, 11)",
          color: "#fbbf24",
          fontSize: "12px",
          padding: "8px 16px",
          borderRadius: "30px",
          marginBottom: "20px",
          textAlign: "center",
          fontWeight: "600",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
        }}>
          ⚠️ Simulation Mode: เปิดหน้าจอนอกแอป LINE
        </div>
      )}

      {/* Main Glassmorphic Container */}
      <div style={{
        background: "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "24px",
        width: "100%",
        maxWidth: "400px",
        padding: "30px 24px",
        boxSizing: "border-box",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
        textAlign: "center"
      }}>
        
        {/* Brand Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{
            fontSize: "28px",
            fontWeight: "800",
            letterSpacing: "1px",
            background: "linear-gradient(45deg, #38ef7d 0%, #11998e 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "inline-block",
            marginBottom: "4px"
          }}>
            Dormy Verify
          </div>
          <div style={{ fontSize: "13px", color: "#a5b4fc", opacity: 0.8 }}>
            ระบบเชื่อมต่อการรับใบเสร็จและแจ้งเตือนผ่าน LINE
          </div>
        </div>

        {boundSuccess ? (
          /* SUCCESS SCREEN */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              width: "70px",
              height: "70px",
              background: "linear-gradient(135deg, #24c6dc 0%, #514a9d 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
              boxShadow: "0 0 20px rgba(81, 74, 157, 0.4)"
            }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" style={{ width: "36px", height: "36px", color: "#fff" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 10px 0", color: "#38ef7d" }}>
              เชื่อมต่อสำเร็จแล้ว!
            </h3>
            <p style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: "1.6", margin: "0 0 24px 0", padding: "0 10px" }}>
              หอพักได้บันทึก LINE ของคุณเข้ากับระบบแล้ว ต่อจากนี้คุณจะได้รับบิลแจ้งเตือนและประวัติการยืนยันโอนเงินส่งตรงไปยัง LINE ของคุณทันที
            </p>
            <button 
              onClick={() => router.push(`/tenant/home?key=${roomKey}`)}
              style={{
                background: "linear-gradient(45deg, #11998e 0%, #38ef7d 100%)",
                border: "none",
                borderRadius: "14px",
                color: "#ffffff",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                width: "100%",
                boxShadow: "0 8px 16px rgba(56, 239, 125, 0.25)"
              }}
            >
              เข้าสู่หน้าแรกบิลของฉัน
            </button>
          </div>
        ) : (
          /* BIND FORM SCREEN */
          <div>
            {/* LINE PROFILE PANEL */}
            {loadingProfile ? (
              <div style={{ padding: "20px 0" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  border: "3px solid rgba(255,255,255,0.1)",
                  borderTop: "3px solid #38ef7d",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 10px auto"
                }}></div>
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>กำลังดึงข้อมูล LINE...</div>
              </div>
            ) : lineUser ? (
              <div style={{
                background: "rgba(255,255,255,0.04)",
                padding: "14px",
                borderRadius: "16px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                border: "1px solid rgba(255,255,255,0.06)",
                textAlign: "left"
              }}>
                <img 
                  src={lineUser.pictureUrl} 
                  alt={lineUser.displayName} 
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    border: "2px solid #38ef7d",
                    background: "rgba(255,255,255,0.1)"
                  }}
                />
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>เชื่อมต่อกับบัญชี LINE</div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lineUser.displayName}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Simulation controls */}
            {isSimulation && lineUser && (
              <div style={{
                background: "rgba(255,255,255,0.03)",
                padding: "12px",
                borderRadius: "12px",
                fontSize: "12px",
                marginBottom: "20px",
                textAlign: "left",
                border: "1px dashed rgba(255,255,255,0.1)"
              }}>
                <label style={{ display: "block", color: "#94a3b8", marginBottom: "4px" }}>จำลอง LINE User ID:</label>
                <input 
                  type="text" 
                  value={customLineId || lineUser.userId}
                  onChange={(e) => setCustomLineId(e.target.value)}
                  placeholder="ป้อน Line ID ทดสอบ"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    padding: "4px 8px",
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "11px"
                  }}
                />
              </div>
            )}

            {/* ROOM VERIFICATION BOX */}
            <div style={{ textAlign: "left", marginBottom: "20px" }}>
              <label style={{
                display: "block",
                fontSize: "13.5px",
                fontWeight: "600",
                color: "#cbd5e1",
                marginBottom: "8px"
              }}>
                รหัสยืนยันตัวตนเข้าห้องพัก (Verification Code)
              </label>
              <input 
                type="text"
                maxLength={36}
                value={roomKey}
                onChange={(e) => handleKeyInput(e.target.value)}
                placeholder="กรอกรหัสยืนยัน 8 หลัก หรือ 36 หลัก"
                disabled={binding}
                style={{
                  width: "100%",
                  background: "rgba(0, 0, 0, 0.25)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  fontSize: "14px",
                  color: "#ffffff",
                  boxSizing: "border-box",
                  fontFamily: "monospace",
                  letterSpacing: "0.2px",
                  outline: "none"
                }}
              />
            </div>

            {/* DYNAMIC RESOLVED ROOM INFO */}
            {resolvingRoom && (
              <div style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: "14px",
                padding: "16px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}>
                <div style={{
                  width: "18px",
                  height: "18px",
                  border: "2px solid rgba(255,255,255,0.1)",
                  borderTop: "2px solid #38ef7d",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}></div>
                <span style={{ fontSize: "13.5px", color: "#94a3b8" }}>กำลังดึงข้อมูลห้องพัก...</span>
              </div>
            )}

            {resolvedRoom && (
              <div style={{
                background: "rgba(56, 239, 125, 0.08)",
                border: "1px solid rgba(56, 239, 125, 0.2)",
                borderRadius: "16px",
                padding: "18px",
                marginBottom: "24px",
                textAlign: "left"
              }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#38ef7d", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  ✓ ข้อมูลห้องพักที่พบ
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                    <span style={{ color: "#94a3b8" }}>หอพัก</span>
                    <strong style={{ color: "#ffffff" }}>{resolvedRoom.dorm_name}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                    <span style={{ color: "#94a3b8" }}>หมายเลขห้อง</span>
                    <strong style={{ color: "#ffffff" }}>ห้อง {resolvedRoom.room_number}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                    <span style={{ color: "#94a3b8" }}>ผู้เช่า</span>
                    <strong style={{ color: "#ffffff" }}>{resolvedRoom.tenant_name}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* ERROR MSG */}
            {errorMsg && (
              <div style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "12px",
                padding: "12px",
                fontSize: "13px",
                color: "#f87171",
                textAlign: "left",
                marginBottom: "20px",
                lineHeight: "1.4"
              }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* ACTION BUTTONS */}
            <button
              onClick={handleBind}
              disabled={binding || resolvingRoom || !resolvedRoom || !lineUser}
              style={{
                width: "100%",
                background: (!resolvedRoom || !lineUser) 
                  ? "rgba(255,255,255,0.06)" 
                  : "linear-gradient(45deg, #11998e 0%, #38ef7d 100%)",
                color: (!resolvedRoom || !lineUser) ? "#64748b" : "#ffffff",
                border: "none",
                borderRadius: "14px",
                padding: "14px 20px",
                fontSize: "15px",
                fontWeight: "700",
                cursor: (!resolvedRoom || !lineUser || binding) ? "not-allowed" : "pointer",
                boxShadow: (!resolvedRoom || !lineUser) ? "none" : "0 8px 20px rgba(56, 239, 125, 0.2)",
                transition: "all 0.2s ease"
              }}
            >
              {binding ? "กำลังเชื่อมต่อข้อมูล..." : "ยืนยันการเชื่อมต่อ LINE"}
            </button>

            {resolvedRoom && (
              <div style={{ marginTop: "14px", fontSize: "12.5px", color: "#64748b" }}>
                * เมื่อเชื่อมต่อแล้ว บัญชีไลน์ด้านบนจะผูกเข้ากับห้องนี้ทันที
              </div>
            )}
          </div>
        )}
      </div>

      {/* Embedded CSS Animations */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
