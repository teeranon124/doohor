"use client";

import React, { useState, useEffect } from "react";
import { useDorm } from "@/context/DormContext";
import { api, toApiDate, fromApiDate } from "@/utils/api";

export default function Modals({
  activeModal,
  closeModal,
  modalData
}: {
  activeModal: string | null;
  closeModal: () => void;
  modalData: any;
}) {
  const { dorm, setData, data } = useDorm();

  if (!activeModal) return null;

  return (
    <>
      <AddDormModal isOpen={activeModal === "m-add-dorm"} close={closeModal} />
      <AddRoomModal isOpen={activeModal === "m-add-room"} close={closeModal} />
      <DepositModal isOpen={activeModal === "m-deposit"} close={closeModal} roomId={modalData?.roomId} />
      <TenantModal isOpen={activeModal === "m-tenant"} close={closeModal} roomId={modalData?.roomId} mode={modalData?.mode} />
      <ExtraModal isOpen={activeModal === "m-extra"} close={closeModal} roomId={modalData?.roomId} />
      <ConfirmDeleteModal isOpen={activeModal === "m-confirm-delete"} close={closeModal} typeId={modalData?.typeId} />
      <BillPreviewModal isOpen={activeModal === "m-bill-preview"} close={closeModal} />
      <PayModal isOpen={activeModal === "m-pay"} close={closeModal} modalData={modalData} />
    </>
  );
}

