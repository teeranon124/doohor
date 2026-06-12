"use client";

import React, { useState, useEffect } from "react";
import { useDorm } from "@/context/DormContext";
import { api } from "@/utils/api";

export default function TenantHistoryPage() {
  const { tenantRoom, dorm } = useDorm();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBills = async () => {
      if (!tenantRoom) return;
      setLoading(true);
      try {
        const res = await api.getTenantBills(tenantRoom);
        setBills(res);
      } catch (err) {
        console.warn("Failed to fetch tenant bills from API, using fallback:", err);
        if (dorm && dorm.bills) {
          const roomNumber = localStorage.getItem("dormy_tenant_room_number");
          const filtered = dorm.bills.filter((b: any) => b.room === roomNumber || b.room_id === tenantRoom);
          setBills(filtered);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, [tenantRoom, dorm]);

  if (loading) {
    return <div className="empty">กำลังโหลดประวัติ...</div>;
  }

  const paidBills = bills.filter((b: any) => b.status === "paid");

  return (
    <>
      <div className="mb5">
        <div className="pg-title">ประวัติการชำระเงิน</div>
        <div className="pg-sub">รายการบิลที่ชำระเรียบร้อยแล้วทั้งหมด</div>
      </div>

      {paidBills.length > 0 ? (
        <div className="sy">
          {paidBills.map((bill: any) => (
            <div key={bill.id} className="li">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>
                  บิลเดือน {bill.month} {bill.year}
                </div>
                <div style={{ fontSize: "11px", color: "var(--t2)", marginTop: 2 }}>
                  ชำระเมื่อ: {bill.paidDate}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'IBM Plex Sans Thai',sans-serif", fontWeight: 700, color: "var(--green)" }}>
                  ฿{(bill.total || 0).toLocaleString()}
                </div>
                <span className="badge b-g" style={{ fontSize: "9px", padding: "1px 6px" }}>
                  สำเร็จ
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="empty-title">ไม่มีประวัติชำระเงิน</div>
          <div className="empty-desc">ประวัติบิลที่จ่ายสำเร็จจะแสดงขึ้นที่นี่</div>
        </div>
      )}
    </>
  );
}
