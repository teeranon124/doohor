"use client";

import React, { useState, useEffect } from "react";
import { useDorm } from "@/context/DormContext";
import { api } from "@/utils/api";

export default function AdminSettingsPage() {
  const { dorm, reloadDorm, toast, openModal, data, setData } = useDorm();

  const [dormName, setDormName] = useState("");
  const [address, setAddress] = useState("");
  const [promptpay, setPromptpay] = useState("");
  const [waterRate, setWaterRate] = useState(18);
  const [electricRate, setElectricRate] = useState(8);
  const [dueDay, setDueDay] = useState(5);

  const [typeName, setTypeName] = useState("");
  const [typeRent, setTypeRent] = useState("");
  const [typeDep, setTypeDep] = useState("");

  const [savingSettings, setSavingSettings] = useState(false);
  const [savingRoomType, setSavingRoomType] = useState(false);

  useEffect(() => {
    if (dorm) {
      setDormName(dorm.name || "");
      setAddress(dorm.addr || "");
      setPromptpay(dorm.promptpay || "");
      setWaterRate(dorm.waterRate !== undefined ? dorm.waterRate : 18);
      setElectricRate(dorm.electricRate !== undefined ? dorm.electricRate : 8);
      setDueDay(dorm.dueDayOfMonth !== undefined ? dorm.dueDayOfMonth : 5);
    }
  }, [dorm]);

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
            electricRate: electricRate
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
