"use client";

import React from "react";
import { useDorm, TH_MONTHS } from "@/context/DormContext";

export default function AdminMeterPage() {
  const { dorm, openModal, meterDraft, setMeterDraft } = useDorm();

  if (!dorm) {
    return <div className="empty">ไม่พบข้อมูลหอพัก</div>;
  }

  const occ = dorm.rooms ? dorm.rooms.filter((r: any) => r.status === "occupied") : [];
  const month = TH_MONTHS[new Date().getMonth()];
  const year = new Date().getFullYear() + 543;
  const waterRate = dorm.waterRate || 18;
  const elecRate = dorm.electricRate || 8;

  const handleInput = (roomId: string, type: "w" | "e", val: string) => {
    setMeterDraft((prev: any) => ({
      ...prev,
      [roomId]: {
        ...(prev[roomId] || { w: "", e: "", extras: [] }),
        [type]: val
      }
    }));
  };

  return (
    <>
      <div className="mb5">
        <div className="pg-title">จดมิเตอร์ + สร้างบิล</div>
        <div className="pg-sub">กรอกมิเตอร์ทุกห้องพร้อมกัน ตรวจสอบ แล้วส่งบิลทีเดียว</div>
      </div>

      <div className="card mb5">
        <div className="cp">
          <div className="r2 mb4">
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">เดือน</label>
              <select className="sel" id="bulk-month" defaultValue={month}>
                {TH_MONTHS.map((m: string) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">ปี (พ.ศ.)</label>
              <input type="number" className="inp" id="bulk-year" defaultValue={year} />
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
                  const draft = meterDraft[r.id] || { w: "", e: "", extras: [] };
                  const wNew = parseInt(draft.w);
                  const wOld = r.lastWaterMeter || 0;
                  const wDiff = !isNaN(wNew) && wNew >= wOld ? wNew - wOld : null;

                  const eNew = parseInt(draft.e);
                  const eOld = r.lastElectricMeter || 0;
                  const eDiff = !isNaN(eNew) && eNew >= eOld ? eNew - eOld : null;

                  const extTotal = (draft.extras || []).reduce((acc: number, cur: any) => acc + (cur.amt || 0), 0);

                  let totalCost = 0;
                  if (wDiff !== null) totalCost += wDiff * waterRate;
                  if (eDiff !== null) totalCost += eDiff * elecRate;
                  totalCost += extTotal;
                  totalCost += r.rentPrice || 0; // Include room rent in the running total cost!

                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>ห้อง {r.id}</div>
                        <div style={{ fontSize: "11px", color: "var(--t2)" }}>{r.tenant || ""}</div>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "'IBM Plex Sans Thai',sans-serif", fontWeight: 600, color: "var(--t2)" }}>
                        {wOld}
                      </td>
                      <td>
                        <input
                          className={`inp-sm ${wNew < wOld ? "err" : ""}`}
                          type="number"
                          value={draft.w || ""}
                          onChange={(e) => handleInput(r.id, "w", e.target.value)}
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
                          className={`inp-sm ${eNew < eOld ? "err" : ""}`}
                          type="number"
                          value={draft.e || ""}
                          onChange={(e) => handleInput(r.id, "e", e.target.value)}
                        />
                      </td>
                      <td className="diff-cell" style={{ color: eDiff !== null ? "var(--text)" : "var(--t3)" }}>
                        {eDiff !== null ? `${eDiff} หน่วย` : "—"}
                      </td>
                      <td>
                        <div style={{ textAlign: "right", fontWeight: 700, color: extTotal > 0 ? "var(--text)" : "var(--t3)", marginBottom: "4px" }}>
                          ฿{extTotal.toLocaleString()}
                        </div>
                        <button
                          className="btn bg bsm"
                          style={{ width: "100%", padding: "4px 0", fontSize: "11px" }}
                          onClick={() => openModal("m-extra", { roomId: r.id })}
                        >
                          + เพิ่มรายการ
                        </button>
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
            <button className="btn bp f1" onClick={() => openModal("m-bill-preview")}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "15px", height: "15px", marginRight: 4 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>{" "}
              ดูสรุปก่อนส่ง
            </button>
            <div style={{ fontSize: "12px", color: "var(--t3)" }}>กรอกเฉพาะห้องที่มีมิเตอร์ใหม่</div>
          </div>
        </div>
      </div>
    </>
  );
}
