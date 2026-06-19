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
      setErrorMsg("กรุณากรอกรหัสเข้าใช้งานห้องพักที่ถูกต้อง");
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
      background: "var(--bg)",
      fontFamily: "'Sarabun', sans-serif",
      color: "var(--text)",
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
          background: "var(--al)",
          border: "1px solid var(--amber)",
          color: "var(--amber)",
          fontSize: "12px",
          padding: "8px 16px",
          borderRadius: "30px",
          marginBottom: "20px",
          textAlign: "center",
          fontWeight: "600",
          boxShadow: "var(--sh)"
        }}>
          ⚠️ Simulation Mode: เปิดหน้าจอนอกแอป LINE
        </div>
      )}

      {/* Main Glassmorphic Container */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--rlg)",
        width: "100%",
        maxWidth: "400px",
        padding: "32px 24px",
        boxSizing: "border-box",
        boxShadow: "var(--shmd)",
        textAlign: "center"
      }}>
        
        {/* Brand Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{
            fontFamily: "'IBM Plex Sans Thai', sans-serif",
            fontSize: "28px",
            fontWeight: "700",
            color: "var(--green)",
            display: "inline-block",
            marginBottom: "6px"
          }}>
            ดูหอ (DooHor)
          </div>
          <div style={{ fontSize: "13px", color: "var(--t2)" }}>
            ระบบเชื่อมต่อ LINE เพื่อรับแจ้งเตือนบิลและใบเสร็จ
          </div>
        </div>

        {boundSuccess ? (
          /* SUCCESS SCREEN */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              width: "70px",
              height: "70px",
              background: "var(--gl)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
              border: "2px solid var(--green)"
            }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" style={{ width: "36px", height: "36px", color: "var(--green)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 10px 0", color: "var(--green)" }}>
              เชื่อมต่อสำเร็จแล้ว!
            </h3>
            <p style={{ fontSize: "14px", color: "var(--t2)", lineHeight: "1.6", margin: "0 0 24px 0", padding: "0 10px" }}>
              ระบบได้ผูกบัญชี LINE ของคุณกับข้อมูลห้องพักเรียบร้อยแล้ว ต่อจากนี้บิลแจ้งหนี้ประจำเดือนและใบเสร็จรับเงินจะถูกส่งถึงคุณผ่านแชท LINE ทันที
            </p>
            <button 
              onClick={() => {
                const redirectPath = searchParams.get("redirect") || `/tenant/home?key=${roomKey}`;
                router.push(redirectPath);
              }}
              className="btn bp"
              style={{
                width: "100%",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: "700"
              }}
            >
              เข้าสู่บริการของผู้เช่า
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
                  border: "3px solid var(--border)",
                  borderTop: "3px solid var(--green)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 10px auto"
                }}></div>
                <div style={{ fontSize: "13px", color: "var(--t3)" }}>กำลังดึงข้อมูล LINE...</div>
              </div>
            ) : lineUser ? (
              <div style={{
                background: "var(--s2)",
                padding: "14px",
                borderRadius: "var(--r)",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                border: "1px solid var(--border)",
                textAlign: "left"
              }}>
                <img 
                  src={lineUser.pictureUrl} 
                  alt={lineUser.displayName} 
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    border: "2px solid var(--green)",
                    background: "var(--surface)"
                  }}
                />
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: "11px", color: "var(--t2)", fontWeight: "600" }}>บัญชี LINE ที่เชื่อมต่อ</div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lineUser.displayName}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Simulation controls */}
            {isSimulation && lineUser && (
              <div style={{
                background: "var(--s2)",
                padding: "12px",
                borderRadius: "var(--r)",
                fontSize: "12px",
                marginBottom: "20px",
                textAlign: "left",
                border: "1px dashed var(--border)"
              }}>
                <label style={{ display: "block", color: "var(--t2)", marginBottom: "4px" }}>จำลอง LINE User ID:</label>
                <input 
                  type="text" 
                  value={customLineId || lineUser.userId}
                  onChange={(e) => setCustomLineId(e.target.value)}
                  placeholder="ป้อน Line ID ทดสอบ"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
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
                color: "var(--text)",
                marginBottom: "8px"
              }}>
                รหัสเข้าใช้งานห้องพัก (Room Key)
              </label>
              <input 
                type="text"
                maxLength={36}
                value={roomKey}
                onChange={(e) => handleKeyInput(e.target.value)}
                placeholder="กรอกรหัสเข้าใช้งานห้องพัก 36 หลัก"
                disabled={binding}
                className="inp"
                style={{
                  width: "100%",
                  fontFamily: "monospace",
                  letterSpacing: "0.2px",
                  outline: "none"
                }}
              />
            </div>

            {/* DYNAMIC RESOLVED ROOM INFO */}
            {resolvingRoom && (
              <div style={{
                background: "var(--s2)",
                borderRadius: "var(--r)",
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
                  border: "2px solid var(--border)",
                  borderTop: "2px solid var(--green)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}></div>
                <span style={{ fontSize: "13.5px", color: "var(--t3)" }}>กำลังดึงข้อมูลห้องพัก...</span>
              </div>
            )}

            {resolvedRoom && (
              <div style={{
                background: "var(--gl)",
                border: "1px solid var(--gm)",
                borderRadius: "var(--r)",
                padding: "18px",
                marginBottom: "24px",
                textAlign: "left"
              }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--green)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  ✓ ข้อมูลห้องพักที่พบ
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                    <span style={{ color: "var(--t2)" }}>หอพัก</span>
                    <strong style={{ color: "var(--text)" }}>{resolvedRoom.dorm_name}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                    <span style={{ color: "var(--t2)" }}>หมายเลขห้อง</span>
                    <strong style={{ color: "var(--text)" }}>ห้อง {resolvedRoom.room_number}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                    <span style={{ color: "var(--t2)" }}>ผู้เช่า</span>
                    <strong style={{ color: "var(--text)" }}>{resolvedRoom.tenant_name}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* ERROR MSG */}
            {errorMsg && (
              <div style={{
                background: "var(--rl)",
                border: "1px solid var(--red)",
                borderRadius: "var(--r)",
                padding: "12px",
                fontSize: "13px",
                color: "var(--red)",
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
              className="btn bp"
              style={{
                width: "100%",
                padding: "14px 20px",
                fontSize: "15px",
                fontWeight: "700",
                cursor: (!resolvedRoom || !lineUser || binding) ? "not-allowed" : "pointer"
              }}
            >
              {binding ? "กำลังเชื่อมต่อข้อมูล..." : "ยืนยันการเชื่อมต่อ LINE"}
            </button>

            {resolvedRoom && (
              <div style={{ marginTop: "14px", fontSize: "12.5px", color: "var(--t3)" }}>
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
