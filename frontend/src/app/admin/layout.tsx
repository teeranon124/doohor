"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDorm } from "@/context/DormContext";
import { api } from "@/utils/api";
import Modals from "@/components/Modals";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const {
    data,
    dorm,
    activeDormId,
    switchDorm,
    role,
    logout,
    openModal,
    activeModal,
    closeModal,
    modalData,
    loading
  } = useDorm();

  const pathname = usePathname();
  const router = useRouter();
  const [isDormDropOpen, setIsDormDropOpen] = useState(false);

  // Redirect to landing if not logged in as admin
  useEffect(() => {
    if (!loading && role !== "admin") {
      router.push("/");
    }
  }, [role, loading]);

  if (loading || role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f3ef" }}>
        <div style={{ fontFamily: "Sarabun, sans-serif", fontSize: "16px", color: "#6b6960" }}>
          กำลังโหลด...
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", lbl: "ภาพรวม", path: "/admin/dashboard", ic: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
    { id: "rooms", lbl: "ห้องพัก", path: "/admin/rooms", ic: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { id: "meter", lbl: "จดมิเตอร์+บิล", path: "/admin/meter", ic: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { id: "billing", lbl: "บิลและการชำระ", path: "/admin/billing", ic: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { id: "repairs", lbl: "แจ้งซ่อม", path: "/admin/repairs", ic: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" },
    { id: "settings", lbl: "ตั้งค่า", path: "/admin/settings", ic: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" },
  ];

  const handleSignOut = () => {
    logout();
    router.push("/");
  };

  const currentDorm = dorm || (data?.dorms && data.dorms.find((x: any) => x.id === activeDormId)) || { name: "กำลังโหลด..." };

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
          <div className="dorm-switcher" onClick={() => setIsDormDropOpen(true)}>
            <div className="dorm-name">{currentDorm.name}</div>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
        </div>
        <div className="nav-r">
          <span className="nav-user">ผู้ดูแล</span>
          <button className="btn-so" onClick={handleSignOut}>ออกจากระบบ</button>
        </div>
      </nav>

      {/* Dorm Selector Dropdown Overlay */}
      <div className={`dorm-overlay ${isDormDropOpen ? "open" : ""}`} onClick={() => setIsDormDropOpen(false)}>
        <div className="dorm-drop" onClick={e => e.stopPropagation()}>
          <div className="dorm-drop-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            หอพักของคุณ
            <button onClick={() => setIsDormDropOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", padding: 4 }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {(data?.dorms || []).map((dd: any) => (
            <div key={dd.id} className={`dorm-item ${dd.id === activeDormId ? "active" : ""}`} onClick={() => { switchDorm(dd.id); setIsDormDropOpen(false); }}>
              <div className="dorm-item-ico">{dd.name.charAt(0)}</div>
              <div>
                <div className="dorm-item-name">{dd.name}</div>
                <div className="dorm-item-sub">{(dd.rooms || []).length} ห้อง &bull; {(dd.rooms || []).filter((r: any) => r.status === "occupied").length} มีผู้เช่า</div>
              </div>
            </div>
          ))}
          <div className="dorm-add-btn" onClick={() => { setIsDormDropOpen(false); openModal("m-add-dorm"); }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มหอพักใหม่
          </div>
        </div>
      </div>

      {/* Tab Bar (Desktop) */}
      <div className="tab-bar">
        {tabs.map(t => {
          const isActive = pathname === t.path;
          return (
            <Link key={t.id} href={t.path} className={`tab-btn ${isActive ? "active" : ""}`}>
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
            <Link key={t.id} href={t.path} className={`bnav-btn ${isActive ? "active" : ""}`}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={t.ic} />
              </svg>
              <span>{t.lbl}</span>
            </Link>
          );
        })}
      </div>

      {/* Global Admin Modals */}
      <Modals activeModal={activeModal} closeModal={closeModal} modalData={modalData} />
      
      {/* Toast Wrapper */}
      <div id="toast-wrap"></div>
    </div>
  );
}
