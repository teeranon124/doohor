"use client";

import React, { useState } from "react";
import { useDorm, TH_MONTHS } from "@/context/DormContext";

export default function AdminMeterPage() {
  const { dorm, openModal, meterDraft, setMeterDraft, savedMeterDraft, setSavedMeterDraft, toast } = useDorm();

  const currentMonth = TH_MONTHS[new Date().getMonth()];
  const currentYear = new Date().getFullYear() + 543;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  if (!dorm) {
    return <div className="empty">ไม่พบข้อมูลหอพัก</div>;
  }

  const occ = dorm.rooms ? dorm.rooms.filter((r: any) => r.status === "occupied") : [];
  const waterRate = dorm.waterRate || 18;
  const elecRate = dorm.electricRate || 8;

  const draftKey = `${dorm.id}_${selectedMonth}_${selectedYear}`;
  const periodDraft = meterDraft[draftKey] || {};

  // Helper to dynamically calculate starting meters from previous month
  const getPreviousMeterReadings = (roomId: string, roomObj: any) => {
    // 1. Find all bills for this room
    const roomBills = dorm.bills?.filter((b: any) => b.room === roomObj.id) || [];
    
    // Convert selected month/year to chronological weight for comparison
    const selectedMonthIdx = TH_MONTHS.indexOf(selectedMonth);
    const selectedWeight = selectedYear * 12 + selectedMonthIdx;
    
    // 2. Find bills that are strictly before the selected month/year
    const billsBefore = roomBills.filter((b: any) => {
      const bMonthIdx = TH_MONTHS.indexOf(b.month);
      const bWeight = b.year * 12 + bMonthIdx;
      return bWeight < selectedWeight;
    });
    
    if (billsBefore.length > 0) {
      // Sort descending by weight to get the most recent bill before the selected period
      billsBefore.sort((a: any, b: any) => {
        const aWeight = a.year * 12 + TH_MONTHS.indexOf(a.month);
        const bWeight = b.year * 12 + TH_MONTHS.indexOf(b.month);
        return bWeight - aWeight;
      });
      
      const mostRecentBillBefore = billsBefore[0];
      return {
        wOld: mostRecentBillBefore.we || 0,
        eOld: mostRecentBillBefore.ee || 0
      };
    }
    
    // 3. Check saved drafts for the previous month (as a transition backup)
    const prevMonthIdx = (selectedMonthIdx - 1 + 12) % 12;
    const prevMonthName = TH_MONTHS[prevMonthIdx];
    const prevYear = selectedMonthIdx === 0 ? selectedYear - 1 : selectedYear;
    const prevDraftKey = `${dorm.id}_${prevMonthName}_${prevYear}`;
    const prevDraft = savedMeterDraft[prevDraftKey]?.[roomObj.id];
    if (prevDraft) {
      return {
        wOld: parseInt(prevDraft.w) || 0,
        eOld: parseInt(prevDraft.e) || 0
      };
    }
    
    // 4. If there are any bills at all, fallback to the starting meter of the earliest bill
    if (roomBills.length > 0) {
      roomBills.sort((a: any, b: any) => {
        const aWeight = a.year * 12 + TH_MONTHS.indexOf(a.month);
        const bWeight = b.year * 12 + TH_MONTHS.indexOf(b.month);
        return aWeight - bWeight; // ascending
      });
      return {
        wOld: roomBills[0].ws || 0,
        eOld: roomBills[0].es || 0
      };
    }
    
    // 5. Fallback to room's base values
    return {
      wOld: roomObj.lastWaterMeter || 0,
      eOld: roomObj.lastElectricMeter || 0
    };
  };

  const handleInput = (roomId: string, type: "w" | "e", val: string) => {
    setMeterDraft((prev: any) => {
      const currentPeriodDraft = prev[draftKey] || {};
      return {
        ...prev,
        [draftKey]: {
          ...currentPeriodDraft,
          [roomId]: {
            ...(currentPeriodDraft[roomId] || { w: "", e: "", extras: [] }),
            [type]: val
          }
        }
      };
    });
  };

  const handleSave = () => {
    // Prompt confirmation check before saving
    const confirmSave = window.confirm(`ยืนยันความถูกต้องของค่าน้ำและไฟงวด ${selectedMonth} ปี ${selectedYear} และต้องการบันทึกข้อมูลใช่หรือไม่?`);
    if (!confirmSave) return;

    setSavedMeterDraft((prev: any) => ({
      ...prev,
      [draftKey]: meterDraft[draftKey] || {}
    }));
    
    toast(`บันทึกข้อมูลมิเตอร์งวด ${selectedMonth}/${selectedYear} เรียบร้อยแล้ว กรุณาไปสร้างบิลในหน้าเมนู บิลและการชำระ`, "success");
  };

  return (
    <>
      <div className="mb5">
        <div className="pg-title">จดมิเตอร์ + บันทึกร่าง</div>
        <div className="pg-sub">กรอกมิเตอร์ห้องพักเพื่อบันทึกร่าง จากนั้นระบบจะใช้เฉพาะข้อมูลที่บันทึกแล้วเพื่อออกบิล</div>
      </div>

      <div className="card mb5">
        <div className="cp">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }} className="mb4">
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">เดือน</label>
              <select className="sel" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {TH_MONTHS.map((m: string) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">ปี (พ.ศ.)</label>
              <input type="number" className="inp" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value) || currentYear)} />
            </div>
          </div>

          <div className="ow" style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
            <table className="meter-table">
              <thead>
                <tr>
                  <th>ห้อง / ผู้เช่า</th>
                  <th style={{ color: "var(--blue)", textAlign: "right" }}>น้ำก่อน</th>
                  <th style={{ color: "var(--blue)" }}>น้ำใหม่</th>
                  <th style={{ color: "var(--blue)", textAlign: "right" }}>หน่วย</th>
                  <th style={{ color: "var(--amber)", textAlign: "right" }}>ไฟก่อน</th>
                  <th style={{ color: "var(--amber)" }}>ไฟใหม่</th>
                  <th style={{ color: "var(--amber)", textAlign: "right" }}>หน่วย</th>
                  <th>อื่นๆ</th>
                  <th style={{ color: "var(--green)", textAlign: "right" }}>รวม</th>
                </tr>
              </thead>
              <tbody>
                {occ.map((r: any) => {
                  const currentBill = dorm.bills?.find((b: any) =>
                    b.room === r.id &&
                    b.month === selectedMonth &&
                    b.year === selectedYear
                  );

                  const draft = periodDraft[r.id] || { w: "", e: "", extras: [] };
                  const { wOld, eOld } = currentBill 
                    ? { wOld: currentBill.ws || 0, eOld: currentBill.es || 0 }
                    : getPreviousMeterReadings(r.id, r);

                  const wNew = currentBill ? currentBill.we : parseInt(draft.w);
                  const wDiff = currentBill 
                    ? (currentBill.we - currentBill.ws) 
                    : (!isNaN(wNew) && wNew >= wOld ? wNew - wOld : null);

                  const eNew = currentBill ? currentBill.ee : parseInt(draft.e);
                  const eDiff = currentBill 
                    ? (currentBill.ee - currentBill.es) 
                    : (!isNaN(eNew) && eNew >= eOld ? eNew - eOld : null);

                  const extTotal = currentBill 
                    ? (currentBill.otherFees || 0) 
                    : (draft.extras || []).reduce((acc: number, cur: any) => acc + (cur.amt || 0), 0);

                  let totalCost = currentBill 
                    ? currentBill.total 
                    : (
                      (r.rentPrice || 0) +
                      (wDiff !== null ? wDiff * waterRate : 0) +
                      (eDiff !== null ? eDiff * elecRate : 0) +
                      extTotal
                    );

                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 600 }}>ห้อง {r.id}</span>
                          {currentBill && (
                            <span 
                              className={`badge ${
                                currentBill.status === "paid" 
                                  ? "b-g" 
                                  : currentBill.status === "pending_approval" 
                                  ? "b-y" 
                                  : "b-r"
                              }`}
                              style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "4px" }}
                            >
                              {currentBill.status === "paid" ? "จ่ายแล้ว" : currentBill.status === "pending_approval" ? "รอยืนยัน" : "ค้างชำระ"}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--t2)" }}>{r.tenant || ""}</div>
                        <div style={{ fontSize: "11px", color: "var(--t3)", marginTop: "2px" }}>
                          ค่าเช่า: ฿{(r.rentPrice || 0).toLocaleString()}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "'IBM Plex Sans Thai',sans-serif", fontWeight: 600, color: "var(--t2)" }}>
                        {wOld}
                      </td>
                      <td>
                        <input
                          className={`inp-sm ${currentBill ? "" : (!isNaN(wNew) && wNew < wOld ? "err" : "")}`}
                          type="number"
                          value={currentBill ? currentBill.we : (draft.w || "")}
                          onChange={(e) => handleInput(r.id, "w", e.target.value)}
                          disabled={!!currentBill}
                          style={currentBill ? { backgroundColor: "var(--border)", color: "var(--t2)", cursor: "not-allowed" } : undefined}
                        />
                      </td>
                      <td className="diff-cell" style={{ color: wDiff !== null ? "var(--text)" : "var(--t3)" }}>
                        {wDiff !== null ? `${wDiff} หน่วย` : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "'IBM Plex Sans Thai',sans-serif", fontWeight: 600, color: "var(--t2)" }}>
                        {eOld}
                      </td>
                      <td>
                        <input
                          className={`inp-sm ${currentBill ? "" : (!isNaN(eNew) && eNew < eOld ? "err" : "")}`}
                          type="number"
                          value={currentBill ? currentBill.ee : (draft.e || "")}
                          onChange={(e) => handleInput(r.id, "e", e.target.value)}
                          disabled={!!currentBill}
                          style={currentBill ? { backgroundColor: "var(--border)", color: "var(--t2)", cursor: "not-allowed" } : undefined}
                        />
                      </td>
                      <td className="diff-cell" style={{ color: eDiff !== null ? "var(--text)" : "var(--t3)" }}>
                        {eDiff !== null ? `${eDiff} หน่วย` : "—"}
                      </td>
                      <td>
                        <div style={{ textAlign: "right", fontWeight: 700, color: extTotal > 0 ? "var(--text)" : "var(--t3)", marginBottom: "4px" }}>
                          ฿{extTotal.toLocaleString()}
                        </div>
                        {!currentBill ? (
                          <button
                            className="btn bg bsm"
                            style={{ width: "100%", padding: "4px 0", fontSize: "11px" }}
                            onClick={() => openModal("m-extra", { roomId: r.id, draftKey: draftKey })}
                          >
                            + เพิ่มรายการ
                          </button>
                        ) : (
                          currentBill.otherDesc && (
                            <div style={{ fontSize: "10px", color: "var(--t3)", textAlign: "right" }} title={currentBill.otherDesc}>
                              ({currentBill.otherDesc})
                            </div>
                          )
                        )}
                      </td>
                      <td className="cost-cell" style={{ color: totalCost > 0 ? "var(--green)" : "var(--t3)" }}>
                        {totalCost > 0 ? `฿${totalCost.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt4" style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn bp f1" onClick={handleSave}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "15px", height: "15px", marginRight: 4 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>{" "}
              บันทึกข้อมูลมิเตอร์
            </button>
            <div style={{ fontSize: "12px", color: "var(--t3)" }}>กรอกเฉพาะห้องที่มีมิเตอร์ใหม่</div>
          </div>
        </div>
      </div>
    </>
  );
}
