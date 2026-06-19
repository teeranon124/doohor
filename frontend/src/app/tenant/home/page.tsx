"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDorm } from "@/context/DormContext";
import { api } from "@/utils/api";

export default function TenantHomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const directKey = searchParams.get("key");
  
  const { tenantRoom, dorm, openModal, toast } = useDorm();
  const [bills, setBills] = useState<any[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  
  const fetchBills = async (background = false) => {
    if (!tenantRoom) {
      setLoadingBills(false);
      return;
    }
    if (!background) setLoadingBills(true);
    try {
      // 1. Try to fetch from backend
      const res = await api.getTenantBills(tenantRoom);
      setBills(res);
    } catch (err) {
      console.warn("Failed to fetch tenant bills from API, using fallback:", err);
      // 2. Fallback to local storage dorm bills
      if (dorm && dorm.bills) {
        // Find bills for this room number
        const roomNumber = localStorage.getItem("dormy_tenant_room_number");
        const filtered = dorm.bills.filter((b: any) => b.room === roomNumber || b.room_id === tenantRoom);
        setBills(filtered);
      }
    } finally {
      if (!background) setLoadingBills(false);
    }
  };

  useEffect(() => {
    fetchBills();

    const interval = setInterval(() => {
      fetchBills(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [tenantRoom, dorm]);

  if (loadingBills) {
    return <div className="empty">กำลังโหลดบิล...</div>;
  }

  // Find the first unpaid or pending bill
  const activeBill = bills.find((b: any) => b.status !== "paid") || bills[0];

  // Calculations for billing details
  const waterRate = dorm?.waterRate || 18;
  const elecRate = dorm?.electricRate || 8;

  const wUnits = activeBill ? (activeBill.we - activeBill.ws) : 0;
  const wCost = wUnits * waterRate;

  const eUnits = activeBill ? (activeBill.ee - activeBill.es) : 0;
  const eCost = eUnits * elecRate;

  const promptpay = activeBill ? (activeBill.promptpay || dorm?.promptpay || "") : "";

  const isUnpaid = activeBill?.status === "unpaid";
  const isPending = activeBill?.status === "pending_approval";
  const isPaid = activeBill?.status === "paid";

  return (
    <>
      <div className="mb5">
        <div className="pg-title">บิลของฉัน</div>
        <div className="pg-sub">
          {activeBill ? `ประจำเดือน ${activeBill.month} ${activeBill.year}` : "ไม่มีบิลค้างชำระ"}
        </div>
      </div>

      {!activeBill ? (
        <div className="empty mb5">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="empty-title">ไม่มีบิลค้างชำระ</div>
          <div className="empty-desc">คุณชำระค่าเช่าของเดือนนี้เรียบร้อยแล้ว</div>
        </div>
      ) : (
        <div className="card mb5">
          <div className="tc-header" style={{ background: isPaid ? "var(--green)" : isPending ? "var(--amber)" : "var(--red)" }}>
            <div>
              <div className="tc-room">ห้อง {activeBill.room}</div>
              <div className="tc-name">กำหนดชำระ: {activeBill.dueDate}</div>
            </div>
            <span className="badge b-gray" style={{ background: "#fff", color: isPaid ? "var(--green)" : isPending ? "var(--amber)" : "var(--red)" }}>
              {isPaid ? "จ่ายแล้ว" : isPending ? "รอยืนยัน" : "รอชำระ"}
            </span>
          </div>

          <div className="tc-body">
            <div className="bill-blk">
              <div className="bill-blk-lbl">ค่าเช่าห้องพัก</div>
              <div className="flex jcsb">
                <span>ค่าเช่ารายเดือน</span>
                <strong>฿{(activeBill.rent || 0).toLocaleString()}</strong>
              </div>
            </div>

            <div className="bill-blk">
              <div className="bill-blk-lbl">ค่าน้ำประปา ({waterRate} บ./หน่วย)</div>
              <div className="flex jcsb">
                <span>เลขครั้งก่อน: {activeBill.ws} &bull; ใหม่: {activeBill.we}</span>
                <strong>{wUnits} หน่วย</strong>
              </div>
              <div className="flex jcsb mt3" style={{ fontSize: "12.5px", color: "var(--t2)" }}>
                <span>คำนวณค่าน้ำ</span>
                <span>฿{wCost.toLocaleString()}</span>
              </div>
            </div>

            <div className="bill-blk">
              <div className="bill-blk-lbl">ค่าไฟฟ้า ({elecRate} บ./หน่วย)</div>
              <div className="flex jcsb">
                <span>เลขครั้งก่อน: {activeBill.es} &bull; ใหม่: {activeBill.ee}</span>
                <strong>{eUnits} หน่วย</strong>
              </div>
              <div className="flex jcsb mt3" style={{ fontSize: "12.5px", color: "var(--t2)" }}>
                <span>คำนวณค่าไฟ</span>
                <span>฿{eCost.toLocaleString()}</span>
              </div>
            </div>

            {activeBill.otherFees > 0 && (
              <div className="bill-blk">
                <div className="bill-blk-lbl">ค่าใช้จ่ายเพิ่มเติม</div>
                <div className="flex jcsb">
                  <span>{activeBill.otherDesc || "อื่นๆ"}</span>
                  <strong>฿{(activeBill.otherFees || 0).toLocaleString()}</strong>
                </div>
              </div>
            )}

            <div className="bill-total">
              <span className="bill-total-lbl">ยอดที่ต้องชำระสุทธิ</span>
              <span className="bill-total-amt">฿{(activeBill.total || 0).toLocaleString()}</span>
            </div>

            <div className="mt4">
              {isUnpaid && (
                <button
                  className="btn bp bblk"
                  onClick={() => {
                    openModal("m-pay", {
                      billId: activeBill.id,
                      amount: activeBill.total,
                      promptpay
                    });
                  }}
                >
                  แจ้งชำระเงิน
                </button>
              )}
              {isPending && (
                <div className="alert al-warn" style={{ justifyContent: "center", fontWeight: "600" }}>
                  ระบบกำลังตรวจสอบยอดโอนเงินของคุณ...
                </div>
              )}
              {isPaid && (
                <div className="alert al-ok" style={{ justifyContent: "center", fontWeight: "600" }}>
                  ชำระเงินบิลประจำเดือนนี้เรียบร้อยแล้ว ขอบคุณค่ะ
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
