"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/utils/api";
import { useDorm } from "@/context/DormContext";
import Script from "next/script";

declare global {
  interface Window {
    liff: any;
  }
}

// Shared initialization promise to prevent multiple concurrent calls to liff.init
let liffInitPromise: Promise<void> | null = null;

export default function TenantLiffPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setRole, setTenantRoom, toast } = useDorm();

  const mode = searchParams.get("mode") || "";
  const token = searchParams.get("token") || "";

  // States
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState("กำลังเชื่อมต่อ LINE...");
  const [isSimulation, setIsSimulation] = useState(false);
  const [simLineId, setSimLineId] = useState("Utest_line_user_12345");
  const [errorMsg, setErrorMsg] = useState("");
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Refs to prevent duplicate executions
  const checkBindingCalled = useRef(false);
  const adminBindCalled = useRef(false);

  const addLog = useCallback((msg: string) => {
    console.log(msg);
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  const setupSimulation = useCallback(() => {
    addLog("setupSimulation triggered");
    setIsSimulation(true);
    setLoading(false);
    setStatusText("เปิดอยู่นอกแอป LINE — เข้าสู่โหมดจำลอง (Sandbox)");
  }, [addLog]);

  const handleAdminBind = useCallback(async (lineUserId: string, bindToken: string) => {
    if (adminBindCalled.current) return;
    adminBindCalled.current = true;
    addLog("Initiating admin 1-Click Connect for LINE User ID: " + lineUserId);
    setStatusText("กำลังเชื่อมต่อบัญชีเจ้าของหอพัก...");
    try {
      await api.bindAdminLineDirect(lineUserId, bindToken);
      addLog("Admin bind direct successful!");
      
      setRole("admin");
      localStorage.setItem("dormy_role", "admin");
      document.cookie = `dormy_admin_token=${bindToken}; path=/; max-age=2592000; Secure; SameSite=Lax`;
      
      toast("ผูกบัญชีเจ้าของหอพักกับ LINE สำเร็จแล้ว!", "success");
      router.push("/admin/dashboard");
    } catch (err: any) {
      addLog("Admin bind failed: " + (err.message || JSON.stringify(err)));
      toast("ผูกบัญชีไม่สำเร็จ: " + (err.message || "โทเค็นไม่ถูกต้องหรือหมดอายุ"), "error");
      setupSimulation();
    }
  }, [router, setRole, toast, addLog, setupSimulation]);

  const getRedirectPath = useCallback(() => {
    if (typeof window === "undefined") return "";
    const path = window.location.pathname.replace(/^\/tenant\/liff/, "");
    return path && path !== "/" ? path : "";
  }, []);

  const checkBinding = useCallback(async (lineUserId: string) => {
    if (checkBindingCalled.current) {
      addLog("checkBinding already called, skipping duplicate execution");
      return;
    }
    checkBindingCalled.current = true;
    addLog("Checking binding in DB for lineUserId: " + lineUserId);
    try {
      const session = await api.getLineSession(lineUserId);
      addLog("Binding check successful! Role: " + session.role);
      
      if (session.role === "admin") {
        setRole("admin");
        localStorage.setItem("dormy_role", "admin");
        if (session.session_token) {
          document.cookie = `dormy_admin_token=${session.session_token}; path=/; max-age=2592000; Secure; SameSite=Lax`;
        }
        toast("ยินดีต้อนรับกลับ เจ้าของหอพัก! เข้าสู่ระบบสำเร็จ", "success");
        router.push("/admin/dashboard");
      } else {
        setRole("tenant");
        setTenantRoom(session.room_id);
        localStorage.setItem("dormy_role", "tenant");
        localStorage.setItem("dormy_tenant_room", session.room_id);
        localStorage.setItem("dormy_tenant_room_number", session.room_number);
        localStorage.setItem("dormy_tenant_dorm_id", session.dorm_id);
        
        toast("ยินดีต้อนรับกลับ! เข้าสู่ระบบอัตโนมัติสำเร็จ", "success");
        
        const target = getRedirectPath();
        if (target) {
          router.push(target);
        } else {
          router.push(`/tenant/home?key=${session.room_id}`);
        }
      }
    } catch (err: any) {
      addLog("Binding check failed/unbound: " + (err?.message || JSON.stringify(err)));
      toast("ยังไม่ได้ผูกบัญชี LINE กับระบบ กรุณาลงทะเบียน", "info");
      
      const inviteKey = searchParams.get("key") || "";
      const target = getRedirectPath();
      const redirectParam = target ? `&redirect=${encodeURIComponent(target)}` : "";
      
      if (inviteKey) {
        router.push(`/tenant/bind-line?key=${inviteKey}${redirectParam}`);
      } else {
        router.push(redirectParam ? `/tenant/bind-line?${redirectParam.substring(1)}` : "/tenant/bind-line");
      }
    }
  }, [router, searchParams, setRole, setTenantRoom, toast, addLog, getRedirectPath]);

  const handleLiffInit = useCallback(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";
    addLog("handleLiffInit start. LIFF_ID: " + liffId + " | Mode: " + mode);

    if (typeof window === "undefined") {
      addLog("window is undefined, aborting");
      return;
    }

    if (window.liff) {
      if (!liffId || liffId === "mock-liff-id") {
        addLog("LIFF ID is invalid or empty, entering simulation");
        setupSimulation();
        return;
      }

      if (!liffInitPromise) {
        addLog("Calling window.liff.init...");
        liffInitPromise = window.liff.init({ liffId });
      } else {
        addLog("window.liff.init call already in progress or completed, reusing promise...");
      }

      liffInitPromise!
        .then(() => {
          addLog("window.liff.init resolved successfully!");
          if (!window.liff.isLoggedIn()) {
            addLog("User is not logged in. Calling liff.login...");
            setStatusText("กำลังเปิด LINE Login...");
            window.liff.login();
          } else {
            addLog("User is logged in. Calling liff.getProfile...");
            setStatusText("กำลังดึงข้อมูลโปรไฟล์ LINE...");
            window.liff
              .getProfile()
              .then((profile: any) => {
                addLog("liff.getProfile resolved! userId: " + profile.userId);
                if (mode === "admin-bind" && token) {
                  handleAdminBind(profile.userId, token);
                } else {
                  setStatusText("กำลังตรวจสอบสถานะการลงทะเบียน...");
                  checkBinding(profile.userId);
                }
              })
              .catch((err: any) => {
                addLog("liff.getProfile rejected: " + (err?.message || JSON.stringify(err)));
                setupSimulation();
              });
          }
        })
        .catch((err: any) => {
          addLog("window.liff.init rejected! error: " + (err?.message || JSON.stringify(err)));
          liffInitPromise = null; // Reset on error to allow retries
          setupSimulation();
        });
    } else {
      addLog("window.liff is not defined!");
      setupSimulation();
    }
  }, [checkBinding, handleAdminBind, mode, token, setupSimulation, addLog]);

  const handleLiffError = useCallback(() => {
    addLog("LIFF script loading failed!");
    setupSimulation();
  }, [setupSimulation, addLog]);
  // Handle case where LIFF is already loaded when page mounts
  useEffect(() => {
    addLog("Component mounted. window.liff: " + (typeof window !== "undefined" && !!window.liff));
    if (typeof window !== "undefined" && window.liff) {
      addLog("window.liff already exists, calling handleLiffInit");
      handleLiffInit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSimulateLogin = async () => {
    if (!simLineId.trim()) {
      setErrorMsg("กรุณากรอก Line User ID จำลอง");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setStatusText(`กำลังทดสอบการเข้าใช้งานของ LINE ID: ${simLineId}`);
    try {
      const session = await api.getTenantSessionByLineId(simLineId.trim());
      
      setRole("tenant");
      setTenantRoom(session.room_id);
      localStorage.setItem("dormy_role", "tenant");
      localStorage.setItem("dormy_tenant_room", session.room_id);
      localStorage.setItem("dormy_tenant_room_number", session.room_number);
      localStorage.setItem("dormy_tenant_dorm_id", session.dorm_id);
      
      toast("จำลองเข้าสู่ระบบสำเร็จ (พบบัญชีที่ผูกไว้)", "success");
      
      const target = getRedirectPath();
      if (target) {
        router.push(target);
      } else {
        router.push(`/tenant/home?key=${session.room_id}`);
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(`ไม่พบบัญชีผู้เช่าที่ผูกกับ LINE ID: "${simLineId}" (ระบบจะพาไปหน้าผูกบัญชี)`);
    }
  };

  const handleSimulateBindRedirect = () => {
    const target = getRedirectPath();
    const redirectParam = target ? `?redirect=${encodeURIComponent(target)}` : "";
    router.push(`/tenant/bind-line${redirectParam}`);
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
        
        {/* Logo Icon */}
        <div style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "var(--gl)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px auto",
          border: "2px solid var(--green)"
        }}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: "30px", height: "30px", color: "var(--green)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>

        <div style={{
          fontFamily: "'IBM Plex Sans Thai', sans-serif",
          fontSize: "24px",
          fontWeight: "700",
          color: "var(--green)",
          marginBottom: "8px"
        }}>
          ดูหอ (DooHor) LINE Connect
        </div>

        {loading ? (
          <div style={{ margin: "30px 0" }}>
            <div style={{
              width: "36px",
              height: "36px",
              border: "3px solid var(--border)",
              borderTop: "3px solid var(--green)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px auto"
            }}></div>
            <div style={{ fontSize: "14px", color: "var(--t2)", fontWeight: "500" }}>{statusText}</div>
          </div>
        ) : (
          /* Sandbox Simulation Mode Page */
          <div style={{ marginTop: "20px", textAlign: "left" }}>
            <div style={{
              background: "var(--al)",
              border: "1px solid var(--amber)",
              color: "var(--amber)",
              fontSize: "12.5px",
              padding: "10px 14px",
              borderRadius: "12px",
              marginBottom: "20px",
              lineHeight: "1.5",
              fontWeight: "500"
            }}>
              ⚠️ <strong>Developer Sandbox:</strong> หน้านี้เปิดนอก LINE App ระบบจึงจำลองพฤติกรรมของ LINE LIFF เพื่อให้ทดสอบระบบได้ง่ายขึ้น
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text)", marginBottom: "6px" }}>
                จำลอง LINE User ID (สำหรับสแกนหาผู้เช่า)
              </label>
              <input 
                type="text"
                value={simLineId}
                onChange={(e) => setSimLineId(e.target.value)}
                placeholder="กรอก LINE ID ที่ผูกไว้แล้ว เช่น Utest_..."
                style={{
                  width: "100%",
                  background: "var(--s2)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  color: "var(--text)",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  boxSizing: "border-box",
                  outline: "none"
                }}
              />
            </div>

            {errorMsg && (
              <div style={{
                background: "var(--rl)",
                border: "1px solid var(--red)",
                color: "var(--red)",
                padding: "10px",
                fontSize: "12px",
                borderRadius: "10px",
                marginBottom: "16px",
                lineHeight: "1.4"
              }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button 
                onClick={handleSimulateLogin}
                className="btn bp"
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  fontWeight: "700"
                }}
              >
                จำลองกรณี: บัญชี LINE นี้ผูกห้องไว้แล้ว (Auto-Login)
              </button>

              <button 
                onClick={handleSimulateBindRedirect}
                className="btn bg"
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  fontWeight: "600"
                }}
              >
                จำลองกรณี: บัญชี LINE นี้ยังไม่ได้ลงทะเบียน (ไปยังหน้าผูกบัญชี)
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Debug Logs */}
      <div style={{
        marginTop: "20px",
        width: "100%",
        maxWidth: "400px",
        background: "var(--s2)",
        padding: "12px",
        borderRadius: "16px",
        fontSize: "11px",
        fontFamily: "monospace",
        color: "var(--t2)",
        border: "1px solid var(--border)",
        boxSizing: "border-box"
      }}>
        <div style={{ fontWeight: "bold", marginBottom: "6px", color: "var(--text)" }}>Debug Logs:</div>
        <div style={{ maxHeight: "150px", overflowY: "auto" }}>
          {debugLogs.length === 0 ? (
            <div style={{ color: "var(--t3)" }}>No logs yet...</div>
          ) : (
            debugLogs.map((log, idx) => (
              <div key={idx} style={{ marginBottom: "2px", whiteSpace: "pre-wrap" }}>{log}</div>
            ))
          )}
        </div>
      </div>

      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        onLoad={handleLiffInit}
        onError={handleLiffError}
      />

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
