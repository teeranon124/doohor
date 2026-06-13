"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useDorm } from "@/context/DormContext";

export default function LandingPage() {
  const router = useRouter();
  const { setRole, setTenantRoom } = useDorm();

  const handleAdminClick = () => {
    setTenantRoom(null);
    router.push("/admin/dashboard");
  };

  const handleTenantClick = () => {
    router.push("/tenant/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div id="landing">
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div className="land-logo">Dormy</div>
          <div className="land-sub">ระบบจัดการหอพัก</div>
        </div>
        <div className="land-cards">
          <div className="land-card" onClick={handleAdminClick}>
            <div className="lc-icon" style={{ background: "var(--gl)" }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="lc-title">ผู้ดูแลหอพัก</div>
              <div className="lc-desc">จัดการห้อง จดมิเตอร์ ออกบิล ดูรายรับ</div>
            </div>
          </div>
          
          <div className="land-card" onClick={handleTenantClick}>
            <div className="lc-icon" style={{ background: "var(--bl)" }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="var(--blue)" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <div className="lc-title">ผู้เช่า</div>
              <div className="lc-desc">ดูบิล ประวัติ และแจ้งซ่อม</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Toast wrap wrapper in case anything tries to call toast on landing */}
      <div id="toast-wrap"></div>
    </div>
  );
}
