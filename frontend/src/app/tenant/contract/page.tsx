"use client";

import React from "react";
import { useDorm } from "@/context/DormContext";

export default function TenantContractPage() {
  const { tenantRoom, tenantRoomNumber, dorm } = useDorm();

  const activeRoom = dorm?.rooms?.find(
    (r: any) => r.uuid === tenantRoom || r.id === tenantRoomNumber
  );

  if (!activeRoom) {
    return <div className="empty">ไม่พบข้อมูลสัญญาเช่า</div>;
  }

  const contractDaysLeft = (endStr: string) => {
    if (!endStr) return null;
    const parts = endStr.split("/");
    if (parts.length !== 3) return null;
    const d = new Date(parseInt(parts[2]) - 543, parseInt(parts[1]) - 1, parseInt(parts[0]));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - now.getTime()) / 86400000);
  };

  const daysLeft = contractDaysLeft(activeRoom.contractEnd);

  return (
    <>
      <div className="mb5">
        <div className="pg-title">สัญญาเช่าของฉัน</div>
        <div className="pg-sub">รายละเอียดและข้อตกลงในการเช่าพักอาศัย</div>
      </div>

      <div className="card mb5">
        <div className="cp">
          <div className="s-section">
            <div className="s-title">ข้อตกลงทั่วไป</div>
            <div className="tc-row">
              <span className="tc-label">หมายเลขห้อง</span>
              <span className="tc-val">ห้อง {activeRoom.id}</span>
            </div>
            <div className="tc-row">
              <span className="tc-label">ประเภทห้อง</span>
              <span className="tc-val">{activeRoom.type || "Standard"}</span>
            </div>
            <div className="tc-row">
              <span className="tc-label">ผู้เช่าหลัก</span>
              <span className="tc-val">{activeRoom.tenant || "ไม่มีข้อมูล"}</span>
            </div>
            <div className="tc-row">
              <span className="tc-label">อัตราค่าเช่ารายเดือน</span>
              <span className="tc-val" style={{ color: "var(--green)" }}>
                ฿{(activeRoom.rentPrice || 0).toLocaleString()} / เดือน
              </span>
            </div>
          </div>

          <div className="s-section">
            <div className="s-title">ระยะเวลาตามสัญญาเช่า</div>
            <div className="tc-row">
              <span className="tc-label">วันที่เข้าอยู่</span>
              <span className="tc-val">{activeRoom.moveInDate || "—"}</span>
            </div>
            <div className="tc-row">
              <span className="tc-label">วันเริ่มสัญญาเช่า</span>
              <span className="tc-val">{activeRoom.contractStart || "—"}</span>
            </div>
            <div className="tc-row">
              <span className="tc-label">วันสิ้นสุดสัญญาเช่า</span>
              <span className="tc-val">{activeRoom.contractEnd || "—"}</span>
            </div>
          </div>

          <div className="s-section">
            <div className="s-title">เงินมัดจำและการค้ำประกัน</div>
            <div className="tc-row">
              <span className="tc-label">เงินมัดจำหอพัก</span>
              <span className="tc-val">฿{(activeRoom.depositAmount || 0).toLocaleString()}</span>
            </div>
            <div className="tc-row">
              <span className="tc-label">สถานะมัดจำ</span>
              <span className="tc-val">
                <span className={`badge ${activeRoom.depositStatus === "held" ? "b-g" : "b-gray"}`}>
                  {activeRoom.depositStatus === "held" ? "ผู้ดูแลถือไว้" : "คืนเงินแล้ว"}
                </span>
              </span>
            </div>
            {activeRoom.depositNote && (
              <div style={{ fontSize: "12px", color: "var(--t2)", marginTop: 8, padding: "6px 10px", background: "var(--s2)", borderRadius: 6 }}>
                บันทึกเพิ่มเติม: {activeRoom.depositNote}
              </div>
            )}
          </div>

          {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && (
            <div className="contract-bar warn">
              สัญญาเช่าของคุณเหลือเวลาอีก <strong>{daysLeft} วัน</strong> จะหมดอายุ กรุณาติดต่อผู้ดูแลเพื่อแจ้งต่อสัญญาเช่า
            </div>
          )}
          {daysLeft !== null && daysLeft > 30 && (
            <div className="contract-bar">
              สัญญาเช่าของคุณมีผลใช้ได้ตามปกติ (เหลือระยะเวลา <strong>{daysLeft} วัน</strong>)
            </div>
          )}
        </div>
      </div>
    </>
  );
}
