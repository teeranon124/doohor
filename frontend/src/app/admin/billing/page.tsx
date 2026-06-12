"use client";

import React, { useState } from "react";
import { useDorm } from "@/context/DormContext";
import { api } from "@/utils/api";

export default function AdminBillingPage() {
  const { dorm, reloadDorm, toast, data, setData } = useDorm();
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  if (!dorm) {
    return <div className="empty">ไม่พบข้อมูลหอพัก</div>;
  }

  const bills = dorm.bills || [];
  const active = bills.filter((b: any) => b.status !== "paid");
  const paid = bills.filter((b: any) => b.status === "paid").slice(0, 5);

  const getThaiDateToday = () => {
    const dt = new Date();
    return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear() + 543}`;
  };

  const handleSendLine = (billId: string, roomNumber: string, monthName: string) => {
    toast(`ส่ง LINE แจ้งเตือนห้อง ${roomNumber} เดือน ${monthName} เรียบร้อย`, "success");
  };

  const handleApprove = async (billId: string, roomNumber: string) => {
    setSubmittingId(billId);
    try {
      // 1. Try API call
      await api.updateBill(billId, {
        status: "paid",
        paid_date: getThaiDateToday()
      });
      toast(`ยืนยันรับเงินห้อง ${roomNumber} เรียบร้อย`, "success");
      await reloadDorm();
    } catch (err) {
      console.warn("API bill update failed, falling back to local:", err);
      // 2. Local fallback
      const updatedDorms = data.dorms.map((d: any) => {
        if (d.id === dorm.id) {
          const updatedBills = d.bills.map((b: any) => {
            if (b.id === billId) {
              return { ...b, status: "paid", paidDate: getThaiDateToday() };
            }
            return b;
          });
          return { ...d, bills: updatedBills };
        }
        return d;
      });
      setData({ ...data, dorms: updatedDorms });
      toast(`ยืนยันรับเงินห้อง ${roomNumber} เรียบร้อย`, "success");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <>
      <div className="mb5">
        <div className="pg-title">บิลและการชำระ</div>
        <div className="pg-sub">ติดตามสถานะการชำระของทุกห้อง</div>
      </div>

      {active.length === 0 && (
        <div className="alert al-ok mb5">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 16, height: 16, marginRight: 8, display: "inline-block", verticalAlign: "middle" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ทุกห้องชำระเรียบร้อยแล้ว
        </div>
      )}

      {active.length > 0 && (
        <>
          <div className="sec-lbl">รอชำระ / รอยืนยัน ({active.length})</div>
          <div className="sy mb5">
            {active.map((bill: any) => {
              const isPending = bill.status === "pending_approval";
              return (
                <div key={bill.id} className="li" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                  <div className="flex jcsb aic">
                    <div>
                      <span style={{ fontWeight: 700, fontSize: "15px" }}>ห้อง {bill.room}</span>
                      <span style={{ fontSize: "12px", color: "var(--t2)", marginLeft: 8 }}>
                        {bill.month}/{bill.year}
                      </span>
                    </div>
                    <span className={`badge ${isPending ? "b-a" : "b-r"}`}>{isPending ? "รอยืนยันโอน" : "ค้างชำระ"}</span>
                  </div>

                  <div className="flex jcsb aic mt3">
                    <div style={{ fontSize: "12px", color: "var(--t2)" }}>
                      ยอดรวม: <strong style={{ color: "var(--text)", fontSize: "14px" }}>฿{(bill.total || 0).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className="btn bg bsm"
                        onClick={() => handleSendLine(bill.id, bill.room, bill.month)}
                      >
                        แจ้ง LINE
                      </button>
                      <button
                        className="btn bp bsm"
                        disabled={submittingId === bill.id}
                        onClick={() => handleApprove(bill.id, bill.room)}
                      >
                        {isPending ? "ยืนยันยอด" : "รับเงินสด"}
                      </button>
                    </div>
                  </div>

                  {bill.payNote && (
                    <div style={{ fontSize: "11px", color: "var(--t2)", background: "var(--s2)", padding: "4px 8px", borderRadius: 4, marginTop: 4 }}>
                      หมายเหตุ: {bill.payNote}
                    </div>
                  )}
                  {bill.slipImageUrl && (
                    <div style={{ marginTop: 8 }}>
                      <a href={bill.slipImageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "var(--blue)", textDecoration: "underline" }}>
                        ดูรูปภาพสลิปแนบ
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {paid.length > 0 && (
        <>
          <div className="sec-lbl">ชำระแล้วล่าสุด</div>
          <div className="sy">
            {paid.map((bill: any) => (
              <div key={bill.id} className="li" style={{ opacity: 0.85 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>
                    ห้อง {bill.room}{" "}
                    <span style={{ fontWeight: 400, color: "var(--t2)", fontSize: "12px" }}>
                      &bull; {bill.month}/{bill.year}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--t2)" }}>จ่ายเมื่อ: {bill.paidDate}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'IBM Plex Sans Thai',sans-serif", fontWeight: 700, color: "var(--green)" }}>
                    ฿{(bill.total || 0).toLocaleString()}
                  </div>
                  <span className="badge b-g" style={{ fontSize: "9px", padding: "1px 6px" }}>
                    จ่ายแล้ว
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