// ----- Add Dorm Modal -----
function AddDormModal({ isOpen, close }: { isOpen: boolean; close: () => void }) {
  const { reloadDorm, toast } = useDorm();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [promptpay, setPromptpay] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setAddress("");
      setPromptpay("");
    }
  }, [isOpen]);

  const handleAddDorm = async () => {
    if (!name.trim()) {
      toast("กรุณากรอกชื่อหอพัก", "error");
      return;
    }
    setLoading(true);
    try {
      await api.createDorm({ name, address, promptpay });
      toast("เพิ่มหอพักเรียบร้อยแล้ว", "success");
      await reloadDorm();
      close();
    } catch (err: any) {
      toast(err.message || "ไม่สามารถเพิ่มหอพักได้", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className={`overlay ${isOpen ? "open" : ""}`} onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="modal-handle"></div>
        <div className="modal-title">เพิ่มหอพักใหม่</div>
        <div className="fg">
          <label className="fl">ชื่อหอพัก</label>
          <input
            type="text"
            className="inp"
            placeholder="เช่น Dormy สาขา 2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="fg">
          <label className="fl">ที่อยู่ / สาขา <span>(ไม่บังคับ)</span></label>
          <input
            type="text"
            className="inp"
            placeholder="เช่น ซอยรามคำแหง 24"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="fg">
          <label className="fl">เบอร์พร้อมเพย์</label>
          <input
            type="text"
            className="inp"
            placeholder="081-XXX-XXXX"
            value={promptpay}
            onChange={(e) => setPromptpay(e.target.value)}
            disabled={loading}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
          <button className="btn bg f1" onClick={close} disabled={loading}>ยกเลิก</button>
          <button className="btn bp f1" onClick={handleAddDorm} disabled={loading}>
            {loading ? "กำลังเพิ่ม..." : "เพิ่มหอ"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- Add Room Modal -----
function AddRoomModal({ isOpen, close }: { isOpen: boolean; close: () => void }) {
  const { dorm, reloadDorm, toast } = useDorm();
  const [roomNumber, setRoomNumber] = useState("");
  const [typeId, setTypeId] = useState("");
  const [rentPrice, setRentPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRoomNumber("");
      if (dorm?.roomTypes?.length > 0) {
        setTypeId(dorm.roomTypes[0].id);
        setRentPrice(dorm.roomTypes[0].rent);
      } else {
        setTypeId("");
        setRentPrice(0);
      }
    }
  }, [isOpen, dorm]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setTypeId(selectedId);
    const tObj = dorm?.roomTypes?.find((x: any) => x.id === selectedId);
    if (tObj) {
      setRentPrice(tObj.rent || 0);
    }
  };

  const handleAddRoom = async () => {
    if (!roomNumber.trim()) {
      toast("กรุณากรอกหมายเลขห้อง", "error");
      return;
    }
    if (!typeId) {
      toast("กรุณาเลือกประเภทห้องพัก", "error");
      return;
    }
    setLoading(true);
    try {
      await api.createRoom({
        dorm_id: dorm.id,
        room_number: roomNumber,
        type_id: typeId,
        rent_price: rentPrice
      });
      toast("เพิ่มห้องพักเรียบร้อยแล้ว", "success");
      await reloadDorm();
      close();
    } catch (err: any) {
      toast(err.message || "ไม่สามารถเพิ่มห้องพักได้", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className={`overlay ${isOpen ? "open" : ""}`} onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="modal-handle"></div>
        <div className="modal-title">เพิ่มห้องพักใหม่</div>
        <div className="r2">
          <div className="fg">
            <label className="fl">หมายเลขห้อง</label>
            <input
              type="text"
              className="inp"
              placeholder="เช่น 301"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="fg">
            <label className="fl">ประเภท</label>
            <select className="sel" value={typeId} onChange={handleTypeChange} disabled={loading}>
              {(dorm?.roomTypes || []).map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="fg">
          <label className="fl">ค่าเช่า/เดือน (บาท)</label>
          <input
            type="number"
            className="inp"
            placeholder="4500"
            value={rentPrice || ""}
            onChange={(e) => setRentPrice(parseInt(e.target.value) || 0)}
            disabled={loading}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
          <button className="btn bg f1" onClick={close} disabled={loading}>ยกเลิก</button>
          <button className="btn bp f1" onClick={handleAddRoom} disabled={loading}>
            {loading ? "กำลังเพิ่ม..." : "เพิ่มห้อง"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- Deposit Modal -----
function DepositModal({ isOpen, close, roomId }: { isOpen: boolean; close: () => void; roomId?: string }) {
  const { dorm, reloadDorm, toast } = useDorm();
  const r = dorm?.rooms?.find((x: any) => x.id === roomId);
  const hist = dorm?.depositHistory?.filter((x: any) => x.room === roomId) || [];

  const [type, setType] = useState("received");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType("received");
      setAmount(0);
      setNote("");
    }
  }, [isOpen]);

  const handleManageDeposit = async () => {
    if (amount <= 0) {
      toast("กรุณากรอกจำนวนเงินมากกว่า 0", "error");
      return;
    }
    setLoading(true);
    try {
      await api.manageDeposit(r?.uuid || roomId!, {
        type,
        amount,
        note
      });
      toast("บันทึกข้อมูลมัดจำเรียบร้อยแล้ว", "success");
      await reloadDorm();
      close();
    } catch (err: any) {
      toast(err.message || "เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className={`overlay ${isOpen ? "open" : ""}`} onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="modal-handle"></div>
        <div className="modal-title">จัดการมัดจำ — ห้อง {roomId}</div>

        <div style={{ background: "var(--s2)", borderRadius: "var(--rsm)", padding: "11px 13px", marginBottom: "13px", fontSize: "13px" }}>
          <div style={{ fontWeight: 700, marginBottom: "4px" }}>ยอดมัดจำปัจจุบัน: ฿{(r?.depositAmount || 0).toLocaleString()}</div>
          <div>สถานะ: {r?.depositStatus === "held" ? "อยู่กับเจ้าของ" : r?.depositStatus === "returned" ? "คืนแล้ว" : "ไม่มี"}</div>
        </div>
        <div className="r2 mb3">
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">ประเภท</label>
            <select className="sel" value={type} onChange={(e) => setType(e.target.value)} disabled={loading}>
              <option value="received">รับมัดจำเพิ่ม</option>
              <option value="partial">หักค่าเสียหาย / ยึดมัดจำ</option>
              <option value="returned">คืนมัดจำ</option>
            </select>
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">จำนวน (บาท)</label>
            <input
              type="number"
              className="inp"
              placeholder="0"
              value={amount || ""}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              disabled={loading}
            />
          </div>
        </div>
        <div className="fg mb3">
          <label className="fl">หมายเหตุ</label>
          <input
            type="text"
            className="inp"
            placeholder="เช่น ค่าความเสียหายห้องพัก"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
          <button className="btn bg f1" onClick={close} disabled={loading}>ปิด</button>
          <button className="btn bp f1" onClick={handleManageDeposit} disabled={loading}>
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>

        <div className="sec-lbl">ประวัติมัดจำ</div>
        <div className="ow" style={{ maxHeight: "200px" }}>
          {hist.length === 0 ? (
            <div style={{ fontSize: "13px", color: "var(--t3)" }}>ยังไม่มีประวัติ</div>
          ) : (
            hist.map((h: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "13px" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{h.type === "received" ? "รับมัดจำ" : h.type === "returned" ? "คืนมัดจำ" : "หักค่าเสียหาย"}</div>
                  <div style={{ fontSize: "11px", color: "var(--t2)" }}>{h.date}{h.note ? " — " + h.note : ""}</div>
                </div>
                <div style={{ fontWeight: 700, color: h.type === "received" ? "var(--green)" : h.type === "returned" ? "var(--blue)" : "var(--red)" }}>
                  ฿{h.amount.toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ----- Tenant Modal -----
function TenantModal({ isOpen, close, roomId, mode }: { isOpen: boolean; close: () => void; roomId?: string; mode?: string }) {
  const { dorm, reloadDorm, toast } = useDorm();
  const r = dorm?.rooms?.find((x: any) => x.id === roomId);

  const [selectedType, setSelectedType] = useState("");
  const [rentPrice, setRentPrice] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [tenantName, setTenantName] = useState("");
  
  const [moveInDate, setMoveInDate] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [waterStart, setWaterStart] = useState(0);
  const [electricStart, setElectricStart] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && r) {
      setSelectedType(r.type || "");
      setRentPrice(r.rentPrice || 0);
      setDeposit(r.depositAmount || 0);
      setTenantName(r.tenant || "");
      setMoveInDate(fromApiDate(r.moveInDate));
      setContractStart(fromApiDate(r.contractStart));
      setContractEnd(fromApiDate(r.contractEnd));
      setWaterStart(r.lastWaterMeter || 0);
      setElectricStart(r.lastElectricMeter || 0);
    }
  }, [isOpen, r]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tName = e.target.value;
    setSelectedType(tName);
    const tObj = dorm?.roomTypes?.find((x: any) => x.name === tName);
    if (tObj) {
      setRentPrice(tObj.rent || 0);
      setDeposit(tObj.deposit || 0);
    }
  };

  const handleCheckin = async () => {
    if (!tenantName.trim()) {
      toast("กรุณากรอกชื่อผู้เช่า", "error");
      return;
    }
    if (!moveInDate || !contractStart || !contractEnd) {
      toast("กรุณาระบุวันที่ให้ครบถ้วน", "error");
      return;
    }
    setLoading(true);
    try {
      await api.checkinTenant(r?.uuid || roomId!, {
        tenant_name: tenantName,
        move_in_date: toApiDate(moveInDate),
        contract_start: toApiDate(contractStart),
        contract_end: toApiDate(contractEnd),
        rent_price: rentPrice,
        deposit_amount: deposit,
        last_water_meter: waterStart,
        last_electric_meter: electricStart
      });
      toast("รับผู้เช่าใหม่สำเร็จ", "success");
      await reloadDorm();
      close();
    } catch (err: any) {
      toast(err.message || "เช็คอินไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const typeObj = dorm?.roomTypes?.find((x: any) => x.name === selectedType);
      await api.updateRoom(r?.uuid || roomId!, {
        type_id: typeObj?.id,
        rent_price: rentPrice,
        tenant_name: r?.status === "vacant" ? null : tenantName,
        contract_start: r?.status === "vacant" ? null : toApiDate(contractStart),
        contract_end: r?.status === "vacant" ? null : toApiDate(contractEnd)
      });
      toast("บันทึกการแก้ไขสำเร็จ", "success");
      await reloadDorm();
      close();
    } catch (err: any) {
      toast(err.message || "แก้ไขไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการทำรายการย้ายออก? ระบบจะคืนมัดจำและเปลี่ยนสถานะห้องเป็นห้องว่าง")) return;
    setLoading(true);
    try {
      await api.checkoutTenant(r?.uuid || roomId!, { note: "ย้ายออก / ยกเลิกสัญญา" });
      toast("ทำรายการย้ายออกสำเร็จ", "success");
      await reloadDorm();
      close();
    } catch (err: any) {
      toast(err.message || "ย้ายออกไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  const titles: any = { checkin: "รับผู้เช่าใหม่ — ห้อง " + roomId, edit: "แก้ไขข้อมูล — ห้อง " + roomId };

  return (
    <div className={`overlay ${isOpen ? "open" : ""}`} onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="modal-handle"></div>
        <div className="modal-title">{titles[mode || "edit"]}</div>

        {mode === "checkin" && (
          <>
            <div className="fg">
              <label className="fl">ชื่อผู้เช่า</label>
              <input
                type="text"
                className="inp"
                placeholder="ชื่อ-นามสกุล"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="r2">
              <div className="fg">
                <label className="fl">ประเภทห้อง</label>
                <select className="sel" value={selectedType} onChange={handleTypeChange} disabled={loading}>
                  <option value="">เลือกประเภท</option>
                  {(dorm?.roomTypes || []).map((t: any) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="fl">ค่าเช่า/เดือน (บาท)</label>
                <input
                  type="number"
                  className="inp"
                  value={rentPrice || ""}
                  onChange={(e) => setRentPrice(parseInt(e.target.value) || 0)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="r2">
              <div className="fg">
                <label className="fl">วันที่เข้าอยู่</label>
                <input
                  type="date"
                  className="inp"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="fg">
                <label className="fl">ค่ามัดจำ (บาท)</label>
                <input
                  type="number"
                  className="inp"
                  value={deposit || ""}
                  onChange={(e) => setDeposit(parseInt(e.target.value) || 0)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="r2">
              <div className="fg">
                <label className="fl">วันเริ่มสัญญา</label>
                <input
                  type="date"
                  className="inp"
                  value={contractStart}
                  onChange={(e) => setContractStart(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="fg">
                <label className="fl">วันสิ้นสุดสัญญา</label>
                <input
                  type="date"
                  className="inp"
                  value={contractEnd}
                  onChange={(e) => setContractEnd(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="r2">
              <div className="fg">
                <label className="fl">มิเตอร์น้ำเริ่มต้น</label>
                <input
                  type="number"
                  className="inp"
                  value={waterStart}
                  onChange={(e) => setWaterStart(parseInt(e.target.value) || 0)}
                  disabled={loading}
                />
              </div>
              <div className="fg">
                <label className="fl">มิเตอร์ไฟเริ่มต้น</label>
                <input
                  type="number"
                  className="inp"
                  value={electricStart}
                  onChange={(e) => setElectricStart(parseInt(e.target.value) || 0)}
                  disabled={loading}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <button className="btn bg f1" onClick={close} disabled={loading}>ยกเลิก</button>
              <button className="btn bp f1" onClick={handleCheckin} disabled={loading}>
                {loading ? "กำลังบันทึก..." : "ยืนยันรับผู้เช่า"}
              </button>
            </div>
          </>
        )}

        {mode === "edit" && r?.status === "vacant" && (
          <>
            <div className="r2">
              <div className="fg">
                <label className="fl">ประเภทห้อง</label>
                <select className="sel" value={selectedType} onChange={handleTypeChange} disabled={loading}>
                  <option value="">เลือกประเภท</option>
                  {(dorm?.roomTypes || []).map((t: any) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="fl">ค่าเช่าเริ่มต้น (บาท)</label>
                <input
                  type="number"
                  className="inp"
                  value={rentPrice || ""}
                  onChange={(e) => setRentPrice(parseInt(e.target.value) || 0)}
                  disabled={loading}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <button className="btn bg f1" onClick={close} disabled={loading}>ยกเลิก</button>
              <button className="btn bp f1" onClick={handleUpdate} disabled={loading}>
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </>
        )}

        {mode === "edit" && r?.status !== "vacant" && (
          <>
            <div className="fg">
              <label className="fl">ชื่อผู้เช่า</label>
              <input
                type="text"
                className="inp"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="fg">
              <label className="fl">ลิงก์เข้าใช้งานสำหรับผู้เช่า (Room Link)</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  className="inp"
                  value={typeof window !== "undefined" ? `${window.location.origin}/tenant/login?key=${r?.uuid || ""}` : ""}
                  readOnly
                  style={{ background: "var(--bg)", color: "var(--t2)", fontSize: "12px", textOverflow: "ellipsis" }}
                />
                <button
                  type="button"
                  className="btn bg"
                  style={{ padding: "0 12px", whiteSpace: "nowrap", fontSize: "12px" }}
                  onClick={() => {
                    const link = `${window.location.origin}/tenant/login?key=${r?.uuid}`;
                    navigator.clipboard.writeText(link);
                    toast("คัดลอกลิงก์ทางเข้าสำหรับผู้เช่าเรียบร้อยแล้ว!", "success");
                  }}
                >
                  คัดลอกลิงก์
                </button>
              </div>
              <div className="hint" style={{ marginTop: "4px" }}>
                รหัสห้องพัก (Room Key): <code style={{ fontFamily: "monospace", color: "var(--t2)" }}>{r?.uuid}</code>
              </div>
            </div>
            <div className="r2">
              <div className="fg">
                <label className="fl">ประเภทห้อง</label>
                <select className="sel" value={selectedType} onChange={handleTypeChange} disabled={loading}>
                  <option value="">เลือกประเภท</option>
                  {(dorm?.roomTypes || []).map((t: any) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="fl">ค่าเช่า/เดือน (บาท)</label>
                <input
                  type="number"
                  className="inp"
                  value={rentPrice || ""}
                  onChange={(e) => setRentPrice(parseInt(e.target.value) || 0)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="r2">
              <div className="fg">
                <label className="fl">วันเริ่มสัญญา</label>
                <input
                  type="date"
                  className="inp"
                  value={contractStart}
                  onChange={(e) => setContractStart(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="fg">
                <label className="fl">วันสิ้นสุดสัญญา</label>
                <input
                  type="date"
                  className="inp"
                  value={contractEnd}
                  onChange={(e) => setContractEnd(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <button className="btn bg f1" onClick={close} disabled={loading}>ยกเลิก</button>
              <button className="btn bp f1" onClick={handleUpdate} disabled={loading}>
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
            <div className="div mt4" style={{ height: "1px", background: "var(--border)", margin: "14px 0" }}></div>
            <button className="btn bd bblk" onClick={handleCheckout} disabled={loading}>
              {loading ? "กำลังทำรายการ..." : "ย้ายออก / ยกเลิกสัญญา"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ----- Extra Modal -----
function ExtraModal({ isOpen, close, roomId }: { isOpen: boolean; close: () => void; roomId?: string }) {
  const { meterDraft, setMeterDraft } = useDorm();
  const draft = roomId && meterDraft[roomId] ? meterDraft[roomId] : { w: "", e: "", extras: [] };
  const [items, setItems] = useState<{ desc: string; amt: number }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setItems([...(draft.extras || [])]);
    }
  }, [isOpen, roomId]);

  const addRow = () => setItems([...items, { desc: "", amt: 0 }]);
  const updateRow = (i: number, field: "desc" | "amt", val: string) => {
    const newItems = [...items];
    if (field === "desc") newItems[i].desc = val;
    else newItems[i].amt = parseInt(val) || 0;
    setItems(newItems);
  };
  const removeRow = (i: number) => {
    const newItems = [...items];
    newItems.splice(i, 1);
    setItems(newItems);
  };

  const save = () => {
    if (roomId) {
      const validItems = items.filter((x) => x.desc.trim() && x.amt > 0);
      setMeterDraft((prev: any) => ({
        ...prev,
        [roomId]: { ...(prev[roomId] || { w: "", e: "", extras: [] }), extras: validItems }
      }));
    }
    close();
  };

  if (!isOpen) return null;
  return (
    <div className={`overlay ${isOpen ? "open" : ""}`} onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="modal-handle"></div>
        <div className="modal-title">ค่าใช้จ่ายเพิ่มเติม — ห้อง {roomId}</div>

        <div style={{ marginBottom: "14px" }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input
                type="text"
                className="inp"
                style={{ flex: 2, marginBottom: 0 }}
                placeholder="รายการ เช่น ค่าคีย์การ์ด"
                value={it.desc}
                onChange={(e) => updateRow(i, "desc", e.target.value)}
              />
              <input
                type="number"
                className="inp"
                style={{ flex: 1, marginBottom: 0 }}
                placeholder="จำนวนเงิน (บาท)"
                value={it.amt || ""}
                onChange={(e) => updateRow(i, "amt", e.target.value)}
              />
              <button className="btn bd" style={{ padding: "0 8px" }} onClick={() => removeRow(i)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "15px", height: "15px" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button className="btn bline bsm mb4" style={{ width: "100%" }} onClick={addRow}>+ เพิ่มรายการ</button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn bg f1" onClick={close}>ยกเลิก</button>
          <button className="btn bp f1" onClick={save}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}

// ----- Confirm Delete Modal -----
function ConfirmDeleteModal({ isOpen, close, typeId }: { isOpen: boolean; close: () => void; typeId?: string }) {
  const { reloadDorm, toast } = useDorm();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!typeId) return;
    setLoading(true);
    try {
      await api.deleteRoomType(typeId);
      toast("ลบประเภทห้องเรียบร้อยแล้ว", "success");
      await reloadDorm();
      close();
    } catch (err: any) {
      toast(err.message || "ไม่สามารถลบประเภทห้องได้", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className={`overlay ${isOpen ? "open" : ""}`} onClick={close}>
      <div className="modal" style={{ maxWidth: "400px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "var(--rl)", color: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: "28px", height: "28px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <div className="modal-title" style={{ marginBottom: "8px" }}>ยืนยันการลบ</div>
        <div style={{ fontSize: "14px", color: "var(--t2)", marginBottom: "24px" }}>คุณแน่ใจหรือไม่ว่าต้องการลบประเภทห้องนี้? การลบประเภทห้องจะไม่สามารถเรียกคืนได้</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn bg f1" onClick={close} disabled={loading}>ยกเลิก</button>
          <button className="btn bd f1" onClick={handleDelete} disabled={loading}>
            {loading ? "กำลังลบ..." : "ลบประเภทห้อง"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- Bill Preview Modal -----
function BillPreviewModal({ isOpen, close }: { isOpen: boolean; close: () => void }) {
  if (!isOpen) return null;
  return (
    <div className={`overlay ${isOpen ? "open" : ""}`} onClick={close}>
      <div className="modal" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle"></div>
        <div className="modal-title">ตรวจสอบบิลก่อนส่ง</div>
        <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
          <button className="btn bg f1" onClick={close}>แก้ไข</button>
          <button className="btn bp f1">สร้างบิลทั้งหมด</button>
          <button className="btn bline f1">สร้าง + แจ้ง LINE</button>
        </div>
      </div>
    </div>
  );
}

// ----- Pay Modal -----
function PayModal({ isOpen, close, modalData }: { isOpen: boolean; close: () => void; modalData: any }) {
  const { reloadDorm, toast } = useDorm();
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split("T")[0]);
      setNote("");
    }
  }, [isOpen]);

  const handlePaySubmit = async () => {
    if (!date) {
      toast("กรุณาระบุวันที่โอน", "error");
      return;
    }
    setLoading(true);
    try {
      await api.updateBill(modalData.billId, {
        status: "pending_approval",
        pay_note: note,
        slip_image_url: "https://example.com/mock-slip.jpg", // Mock slip url for submission
        paid_date: toApiDate(date)
      });
      toast("แจ้งชำระเงินเรียบร้อยแล้ว ระบบกำลังตรวจสอบ", "success");
      await reloadDorm();
      close();
    } catch (err: any) {
      toast(err.message || "แจ้งชำระเงินไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className={`overlay ${isOpen ? "open" : ""}`} onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="modal-handle"></div>
        <div className="modal-title">แจ้งการชำระเงิน</div>
        <div className="alert al-info mb4">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          โอนเงินเข้าพร้อมเพย์ <strong>{modalData?.promptpay || "พร้อมเพย์หอพัก"}</strong> แล้วกดยืนยัน
        </div>
        <div className="fg">
          <label className="fl">วันที่โอน</label>
          <input
            type="date"
            className="inp"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="fg">
          <label className="fl">หมายเหตุ <span>(ไม่บังคับ)</span></label>
          <input
            type="text"
            className="inp"
            placeholder="เช่น โอนจากบัญชีธนาคารกสิกรไทย"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
          <button className="btn bg f1" onClick={close} disabled={loading}>ยกเลิก</button>
          <button className="btn bp f1" onClick={handlePaySubmit} disabled={loading}>
            {loading ? "กำลังส่ง..." : "ยืนยันแจ้งชำระ"}
          </button>
        </div>
      </div>
    </div>
  );
}
