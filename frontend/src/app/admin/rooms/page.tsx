"use client";

import React from "react";
import { useDorm } from "@/context/DormContext";

export default function AdminRoomsPage() {
  const { dorm, openModal } = useDorm();

  if (!dorm) {
    return <div className="empty">ไม่พบข้อมูลหอพัก</div>;
  }

  const rooms = dorm.rooms || [];
  const occ = rooms.filter((r: any) => r.status === "occupied").length;

  // Group rooms by floor
  const floors: Record<string, any[]> = {};
  rooms.forEach((r: any) => {
    const match = String(r.id).match(/^(\d)/);
    const floor = match ? match[1] : "0";
    if (!floors[floor]) floors[floor] = [];
    floors[floor].push(r);
  });

  const sortedFloors = Object.keys(floors).sort((a, b) => parseInt(a) - parseInt(b));

  const contractDaysLeft = (endStr: string) => {
    if (!endStr) return null;
    const parts = endStr.split("/");
    if (parts.length !== 3) return null;
    const d = new Date(parseInt(parts[2]) - 543, parseInt(parts[1]) - 1, parseInt(parts[0]));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - now.getTime()) / 86400000);
  };

  return (
    <>
      <div className="flex aic jcsb mb5" style={{ flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div className="pg-title">ห้องพักทั้งหมด</div>
          <div className="pg-sub">{rooms.length} ห้อง / มีผู้เช่า {occ} ห้อง</div>
        </div>
        <button className="btn bp bsm" onClick={() => openModal("m-add-room")}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, marginRight: 4 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          เพิ่มห้อง
        </button>
      </div>

      {sortedFloors.map((floor) => {
        const floorRooms = floors[floor].sort((a, b) => a.id.localeCompare(b.id));
        const occupiedCount = floorRooms.filter((r: any) => r.status === "occupied").length;

        return (
          <div key={floor} className="floor-section">
            <div className="floor-header">
              <div className="floor-number">ชั้น {floor}</div>
              <span className="floor-badge">{occupiedCount}/{floorRooms.length} ห้อง</span>
            </div>
            <div className="rooms-grid">
              {floorRooms.map((r: any) => {
                const isOcc = r.status === "occupied";
                const d = contractDaysLeft(r.contractEnd);
                const cw = d !== null && d >= 0 && d <= 30;

                return (
                  <div key={r.id} className={`room-card ${isOcc ? "occupied" : "vacant"}`}>
                    <div className="room-header">
                      <span className="room-id">{r.id}</span>
                      <span className={`room-status-dot ${isOcc ? "" : "vacant"}`}></span>
                    </div>
                    <div className="room-body" style={{ display: "flex", flexDirection: "column" }}>
                      <div className="room-tenant">{isOcc ? (r.tenant || "ไม่มีชื่อ") : "ว่าง"}</div>
                      <div className="room-type">{r.type || "Standard"}</div>
                      <div className="room-price">฿{(r.rentPrice || 0).toLocaleString()}</div>
                      <div className="room-meta">
                        <span className="room-badge">{isOcc ? "มีผู้เช่า" : "ว่าง"}</span>
                        {cw && <span className="room-badge" style={{ background: "var(--al)", color: "var(--amber)" }}>ใกล้หมด</span>}
                      </div>
                      {r.depositStatus === "held" && (
                        <div className="room-deposit">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          มัดจำ ฿{(r.depositAmount || 0).toLocaleString()}
                        </div>
                      )}
                    </div>
                    {isOcc ? (
                      <div className="room-actions" style={{ padding: "0 14px 14px 14px", display: "flex", gap: "6px" }}>
                        <button className="btn bp bsm f1" onClick={() => openModal("m-tenant", { roomId: r.id, mode: "edit" })}>แก้ไข</button>
                        <button className="btn bg bsm f1" onClick={() => openModal("m-deposit", { roomId: r.id })}>มัดจำ</button>
                      </div>
                    ) : (
                      <div className="room-actions" style={{ padding: "0 14px 14px 14px", display: "flex", gap: "6px" }}>
                        <button className="btn bg bsm f1" onClick={() => openModal("m-tenant", { roomId: r.id, mode: "edit" })}>แก้ไข</button>
                        <button className="btn bg bsm f1" style={{ borderStyle: "dashed", color: "var(--green)", paddingLeft: "8px", paddingRight: "8px" }} onClick={() => openModal("m-tenant", { roomId: r.id, mode: "checkin" })}>
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, marginRight: "-2px" }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          รับ
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
