"use client";

import React, { useState, useEffect } from "react";
import { useDorm, TH_MONTHS } from "@/context/DormContext";
import { api } from "@/utils/api";

export default function AdminBillingPage() {
  const { dorm, reloadDorm, toast, openModal } = useDorm();
  const [activeTab, setActiveTab] = useState<"all" | "unpaid" | "pending" | "paid">("all");
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  
  // Custom modal states
  const [cashBill, setCashBill] = useState<any | null>(null);
  const [cashNote, setCashNote] = useState("");
  const [rejectOrder, setRejectOrder] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const fetchOrders = async (background = false) => {
    if (!dorm) return;
    if (!background) setLoadingOrders(true);
    try {
      const res = await api.getOrders({ dorm_id: dorm.id });
      setOrders(res || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      if (!background) setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders(true);
      reloadDorm();
    }, 15000);

    return () => clearInterval(interval);
  }, [dorm?.id]);

  if (!dorm) {
    return <div className="empty">ไม่พบข้อมูลหอพัก</div>;
  }

  const bills = dorm.bills || [];

  const currentMonthIdx = new Date().getMonth();
  const currentYearBE = new Date().getFullYear() + 543;
  const [filterMonth, setFilterMonth] = useState<string>(TH_MONTHS[currentMonthIdx]);
  const [filterYear, setFilterYear] = useState<string>(String(currentYearBE));

  // Count unpaid/pending bills in other months that are currently hidden
  const pastUnpaidCount = bills.filter((b: any) => {
    if (b.status === "paid") return false;
    const inCurrentPeriod = (filterMonth === "all" || b.month === filterMonth) && 
                            (filterYear === "all" || String(b.year) === filterYear);
    return !inCurrentPeriod;
  }).length;

  const periodBills = bills.filter((b: any) => {
    if (filterMonth !== "all" && b.month !== filterMonth) return false;
    if (filterYear !== "all" && String(b.year) !== filterYear) return false;
    return true;
  });

  const totalBilled = periodBills.reduce((acc: number, cur: any) => acc + (cur.total || 0), 0);
  const totalPaid = periodBills.filter((b: any) => b.status === "paid").reduce((acc: number, cur: any) => acc + (cur.total || 0), 0);
  const totalUnpaid = periodBills.filter((b: any) => b.status !== "paid").reduce((acc: number, cur: any) => acc + (cur.total || 0), 0);

  const filteredBills = periodBills.filter((b: any) => {
    if (activeTab === "all") return b.status !== "paid";
    if (activeTab === "unpaid") return b.status === "unpaid";
    if (activeTab === "pending") return b.status === "pending_approval";
    if (activeTab === "paid") return b.status === "paid";
    return true;
  });

  const getThaiDateToday = () => {
    const dt = new Date();
    return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear() + 543}`;
  };

  const getTenantName = (roomNumber: string) => {
    const r = dorm.rooms?.find((x: any) => x.id === roomNumber);
    return r ? r.tenant : null;
  };

  const handleSendLine = (billId: string, roomNumber: string, monthName: string) => {
    toast(`ส่งแจ้งเตือนไลน์ห้อง ${roomNumber} เดือน ${monthName} เรียบร้อย`, "success");
  };

  const handleRecordCashSubmit = async () => {
    if (!cashBill) return;
    const billId = cashBill.id;
    const roomNumber = cashBill.room;
    setSubmittingId(billId);
    try {
      await api.updateBill(billId, {
        status: "paid",
        paid_date: getThaiDateToday(),
        pay_note: cashNote.trim() || undefined
      });
      toast(`ยืนยันรับเงินสดห้อง ${roomNumber} เรียบร้อย`, "success");
      setCashBill(null);
      setCashNote("");
      await reloadDorm();
    } catch (err: any) {
      toast(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleApproveOrder = async (orderId: string, roomNumber: string) => {
    setSubmittingId(orderId);
    try {
      await api.updateOrderStatus(orderId, {
        status: "approved"
      });
      toast(`อนุมัติสลิปห้อง ${roomNumber} เรียบร้อย`, "success");
      await fetchOrders();
      await reloadDorm();
    } catch (err: any) {
      toast(err.message || "เกิดข้อผิดพลาดในการอนุมัติ", "error");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectOrder) return;
    const orderId = rejectOrder.id;
    const roomNumber = rejectOrder.room_number;
    setSubmittingId(orderId);
    try {
      await api.updateOrderStatus(orderId, {
        status: "rejected",
        admin_note: rejectReason.trim()
      });
      toast(`ปฏิเสธสลิปห้อง ${roomNumber} เรียบร้อย`, "success");
      setRejectOrder(null);
      setRejectReason("");
      await fetchOrders();
      await reloadDorm();
    } catch (err: any) {
      toast(err.message || "เกิดข้อผิดพลาดในการปฏิเสธ", "error");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <>
      <div className="mb5">
        <div className="pg-title">บิลและการชำระ</div>
        <div className="pg-sub">จัดการบิล ตรวจสอบสลิปการโอนเงิน และบันทึกการชำระเงิน</div>
      </div>

      {/* Action Banner for Bill Generation */}
      <div 
        className="card mb5" 
        style={{ 
          background: "linear-gradient(135deg, var(--bl) 0%, var(--surface) 100%)", 
          border: "1px solid var(--border)",
          padding: "20px" 
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>สร้างบิลและแจ้งเตือนไลน์</div>
            <div style={{ fontSize: "13px", color: "var(--t2)", marginTop: "2px" }}>
              ดึงข้อมูลจากมิเตอร์ที่บันทึกไว้ เพื่อสร้างบิลและส่งแจ้งเตือนไลน์ไปยังผู้เช่า
            </div>
          </div>
          <button className="btn bp" onClick={() => openModal("m-bill-preview")} style={{ whiteSpace: "nowrap" }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 16, height: 16, marginRight: 6 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            ตรวจสอบและส่งแจ้งเตือนไลน์
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: "16px", gap: "20px", overflowX: "auto", scrollbarWidth: "none" }}>
        {[
          { id: "all", label: `ทั้งหมด (${periodBills.filter((b: any) => b.status !== "paid").length})` },
          { id: "unpaid", label: `รอชำระ (${periodBills.filter((b: any) => b.status === "unpaid").length})` },
          { id: "pending", label: `รอยืนยันโอน (${periodBills.filter((b: any) => b.status === "pending_approval").length})` },
          { id: "paid", label: `ชำระแล้ว (${periodBills.filter((b: any) => b.status === "paid").length})` }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              padding: "10px 4px",
              background: "none",
              border: "none",
              borderBottom: activeTab === t.id ? "3px solid var(--green)" : "3px solid transparent",
              color: activeTab === t.id ? "var(--green)" : "var(--t3)",
              fontWeight: activeTab === t.id ? 700 : 500,
              cursor: "pointer",
              fontSize: "14px",
              transition: "all 0.2s",
              whiteSpace: "nowrap"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div 
        className="card mb4" 
        style={{ 
          padding: "12px 16px", 
          background: "var(--surface)", 
          display: "flex", 
          flexWrap: "wrap", 
          justifyContent: "space-between", 
          alignItems: "center",
          gap: "12px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--t2)" }}>กรองตามรอบบิล:</span>
          
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "nowrap" }}>
            <select 
              className="sel" 
              style={{ width: "115px", padding: "6px 10px", fontSize: "13px" }}
              value={filterMonth} 
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="all">ทุกเดือน</option>
              {["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select 
              className="sel" 
              style={{ width: "85px", padding: "6px 10px", fontSize: "13px" }}
              value={filterYear} 
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="all">ทุกปี</option>
              {Array.from(new Set([
                new Date().getFullYear() + 543,
                ...bills.map((b: any) => b.year)
              ])).sort((a, b) => b - a).map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {(filterMonth !== "all" || filterYear !== "all") && (
          <button 
            style={{ 
              background: "none", 
              border: "none", 
              color: "var(--red)", 
              fontSize: "12px", 
              cursor: "pointer",
              fontWeight: 500,
              padding: "4px"
            }}
            onClick={() => {
              setFilterMonth("all");
              setFilterYear("all");
            }}
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Mini Stats Summary */}
      <div 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", 
          gap: "10px", 
          marginBottom: "20px" 
        }}
      >
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "10px 12px" }}>
          <div style={{ fontSize: "11px", color: "var(--t3)" }}>ยอดเรียกเก็บทั้งหมด</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", marginTop: "2px" }}>
            ฿{totalBilled.toLocaleString()}
          </div>
          <div style={{ fontSize: "10px", color: "var(--t2)", marginTop: "2px" }}>
            จาก {periodBills.length} บิล
          </div>
        </div>

        <div style={{ background: "var(--gl)", border: "1px solid var(--gm)", borderRadius: "var(--r)", padding: "10px 12px" }}>
          <div style={{ fontSize: "11px", color: "var(--green)" }}>ชำระเงินแล้ว</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--green)", marginTop: "2px" }}>
            ฿{totalPaid.toLocaleString()}
          </div>
          <div style={{ fontSize: "10px", color: "var(--green)", opacity: 0.8, marginTop: "2px" }}>
            {periodBills.filter((b: any) => b.status === "paid").length} บิล
          </div>
        </div>

        <div style={{ background: "var(--rl)", border: "1px solid #f0b8b8", borderRadius: "var(--r)", padding: "10px 12px" }}>
          <div style={{ fontSize: "11px", color: "var(--red)" }}>ค้างชำระ/รอยืนยัน</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--red)", marginTop: "2px" }}>
            ฿{totalUnpaid.toLocaleString()}
          </div>
          <div style={{ fontSize: "10px", color: "var(--red)", opacity: 0.8, marginTop: "2px" }}>
            {periodBills.filter((b: any) => b.status !== "paid").length} บิล
          </div>
        </div>
      </div>

      {/* Past Due Warning Alert */}
      {pastUnpaidCount > 0 && (
        <div 
          className="alert al-info mb4" 
          style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            background: "var(--rl)", 
            borderColor: "#f0b8b8",
            padding: "10px 14px",
            borderRadius: "var(--rsm)",
            flexWrap: "wrap",
            gap: "8px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--red)", fontWeight: 500 }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "16px", height: "16px", flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>มีบิลค้างชำระ/รอยืนยันโอนจากงวดเดือนอื่นอยู่อีก <strong>{pastUnpaidCount} รายการ</strong></span>
          </div>
          <button 
            className="btn bg bsm" 
            style={{ 
              color: "var(--red)", 
              border: "1.5px solid var(--red)", 
              padding: "4px 10px", 
              fontSize: "11px",
              fontWeight: 600,
              background: "white"
            }}
            onClick={() => {
              setFilterMonth("all");
              setFilterYear("all");
            }}
          >
            แสดงรอบบิลทั้งหมด
          </button>
        </div>
      )}

      {/* Main Bills List */}
      {filteredBills.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--t3)", background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: "var(--r)" }}>
          ไม่พบรายการบิลในหมวดหมู่นี้
        </div>
      ) : (
        <div className="sy mb5">
          {filteredBills.map((bill: any) => {
            const isPending = bill.status === "pending_approval";
            const isUnpaid = bill.status === "unpaid";
            const tenantName = getTenantName(bill.room);
            const matchingOrder = isPending ? orders.find((o: any) => o.room_number === bill.room && o.status === "pending") : null;

            return (
              <div 
                key={bill.id} 
                className="li" 
                style={{ 
                  flexDirection: "column", 
                  alignItems: "stretch", 
                  gap: "10px", 
                  padding: "16px",
                  border: isPending ? "1.5px solid var(--amber)" : "1px solid var(--border)"
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 700, fontSize: "16px" }}>ห้อง {bill.room}</span>
                      <span style={{ fontSize: "12px", color: "var(--t2)" }}>
                        {bill.month}/{bill.year}
                      </span>
                    </div>
                    {tenantName && (
                      <div style={{ fontSize: "12px", color: "var(--t2)", marginTop: "2px" }}>
                        ผู้เช่า: {tenantName}
                      </div>
                    )}
                  </div>
                  <span 
                    className={`badge ${
                      bill.status === "paid" 
                        ? "b-g" 
                        : isPending 
                          ? "b-a" 
                          : "b-r"
                    }`}
                  >
                    {bill.status === "paid" ? "ชำระแล้ว" : isPending ? "รอยืนยันโอน" : "ค้างชำระ"}
                  </span>
                </div>

                {/* Bill Breakdown */}
                <div style={{ background: "var(--bg)", borderRadius: "6px", padding: "10px 12px", fontSize: "12px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "12px" }}>
                    <div>
                      <div style={{ color: "var(--t3)" }}>ค่าเช่า</div>
                      <div style={{ fontWeight: 600, marginTop: "2px" }}>฿{bill.rent.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--t3)" }}>ค่าน้ำ</div>
                      <div style={{ fontWeight: 600, marginTop: "2px" }}>
                        ฿{((bill.we - bill.ws) * (dorm.waterRate || 18)).toLocaleString()}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--t2)", marginTop: "1px" }}>
                        {bill.ws} &rarr; {bill.we} หน่วย
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--t3)" }}>ค่าไฟ</div>
                      <div style={{ fontWeight: 600, marginTop: "2px" }}>
                        ฿{((bill.ee - bill.es) * (dorm.electricRate || 8)).toLocaleString()}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--t2)", marginTop: "1px" }}>
                        {bill.es} &rarr; {bill.ee} หน่วย
                      </div>
                    </div>
                    {bill.otherFees > 0 && (
                      <div>
                        <div style={{ color: "var(--t3)" }}>อื่นๆ</div>
                        <div style={{ fontWeight: 600, marginTop: "2px" }}>฿{bill.otherFees.toLocaleString()}</div>
                        <div style={{ fontSize: "10px", color: "var(--t2)", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={bill.otherDesc}>
                          {bill.otherDesc}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ borderTop: "1px solid var(--border2)", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 500 }}>ยอดรวมทั้งสิ้น:</span>
                    <strong style={{ fontSize: "15px", color: "var(--text)" }}>฿{(bill.total || 0).toLocaleString()}</strong>
                  </div>
                </div>

                {/* Submited Slip details (Pending tab / verification block) */}
                {isPending && (
                  <div style={{ borderTop: "1px dashed var(--border2)", paddingTop: "10px", marginTop: "4px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--amber)", marginBottom: "8px" }}>
                      ข้อมูลสลิปที่แนบส่งมา:
                    </div>
                    {matchingOrder ? (
                      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flexWrap: "wrap" }}>
                        {matchingOrder.slip_url_signed ? (
                          <div 
                            style={{ 
                              position: "relative", 
                              width: "80px", 
                              height: "100px", 
                              borderRadius: "6px", 
                              overflow: "hidden", 
                              border: "1.5px solid var(--border2)",
                              cursor: "zoom-in",
                              background: "#000",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center"
                            }}
                            onClick={() => setLightboxImg(matchingOrder.slip_url_signed)}
                            title="คลิกเพื่อขยายดูรูปสลิป"
                          >
                            <img 
                              src={matchingOrder.slip_url_signed} 
                              alt="Slip Slip" 
                              style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.2s" }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                            />
                          </div>
                        ) : (
                          <div style={{ width: "80px", height: "100px", background: "var(--border)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "var(--t3)", textAlign: "center" }}>
                            ไม่มีภาพ
                          </div>
                        )}
                        <div style={{ flex: 1, fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div>ยอดโอนตามสลิป: <strong style={{ color: "var(--text)" }}>฿{parseFloat(matchingOrder.amount || 0).toLocaleString()}</strong></div>
                          <div>เลขอ้างอิงสลิป: <strong>{matchingOrder.reference_number || "ไม่มีระบุ"}</strong></div>
                          <div>เวลาชำระเงิน: <strong>{matchingOrder.payment_time ? new Date(matchingOrder.payment_time).toLocaleString("th-TH") : "ไม่ระบุ"}</strong></div>
                          
                          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                            <button
                              className="btn bsm"
                              style={{ background: "var(--green)", color: "white", padding: "6px 12px" }}
                              disabled={submittingId === matchingOrder.id}
                              onClick={() => handleApproveOrder(matchingOrder.id, bill.room)}
                            >
                              อนุมัติสลิป
                            </button>
                            <button
                              className="btn bsm bg"
                              style={{ color: "var(--red)", border: "1px solid var(--red)", padding: "6px 12px" }}
                              disabled={submittingId === matchingOrder.id}
                              onClick={() => setRejectOrder(matchingOrder)}
                            >
                              ปฏิเสธ
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: "12px", color: "var(--t3)", fontStyle: "italic" }}>
                        กำลังโหลดข้อมูลสลิปหลักฐาน... (หรือไม่มีรายการโอนเงินของห้องนี้ในสถานะรออนุมัติ)
                      </div>
                    )}
                  </div>
                )}

                {/* Standard actions for unpaid/paid */}
                {!isPending && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <div style={{ fontSize: "11px", color: "var(--t2)" }}>
                      {bill.status === "paid" && (
                        <span>
                          ชำระเมื่อ: {bill.paidDate} {bill.payNote && `(${bill.payNote})`}
                        </span>
                      )}
                    </div>
                    {isUnpaid && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn bg bsm"
                          disabled={submittingId === bill.id}
                          onClick={() => handleSendLine(bill.id, bill.room, bill.month)}
                        >
                          แจ้งเตือนไลน์
                        </button>
                        <button
                          className="btn bp bsm"
                          disabled={submittingId === bill.id}
                          onClick={() => {
                            setCashBill(bill);
                            setCashNote("");
                          }}
                        >
                          รับเงินสด
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Record Cash Modal Overlay */}
      {cashBill && (
        <div className="overlay open" onClick={() => setCashBill(null)}>
          <div className="modal" style={{ maxWidth: "400px" }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setCashBill(null)}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="modal-handle"></div>
            <div className="modal-title">ยืนยันรับเงินสด</div>
            <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "14px", color: "var(--text)" }}>
                กรุณายืนยันการชำระด้วยเงินสดสำหรับ <strong>ห้อง {cashBill.room}</strong> ประจำงวด <strong>{cashBill.month}/{cashBill.year}</strong>
              </p>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--green)" }}>
                ยอดเงิน: ฿{parseFloat(cashBill.total || 0).toLocaleString()}
              </div>
              
              <div className="fg" style={{ marginBottom: 0 }}>
                <label className="fl">หมายเหตุการชำระเงิน (ถ้ามี)</label>
                <input 
                  type="text" 
                  className="inp" 
                  placeholder="เช่น ชำระค่าเช่าเต็มจำนวน, ฝากรับแทน" 
                  value={cashNote}
                  onChange={e => setCashNote(e.target.value)}
                  disabled={submittingId === cashBill.id}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button className="btn bg f1" onClick={() => setCashBill(null)} disabled={submittingId === cashBill.id}>ยกเลิก</button>
                <button className="btn bp f1" onClick={handleRecordCashSubmit} disabled={submittingId === cashBill.id}>
                  {submittingId === cashBill.id ? "กำลังบันทึก..." : "ยืนยันรับเงินสด"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reject Slip Modal Overlay */}
      {rejectOrder && (
        <div className="overlay open" onClick={() => setRejectOrder(null)}>
          <div className="modal" style={{ maxWidth: "420px" }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setRejectOrder(null)}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="modal-handle"></div>
            <div className="modal-title" style={{ color: "var(--red)" }}>ปฏิเสธสลิปการโอนเงิน</div>
            <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "14px", color: "var(--text)" }}>
                คุณกำลังปฏิเสธรูปภาพสลิปที่แนบชำระมาของ <strong>ห้อง {rejectOrder.room_number}</strong>
              </p>
              <div style={{ fontSize: "14px", color: "var(--t2)" }}>
                ยอดเงินโอนแจ้งไว้: ฿{parseFloat(rejectOrder.amount || 0).toLocaleString()}
              </div>
              
              <div className="fg" style={{ marginBottom: 0 }}>
                <label className="fl">สาเหตุที่ปฏิเสธสลิป *</label>
                <textarea 
                  className="inp" 
                  style={{ height: "80px", resize: "none", padding: "10px" }}
                  placeholder="ตัวอย่าง: แนบสลิปผิด, ยอดเงินในสลิปไม่ตรง, วันที่โอนไม่ถูกต้อง หรือรูปสลิปไม่ชัดเจน" 
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  disabled={submittingId === rejectOrder.id}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button className="btn bg f1" onClick={() => setRejectOrder(null)} disabled={submittingId === rejectOrder.id}>ยกเลิก</button>
                <button 
                  className="btn f1" 
                  style={{ background: "var(--red)", color: "white" }} 
                  onClick={handleRejectSubmit} 
                  disabled={submittingId === rejectOrder.id || !rejectReason.trim()}
                >
                  {submittingId === rejectOrder.id ? "กำลังส่ง..." : "ยืนยันปฏิเสธสลิป"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Overlay */}
      {lightboxImg && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backdropFilter: "blur(5px)",
            cursor: "zoom-out"
          }}
          onClick={() => setLightboxImg(null)}
        >
          <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }} onClick={e => e.stopPropagation()}>
            <button 
              style={{
                position: "absolute",
                top: "-40px",
                right: "0",
                background: "none",
                border: "none",
                color: "white",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
              onClick={() => setLightboxImg(null)}
            >
              &times; ปิดหน้าต่าง
            </button>
            <img 
              src={lightboxImg} 
              alt="Slip Lightbox" 
              style={{
                maxWidth: "100%",
                maxHeight: "85vh",
                borderRadius: "8px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)"
              }} 
            />
          </div>
        </div>
      )}
    </>
  );
}
