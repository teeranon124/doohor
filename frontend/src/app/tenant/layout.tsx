"use client";

import React, { useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDorm } from "@/context/DormContext";
import Modals from "@/components/Modals";

function TenantLayoutInner({ children }: { children: React.ReactNode }) {
  const {
    role,
    setRole,
    tenantRoom,
    setTenantRoom,
    tenantRoomNumber,
    dorm,
    logout,
    activeModal,
    closeModal,
    modalData,
    loading
  } = useDorm();

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const directKey = searchParams.get("key"); // room uuid direct access key

  // Authenticate immediately if direct key is present in the URL
  useEffect(() => {
    const handleDirectAccess = async () => {
      if (directKey) {
        try {
          const { api } = await import("@/utils/api");
          const session = await api.getTenantSession(directKey);
          setRole("tenant");
          setTenantRoom(session.room_id);
          localStorage.setItem("dormy_role", "tenant");
          localStorage.setItem("dormy_tenant_room", session.room_id);
          localStorage.setItem("dormy_tenant_room_number", session.room_number);
          localStorage.setItem("dormy_tenant_dorm_id", session.dorm_id);
        } catch (err) {
          console.error("Direct access token invalid:", err);
        }
      }
    };
    handleDirectAccess();
  }, [directKey]);

  const isLoginPage = pathname === "/tenant/login";

  useEffect(() => {
    if (!loading && !directKey && role !== "tenant" && !isLoginPage) {
      router.push("/tenant/login");
    }
  }, [role, loading, directKey, isLoginPage]);

  if (isLoginPage) {
    return (
      <>
        {children}
        <div id="toast-wrap"></div>
      </>
    );
  }

  if (loading || (!directKey && role !== "tenant")) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f3ef" }}>
        <div style={{ fontFamily: "Sarabun, sans-serif", fontSize: "16px", color: "#6b6960" }}>
          กำลังโหลด...
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "t-home", lbl: "บิลของฉัน", path: "/tenant/home", ic: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { id: "t-history", lbl: "ประวัติ", path: "/tenant/history", ic: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "t-contract", lbl: "สัญญา", path: "/tenant/contract", ic: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { id: "t-repairs", lbl: "แจ้งซ่อม", path: "/tenant/repairs", ic: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  ];

  const handleSignOut = () => {
    logout();
    router.push("/");
  };

  const activeRoom = dorm?.rooms?.find((r: any) => r.uuid === tenantRoom || r.id === tenantRoomNumber) || { room_number: tenantRoomNumber || "", tenant_name: "ผู้เช่า" };
  const tenantName = activeRoom.tenant || activeRoom.tenant_name || "ผู้เช่า";

  return (
    <div id="app" style={{ display: "flex" }}>
      <nav className="navbar">
        <div className="nav-brand">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Dormy
        </div>
        <div className="nav-center">
          <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--green)" }}>
            ห้อง {activeRoom.id || tenantRoomNumber} — {tenantName}
          </span>
        </div>
        <div className="nav-r">
          <button className="btn-so" onClick={handleSignOut}>ออกจากระบบ</button>
        </div>
      </nav>

      {/* Tab Bar (Desktop) */}
      <div className="tab-bar">
        {tabs.map(t => {
          const isActive = pathname === t.path;
          return (
            <Link key={t.id} href={t.path + (directKey ? `?key=${directKey}` : "")} className={`tab-btn ${isActive ? "active" : ""}`}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={t.ic} />
              </svg>
              {t.lbl}
            </Link>
          );
        })}
      </div>

      <main style={{ paddingBottom: 80 }}>{children}</main>

      {/* Bottom Nav (Mobile) */}
      <div className="btm-nav">
        {tabs.map(t => {
          const isActive = pathname === t.path;
          return (
            <Link key={t.id} href={t.path + (directKey ? `?key=${directKey}` : "")} className={`bnav-btn ${isActive ? "active" : ""}`}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={t.ic} />
              </svg>
              <span>{t.lbl}</span>
            </Link>
          );
        })}
      </div>

      {/* Global Modals */}
      <Modals activeModal={activeModal} closeModal={closeModal} modalData={modalData} />

      {/* Toast Wrapper */}
      <div id="toast-wrap"></div>
    </div>
  );
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f3ef" }}>
        <div style={{ fontFamily: "Sarabun, sans-serif", fontSize: "16px", color: "#6b6960" }}>
          กำลังโหลด...
        </div>
      </div>
    }>
      <TenantLayoutInner>{children}</TenantLayoutInner>
    </Suspense>
  );
}
