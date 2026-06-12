"use client";

import React, { useState } from "react";
import { useDorm } from "@/context/DormContext";
import { api } from "@/utils/api";

export default function TenantRepairsPage() {
  const { tenantRoom, tenantRoomNumber, dorm, reloadDorm, toast, data, setData } = useDorm();
  const [issueText, setIssueText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!dorm) {
    return <div className="empty">ไม่พบข้อมูลแจ้งซ่อม</div>;
  }

  const roomNumber = localStorage.getItem("dormy_tenant_room_number") || tenantRoomNumber || "";
  const myRepairs = dorm.repairs
    ? dorm.repairs
        .filter((r: any) => r.room === roomNumber || r.room_id === tenantRoom)
        .sort((a: any, b: any) => b.id.localeCompare(a.id))
    : [];

  const getThaiDateToday = () => {
    const dt = new Date();
    return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear() + 543}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const issue = issueText.trim();
    if (!issue) {
      toast("กรุณาระบุรายละเอียดการแจ้งซ่อม", "error");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Try API call
      await api.createRepair({
        room_uuid: tenantRoom!,
        dorm_id: dorm.id,
        issue: issue
      });
      toast("ส่งเรื่องแจ้งซ่อมเรียบร้อย", "success");
      setIssueText("");
      await reloadDorm();
    } catch (err) {
      console.warn("API create repair failed, falling back to local:", err);
      // 2. Local fallback
      const newRepair = {
        id: "R" + Date.now(),
        room: roomNumber,
        room_id: tenantRoom,
        issue: issue,
        date: getThaiDateToday(),
        status: "pending"
      };

      const updatedDorms = data.dorms.map((d: any) => {
        if (d.id === dorm.id) {
          const reps = d.repairs || [];
          return { ...d, repairs: [newRepair, ...reps] };
        }
        return d;
      });

      setData({ ...data, dorms: updatedDorms });
      toast("ส่งเรื่องแจ้งซ่อมเรียบร้อย", "success");
      setIssueText("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb5">
        <div className="pg-title">แจ้งรายละเอียดซ่อม</div>
        <div className="pg-sub">ส่งปัญหาถึงผู้ดูแลหอพักของคุณ</div>
      </div>

      <div className="card mb5">
        <form className="cp" onSubmit={handleSubmit}>
          <div className="fg">
            <label className="fl">
              รายละเอียดความชำรุด <span>(เช่น ลูกบิดห้องน้ำพัง, ก๊อกน้ำอ่างล้างหน้ารั่ว)</span>
            </label>
            <textarea
              className="ta"
              placeholder="ระบุสิ่งที่ต้องการให้ซ่อมแซม..."
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              disabled={submitting}
            />
          </div>
          <button type="submit" className="btn bp bblk" disabled={submitting}>
            {submitting ? "กำลังส่งข้อมูล..." : "ส่งเรื่องแจ้งซ่อม"}
          </button>
        </form>
      </div>

      <div className="sec-lbl">ประวัติแจ้งซ่อมของคุณ ({myRepairs.length})</div>
      {myRepairs.length > 0 ? (
        <div className="sy">
          {myRepairs.map((r: any) => {
            const isCompleted = r.status === "completed";
            return (
              <div key={r.id} className="li" style={{ opacity: isCompleted ? 0.75 : 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>
                    {r.issue}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--t3)", marginTop: 2 }}>
                    แจ้งเมื่อ: {r.date}
                  </div>
                </div>
                <span className={`badge ${isCompleted ? "b-g" : "b-a"}`}>
                  {isCompleted ? "ซ่อมเสร็จแล้ว" : "กำลังรอดำเนินการ"}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <div className="empty-title">ไม่มีประวัติการแจ้งซ่อม</div>
          <div className="empty-desc">เรื่องที่แจ้งจะแสดงขึ้นพร้อมสถานะอัปเดตที่นี่</div>
        </div>
      )}
    </>
  );
}
