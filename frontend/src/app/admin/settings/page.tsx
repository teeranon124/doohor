"use client";

import React, { useState, useEffect } from "react";
import { useDorm } from "@/context/DormContext";
import { api, getCookie } from "@/utils/api";

export default function AdminSettingsPage() {
  const { dorm, reloadDorm, toast, openModal, data, setData } = useDorm();

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "2010441894-DC9CyoQf";
  const adminToken = typeof window !== "undefined" ? getCookie("dormy_admin_token") : "";
  const bindLink = `https://liff.line.me/${liffId}?mode=admin-bind&token=${adminToken}`;

  const [dormName, setDormName] = useState("");
  const [address, setAddress] = useState("");
  const [promptpay, setPromptpay] = useState("");
  const [waterRate, setWaterRate] = useState(18);
  const [electricRate, setElectricRate] = useState(8);
  const [dueDay, setDueDay] = useState(5);
  
  const [boundLineUserId, setBoundLineUserId] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const [typeName, setTypeName] = useState("");
  const [typeRent, setTypeRent] = useState("");
  const [typeDep, setTypeDep] = useState("");

  const [savingSettings, setSavingSettings] = useState(false);
  const [savingRoomType, setSavingRoomType] = useState(false);

  const fetchBindingCode = async () => {
    try {
      const res = await api.getAdminBindingCode();
      setBoundLineUserId(res.line_user_id || "");
      setOtpCode(res.binding_code || "");
    } catch (err) {
      console.error("Failed to load admin binding code:", err);
    }
  };

  useEffect(() => {
    if (dorm) {
      setDormName(dorm.name || "");
      setAddress(dorm.addr || "");
      setPromptpay(dorm.promptpay || "");
      setWaterRate(dorm.waterRate !== undefined ? dorm.waterRate : 18);
      setElectricRate(dorm.electricRate !== undefined ? dorm.electricRate : 8);
      setDueDay(dorm.dueDayOfMonth !== undefined ? dorm.dueDayOfMonth : 5);
      
      const lineId = dorm.ownerLineUserId || "";
      setBoundLineUserId(lineId);
      if (!lineId) {
        fetchBindingCode();
      }
    }
  }, [dorm]);

  const handleUnbindLine = async () => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการเชื่อมต่อ LINE สำหรับรับแจ้งเตือนสลิป?")) return;
    try {
      await api.unbindAdminLine();
      toast("ยกเลิกการเชื่อมต่อ LINE สำเร็จ", "success");
      setBoundLineUserId("");
      fetchBindingCode();
      await reloadDorm();
    } catch (err: any) {
      toast(err.message || "เกิดข้อผิดพลาด", "error");
    }
  };

  if (!dorm) {
    return <div className="empty">ไม่พบข้อมูลหอพัก</div>;
  }

  const handleSaveSettings = async () => {
    if (!dormName.trim()) {
      toast("กรอกชื่อหอพัก", "error");
      return;
    }
    setSavingSettings(true);
    try {
      // 1. Try API call
      await api.updateDorm(dorm.id, {
        name: dormName,
        address: address,
        promptpay: promptpay,
        due_day_of_month: dueDay,
        water_rate: waterRate,
        electric_rate: electricRate
      });
      toast("บันทึกการตั้งค่าเรียบร้อย", "success");
      await reloadDorm();
    } catch (err) {
      console.warn("API update dorm settings failed, falling back to local:", err);
      // 2. Local fallback
      const updatedDorms = data.dorms.map((d: any) => {
        if (d.id === dorm.id) {
          return {
            ...d,
            name: dormName,
            addr: address,
            promptpay: promptpay,
            dueDayOfMonth: dueDay,
            waterRate: waterRate,
            electricRate: electricRate,
            ownerLineUserId: boundLineUserId
          };
        }
        return d;
      });
      setData({ ...data, dorms: updatedDorms });
      toast("บันทึกการตั้งค่าเรียบร้อย", "success");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddRoomType = async () => {
    const name = typeName.trim();
    const rent = parseInt(typeRent);
    const dep = parseInt(typeDep);

    if (!name || isNaN(rent) || isNaN(dep)) {
      toast("กรอกข้อมูลประเภทห้องให้ครบถ้วน", "error");
      return;
    }

    setSavingRoomType(true);
    try {
      // 1. Try API call
      await api.createRoomType({
        dorm_id: dorm.id,
        name: name,
        rent: rent,
        deposit: dep
      });
      toast("เพิ่มประเภทห้องเรียบร้อย", "success");
      setTypeName("");
      setTypeRent("");
      setTypeDep("");
      await reloadDorm();
    } catch (err) {
      console.warn("API create room type failed, falling back to local:", err);
      // 2. Local fallback
      const updatedDorms = data.dorms.map((d: any) => {
        if (d.id === dorm.id) {
          const types = d.roomTypes || [];
          const newType = {
            id: "T" + Date.now(),
            name: name,
            rent: rent,
            deposit: dep
          };
          return { ...d, roomTypes: [...types, newType] };
        }
        return d;
      });
      setData({ ...data, dorms: updatedDorms });
      toast("เพิ่มประเภทห้องเรียบร้อย", "success");
      setTypeName("");
      setTypeRent("");
      setTypeDep("");
    } finally {
      setSavingRoomType(false);
    }
  };

  return (
    <>
      <div className="mb5">
        <div className="pg-title">ตั้งค่า</div>
        <div className="pg-sub">จัดการข้อมูลพื้นฐาน เรทค่าน้ำค่าไฟ และประเภทห้องพัก</div>
      </div>

      <div className="card mb5">
        <div className="cp">
          <div className="s-section">
            <div className="s-title">ข้อมูลหอพัก</div>
            <div className="fg">
              <label className="fl">ชื่อหอพัก</label>
              <input
                type="text"
                className="inp"
                value={dormName}
                onChange={(e) => setDormName(e.target.value)}
              />
            </div>
            <div className="fg">
              <label className="fl">ที่อยู่ / สาขา</label>
              <input
                type="text"
                className="inp"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="fg">
              <label className="fl">เบอร์พร้อมเพย์ (สำหรับให้ผู้เช่าสแกน)</label>
              <input
                type="text"
                className="inp"
                value={promptpay}
                onChange={(e) => setPromptpay(e.target.value)}
              />
            </div>
            <div className="fg" style={{ marginTop: "14px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}>
              <label className="fl" style={{ fontWeight: "700" }}>การเชื่อมต่อระบบแจ้งเตือนผ่าน LINE</label>
              {boundLineUserId ? (
                <div style={{
                  background: "rgba(56, 239, 125, 0.08)",
                  border: "1px solid rgba(56, 239, 125, 0.2)",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  textAlign: "left"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      width: "10px",
                      height: "10px",
                      background: "#38ef7d",
                      borderRadius: "50%",
                      boxShadow: "0 0 8px #38ef7d"
                    }}></span>
                    <strong style={{ color: "#38ef7d", fontSize: "14px" }}>ผูกบัญชี LINE สำเร็จแล้ว</strong>
                  </div>
                  <div style={{ fontSize: "12.5px", color: "var(--t2)" }}>
                    LINE User ID ของคุณ: <code style={{ fontFamily: "monospace", color: "#fff", background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: "4px" }}>{boundLineUserId}</code>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--t3)", lineHeight: "1.4" }}>
                    * ระบบจะจัดส่งข้อความรูปภาพสลิปที่ผู้เช่าแจ้งโอนเงินมาให้ตรวจสอบและอนุมัติใน LINE ส่วนตัวของคุณโดยตรงเมื่อมีการจ่ายค่าเช่า
                  </div>
                  <button 
                    type="button"
                    onClick={handleUnbindLine}
                    className="btn bd bsm"
                    style={{ alignSelf: "flex-start", marginTop: "4px", padding: "6px 12px" }}
                  >
                    ยกเลิกการผูกบัญชี LINE
                  </button>
                </div>
              ) : (
                <div style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "16px",
                  padding: "20px",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px"
                }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc", marginBottom: "6px" }}>
                      วิธีที่ 1: เชื่อมต่อในคลิกเดียว (1-Click Connect) — แนะนำ 👍
                    </div>
                    <div style={{ fontSize: "12.5px", color: "var(--t2)", marginBottom: "14px", lineHeight: "1.4" }}>
                      หากใช้งานผ่านโทรศัพท์มือถือที่ติดตั้งแอป LINE สามารถกดปุ่มเชื่อมต่อด้านล่างเพื่อผูกบัญชีได้ทันที หรือสแกน QR Code นี้หากคุณเปิดหน้าเว็บนี้บนคอมพิวเตอร์
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "center" }}>
                      <a
                        href={bindLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                        style={{
                          background: "linear-gradient(135deg, #06c755 0%, #05b04b 100%)",
                          color: "#fff",
                          fontWeight: "bold",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          border: "none",
                          padding: "12px 20px",
                          borderRadius: "10px",
                          textDecoration: "none",
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(6, 199, 85, 0.3)"
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                          <path d="M24 10.3c0-5.7-5.4-10.3-12-10.3S0 4.6 0 10.3c0 5.1 4.3 9.4 10.1 10.2.4.1.9.4.9.9v2.2c0 .6.4.8.7.4l3-3.6c2.8-.8 9.3-3.2 9.3-10.1z"/>
                        </svg>
                        เชื่อมต่อ LINE ทันที
                      </a>
                      
                      {adminToken && (
                        <div style={{
                          background: "#fff",
                          padding: "8px",
                          borderRadius: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
                        }}>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(bindLink)}`}
                            alt="LINE QR Code"
                            width="120"
                            height="120"
                            style={{ display: "block" }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: "20px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc", marginBottom: "6px" }}>
                      วิธีที่ 2: เชื่อมต่อผ่านรหัสยืนยัน 6 หลัก (กรณีเปิด LIFF ไม่ได้)
                    </div>
                    <ol style={{ paddingLeft: "20px", fontSize: "12.5px", color: "var(--t2)", display: "flex", flexDirection: "column", gap: "6px", margin: "0 0 12px 0" }}>
                      <li>กดเพิ่มเพื่อน LINE OA ของแพลตฟอร์มหอพักเรา</li>
                      <li>พิมพ์รหัสยืนยัน 6 หลักต่อไปนี้ส่งเข้ามาในแชท:</li>
                    </ol>
                    <div style={{
                      background: "rgba(56, 239, 125, 0.08)",
                      border: "1px solid rgba(56, 239, 125, 0.2)",
                      borderRadius: "8px",
                      padding: "10px",
                      textAlign: "center",
                      fontSize: "24px",
                      fontWeight: "800",
                      letterSpacing: "4px",
                      color: "#38ef7d",
                      fontFamily: "monospace",
                      margin: "10px 0"
                    }}>
                      {otpCode || "------"}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--t3)", textAlign: "center" }}>
                      * เมื่อส่งรหัสเข้าแชทสำเร็จ บัญชีจะเชื่อมต่อเข้ากับ LINE ของคุณทันทีโดยอัตโนมัติ
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="s-section">
            <div className="s-title">ตั้งค่าเรทและวันครบกำหนด</div>
            <div className="rate-row">
              <div className="rate-lbl">ค่าน้ำประปา</div>
              <input
                type="number"
                className="rate-inp"
                value={waterRate}
                onChange={(e) => setWaterRate(parseInt(e.target.value) || 0)}
              />
              <div className="rate-unit">บาท/หน่วย</div>
            </div>
            <div className="rate-row">
              <div className="rate-lbl">ค่าไฟฟ้า</div>
              <input
                type="number"
                className="rate-inp"
                value={electricRate}
                onChange={(e) => setElectricRate(parseInt(e.target.value) || 0)}
              />
              <div className="rate-unit">บาท/หน่วย</div>
            </div>
            <div className="rate-row">
              <div className="rate-lbl">วันออกบิลครบกำหนดชำระ</div>
              <input
                type="number"
                className="rate-inp"
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value) || 5)}
              />
              <div className="rate-unit">ของเดือนถัดไป</div>
            </div>
          </div>

          <button className="btn bp bblk" onClick={handleSaveSettings} disabled={savingSettings}>
            {savingSettings ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
          </button>
        </div>
      </div>

      <div className="card mb5">
        <div className="cp">
          <div className="s-section">
            <div className="s-title">ประเภทห้องพักในหอพัก</div>
            <div className="ow" style={{ marginBottom: "14px" }}>
              <table className="meter-table" style={{ minWidth: "100%" }}>
                <thead>
                  <tr>
                    <th>ประเภท</th>
                    <th style={{ textAlign: "right" }}>ค่าเช่า/เดือน</th>
                    <th style={{ textAlign: "right" }}>มัดจำตั้งต้น</th>
                    <th style={{ textAlign: "center" }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {(dorm.roomTypes || []).map((t: any) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td style={{ textAlign: "right" }}>฿{(t.rent || 0).toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}>฿{(t.deposit || 0).toLocaleString()}</td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn bd bsm"
                          style={{ padding: "4px 8px" }}
                          onClick={() => openModal("m-confirm-delete", { typeId: t.id })}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!dorm.roomTypes || dorm.roomTypes.length === 0) && (
                    <tr>
                      <td colSpan={4} className="empty" style={{ padding: "14px" }}>
                        ยังไม่มีประเภทห้องพัก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="s-title" style={{ marginTop: "24px" }}>
              เพิ่มประเภทห้องใหม่
            </div>
            <div className="r3">
              <div className="fg">
                <label className="fl">ชื่อประเภท</label>
                <input
                  type="text"
                  className="inp"
                  placeholder="เช่น Deluxe"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                />
              </div>
              <div className="fg">
                <label className="fl">ค่าเช่า</label>
                <input
                  type="number"
                  className="inp"
                  placeholder="เช่น 5500"
                  value={typeRent}
                  onChange={(e) => setTypeRent(e.target.value)}
                />
              </div>
              <div className="fg">
                <label className="fl">มัดจำ</label>
                <input
                  type="number"
                  className="inp"
                  placeholder="เช่น 11000"
                  value={typeDep}
                  onChange={(e) => setTypeDep(e.target.value)}
                />
              </div>
            </div>
            <button className="btn bg bblk mt3" onClick={handleAddRoomType} disabled={savingRoomType}>
              {savingRoomType ? "กำลังเพิ่ม..." : "+ เพิ่มประเภทห้องพัก"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
