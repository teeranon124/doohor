"use client";

import React from "react";
import { useDorm } from "@/context/DormContext";
import Link from "next/link";

export default function AdminDashboard() {
  const { dorm } = useDorm();

  const occ = dorm?.rooms ? dorm.rooms.filter((r: any) => r.status === "occupied").length : 0;
  const total = dorm?.rooms ? dorm.rooms.length : 0;
  
  const unpaidBills = dorm?.bills ? dorm.bills.filter((b: any) => b.status === "unpaid" || b.status === "pending_approval") : [];
  const pendingIncome = unpaidBills.reduce((s: number, b: any) => s + (b.total || 0), 0);
  
  const pendingRepairs = dorm?.repairs ? dorm.repairs.filter((r: any) => r.status === "pending").length : 0;
  
  // Expiry checks
  const contractDaysLeft = (endStr: string) => {
    if (!endStr) return null;
    const parts = endStr.split("/");
    if (parts.length !== 3) return null;
    const d = new Date(parseInt(parts[2]) - 543, parseInt(parts[1]) - 1, parseInt(parts[0]));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - now.getTime()) / 86400000);
  };

  const expiring = dorm?.rooms
    ? dorm.rooms.filter((r: any) => {
        const d = contractDaysLeft(r.contractEnd);
        return d !== null && d >= 0 && d <= 30;
      })
    : [];

  const recentRooms = dorm?.rooms ? dorm.rooms.slice(0, 5) : [];

  return (
    <>
      <div className="flex aic jcsb mb5" style={{ flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div className="pg-title">ภาพรวม</div>
          <div className="pg-sub">{dorm?.name || "Dormy"}</div>
        </div>
      </div>

      <div className="sgrid mb5">
        <div className="stat g">
          <div className="stat-lbl">ห้องมีผู้เช่า</div>
          <div className="stat-val">
            {occ}
            <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--t2)" }}>/{total}</span>
          </div>
        </div>
        <div className="stat a">
          <div className="stat-lbl">รายรับรอเก็บ</div>
          <div className="stat-val" style={{ fontSize: "16px" }}>
            ฿{pendingIncome.toLocaleString()}
          </div>
        </div>
        <div className={`stat ${pendingRepairs > 0 ? "r" : ""}`}>
          <div className="stat-lbl">รอซ่อม</div>
          <div className="stat-val">{pendingRepairs}</div>
        </div>
      </div>

      {expiring.length > 0 && (
        <div className="mb5">
          <div className="sec-lbl">สัญญาใกล้หมด ({expiring.length} ห้อง)</div>
          <div className="sy">
            {expiring.map((r: any) => {
              const d = contractDaysLeft(r.contractEnd)!;
              return (
                <div key={r.id} className={`alert ${d <= 7 ? "al-red" : d <= 14 ? "al-warn" : "al-info"}`}>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <strong>ห้อง {r.id}</strong> — {r.tenant || ""} &bull; สัญญาหมด {r.contractEnd} <strong>(อีก {d} วัน)</strong>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="sec-lbl">สถานะห้องพัก</div>
        <div className="sy">
          {recentRooms.map((room: any) => {
            const d = contractDaysLeft(room.contractEnd);
            const cw = d !== null && d >= 0 && d <= 30;
            return (
              <div key={room.id} className="li">
                <div className="li-ico" style={{ background: room.status === "occupied" ? "var(--gl)" : "var(--s2)" }}>
                  <svg fill="none" viewBox="0 0 24 24" stroke={room.status === "occupied" ? "var(--green)" : "var(--t3)"} style={{ width: 17, height: 17 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>
                    ห้อง {room.id}{" "}
                    <span style={{ fontWeight: 400, color: "var(--t2)", fontSize: "12px" }}>
                      {room.type || ""} &bull; ฿{(room.rentPrice || 0).toLocaleString()}/เดือน
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--t2)" }}>{room.tenant || "ว่าง"}</div>
                  {cw && (
                    <div style={{ fontSize: "11px", color: "var(--amber)", marginTop: "2px" }}>
                      สัญญาหมด {room.contractEnd} (อีก {d} วัน)
                    </div>
                  )}
                </div>
                <span className={`badge ${room.status === "occupied" ? "b-g" : "b-gray"}`}>
                  {room.status === "occupied" ? "มีผู้เช่า" : "ว่าง"}
                </span>
              </div>
            );
          })}
          {total > 5 && (
            <div style={{ textAlign: "center", padding: "12px" }}>
              <Link href="/admin/rooms" className="btn bg bsm">
                ดูทั้งหมด {total} ห้อง
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
