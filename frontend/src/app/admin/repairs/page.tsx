"use client";

import React, { useState } from "react";
import { useDorm } from "@/context/DormContext";
import { api } from "@/utils/api";

export default function AdminRepairsPage() {
  const { dorm, reloadDorm, toast, data, setData } = useDorm();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  if (!dorm) {
    return <div className="empty">ไม่พบข้อมูลหอพัก</div>;
  }

  const repairs = dorm.repairs || [];
  const pend = repairs.filter((r: any) => r.status === "pending");
  const done = repairs.filter((r: any) => r.status === "completed");

  const handleResolve = async (id: string, roomNumber: string) => {
    setResolvingId(id);
    try {
      // 1. Try API call
      await api.updateRepair(id, { status: "completed" });
      toast(`บันทึกการซ่อมห้อง ${roomNumber} เรียบร้อย`, "success");
      await reloadDorm();
    } catch (err) {
      console.warn("API update repair failed, falling back to local:", err);
      // 2. Local fallback
      const updatedDorms = data.dorms.map((d: any) => {
        if (d.id === dorm.id) {
          const updatedRepairs = d.repairs.map((r: any) => {
            if (r.id === id) {
              return { ...r, status: "completed" };
            }
            return r;
          });
          return { ...d, repairs: updatedRepairs };
        }
        return d;
      });
      setData({ ...data, dorms: updatedDorms });
      toast(`บันทึกการซ่อมห้อง ${roomNumber} เรียบร้อย`, "success");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <>
      <div className="mb5">
        <div className="pg-title">แจ้งซ่อม</div>
        <div className="pg-sub">รายการปัญหาจากผู้เช่า</div>
      </div>

      {pend.length > 0 ? (
        <>
          <div className="sec-lbl">รอดำเนินการ ({pend.length})</div>
          <div className="sy mb5">
            {pend.map((r: any) => (
              <div key={r.id} className="li" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                <div className="flex jcsb aic">
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "15px" }}>ห้อง {r.room}</span>
                    <span style={{ fontSize: "11px", color: "var(--t3)", marginLeft: 8 }}>{r.date}</span>
                  </div>
                  <span className="badge b-r">รอดำเนินการ</span>
                </div>
                <div style={{ fontSize: "13.5px", color: "var(--text)", margin: "4px 0" }}>
                  {r.issue}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="btn bp bsm"
                    disabled={resolvingId === r.id}
                    onClick={() => handleResolve(r.id, r.room)}
                  >
                    ซ่อมเสร็จแล้ว
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="alert al-ok mb5">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 16, height: 16, marginRight: 8, display: "inline-block", verticalAlign: "middle" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ไม่มีรายการค้างซ่อม
        </div>
      )}

      {done.length > 0 && (
        <>
          <div className="sec-lbl">ดำเนินการเสร็จแล้ว</div>
          <div className="sy">
            {done.map((r: any) => (
              <div key={r.id} className="li" style={{ opacity: 0.75 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>
                    ห้อง {r.room}{" "}
                    <span style={{ fontWeight: 400, color: "var(--t3)", fontSize: "11px", marginLeft: 6 }}>
                      {r.date}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--t2)", marginTop: 2 }}>{r.issue}</div>
                </div>
                <span className="badge b-g" style={{ fontSize: "9px", padding: "1px 6px" }}>
                  เสร็จสิ้น
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
