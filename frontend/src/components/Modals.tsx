"use client";

import React, { useState, useEffect } from "react";
import { useDorm, TH_MONTHS } from "@/context/DormContext";
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
      <ExtraModal isOpen={activeModal === "m-extra"} close={closeModal} roomId={modalData?.roomId} draftKey={modalData?.draftKey} />
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
      
      let defaultDeposit = r.depositAmount || 0;
      if (!defaultDeposit && r.type) {
        const tObj = dorm?.roomTypes?.find((x: any) => x.name === r.type);
        if (tObj) {
          defaultDeposit = tObj.deposit || 0;
        }
      }
      setDeposit(defaultDeposit);
      
      setTenantName(r.tenant || "");
      setMoveInDate(fromApiDate(r.moveInDate));
      setContractStart(fromApiDate(r.contractStart));
      setContractEnd(fromApiDate(r.contractEnd));
      setWaterStart(r.lastWaterMeter || 0);
      setElectricStart(r.lastElectricMeter || 0);
    }
  }, [isOpen, r, dorm]);

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
        deposit_amount: deposit,
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
            <div className="fg mb3">
              <label className="fl">ค่ามัดจำเริ่มต้น (บาท)</label>
              <input
                type="number"
                className="inp"
                value={deposit || ""}
                onChange={(e) => setDeposit(parseInt(e.target.value) || 0)}
                disabled={loading}
              />
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
                  value={typeof window !== "undefined" ? `${window.location.origin}/tenant/home?key=${r?.uuid || ""}` : ""}
                  readOnly
                  style={{ background: "var(--bg)", color: "var(--t2)", fontSize: "12px", textOverflow: "ellipsis" }}
                />
                <button
                  type="button"
                  className="btn bg"
                  style={{ padding: "0 12px", whiteSpace: "nowrap", fontSize: "12px" }}
                  onClick={() => {
                    const link = `${window.location.origin}/tenant/home?key=${r?.uuid}`;
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
            <div className="fg mb3">
              <label className="fl">ค่ามัดจำ (บาท)</label>
              <input
                type="number"
                className="inp"
                value={deposit || ""}
                onChange={(e) => setDeposit(parseInt(e.target.value) || 0)}
                disabled={loading}
              />
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
function ExtraModal({ isOpen, close, roomId, draftKey }: { isOpen: boolean; close: () => void; roomId?: string; draftKey?: string }) {
  const { meterDraft, setMeterDraft } = useDorm();
  const draft = roomId && draftKey && meterDraft[draftKey]?.[roomId] ? meterDraft[draftKey][roomId] : { w: "", e: "", extras: [] };
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
    if (roomId && draftKey) {
      const validItems = items.filter((x) => x.desc.trim() && x.amt > 0);
      setMeterDraft((prev: any) => {
        const periodDraft = prev[draftKey] || {};
        return {
          ...prev,
          [draftKey]: {
            ...periodDraft,
            [roomId]: { ...(periodDraft[roomId] || { w: "", e: "", extras: [] }), extras: validItems }
          }
        };
      });
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
  const { dorm, savedMeterDraft, setSavedMeterDraft, reloadDorm, toast } = useDorm();
  
  const currentMonthIdx = new Date().getMonth();
  const currentYearBE = new Date().getFullYear() + 543;
  
  const [month, setMonth] = useState(TH_MONTHS[currentMonthIdx]);
  const [year, setYear] = useState(currentYearBE);
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [issueDate, setIssueDate] = useState(todayStr);
  
  // Default due date: 7 days from today
  const defaultDueDateStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  })();
  const [dueDate, setDueDate] = useState(defaultDueDateStr);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMonth(TH_MONTHS[new Date().getMonth()]);
      setYear(new Date().getFullYear() + 543);
      setIssueDate(new Date().toISOString().split("T")[0]);
      
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setDueDate(d.toISOString().split("T")[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;
  if (!dorm) return null;

  const waterRate = dorm.waterRate || 18;
  const elecRate = dorm.electricRate || 8;
  const occupiedRooms = dorm.rooms ? dorm.rooms.filter((r: any) => r.status === "occupied") : [];

  const draftKey = `${dorm.id}_${month}_${year}`;
  const periodSavedDraft = savedMeterDraft[draftKey] || {};

  // Helper to dynamically calculate starting meters from previous month
  const getPreviousMeterReadings = (roomId: string, roomObj: any) => {
    // 1. Find all bills for this room
    const roomBills = dorm.bills?.filter((b: any) => b.room === roomObj.id) || [];
    
    // Convert selected month/year to chronological weight for comparison
    const selectedMonthIdx = TH_MONTHS.indexOf(month);
    const selectedWeight = year * 12 + selectedMonthIdx;
    
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
    const prevYear = selectedMonthIdx === 0 ? year - 1 : year;
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

  // Compile rooms with complete water & electric readings from the saved draft
  const completeRooms = occupiedRooms.filter((r: any) => {
    const draft = periodSavedDraft[r.id];
    if (!draft) return false;
    const wNew = parseInt(draft.w);
    const { wOld, eOld } = getPreviousMeterReadings(r.id, r);
    const eNew = parseInt(draft.e);
    return !isNaN(wNew) && wNew >= wOld && !isNaN(eNew) && eNew >= eOld;
  });

  const handleCreateBills = async () => {
    if (completeRooms.length === 0) {
      toast("ไม่มีห้องที่พร้อมสร้างบิล", "error");
      return;
    }
    if (!issueDate || !dueDate) {
      toast("กรุณากรอกวันที่ออกบิลและวันครบกำหนดชำระ", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        dorm_id: dorm.id,
        month: month,
        year: parseInt(String(year)),
        issue_date: toApiDate(issueDate),
        due_date: toApiDate(dueDate),
        bills: completeRooms.map((r: any) => {
          const draft = periodSavedDraft[r.id];
          const wNew = parseInt(draft.w);
          const { wOld, eOld } = getPreviousMeterReadings(r.id, r);
          const eNew = parseInt(draft.e);
          
          const wCost = (wNew - wOld) * waterRate;
          const eCost = (eNew - eOld) * elecRate;
          const rent = r.rentPrice || 0;
          const extList = draft.extras || [];
          const extTotal = extList.reduce((acc: number, cur: any) => acc + (cur.amt || 0), 0);
          const total = rent + wCost + eCost + extTotal;
          
          return {
            room_id: r.roomUuid,
            rent: rent,
            water_start: wOld,
            water_end: wNew,
            electric_start: eOld,
            electric_end: eNew,
            extra_charges: extList.map((x: any) => ({ desc: x.desc, amt: Number(x.amt) })),
            total: total
          };
        })
      };

      await api.bulkCreateBills(payload);
      
      // Clear saved drafts of generated rooms
      const nextSavedDraft = { ...savedMeterDraft };
      const nextPeriodSavedDraft = { ...nextSavedDraft[draftKey] };
      completeRooms.forEach((r: any) => {
        delete nextPeriodSavedDraft[r.id];
      });
      nextSavedDraft[draftKey] = nextPeriodSavedDraft;
      setSavedMeterDraft(nextSavedDraft);

      toast(`สร้างบิลและส่งแจ้งเตือนไลน์สำเร็จจำนวน ${completeRooms.length} ห้อง`, "success");
      await reloadDorm();
      close();
    } catch (err: any) {
      toast(err.message || "สร้างบิลไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`overlay ${isOpen ? "open" : ""}`} onClick={close}>
      <div className="modal" style={{ maxWidth: "720px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={close} disabled={loading}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="modal-handle"></div>
        <div className="modal-title">ตรวจสอบและส่งแจ้งเตือนไลน์</div>

        {/* Configurations */}
        <div className="r2 mb4 mt4">
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">ประจำเดือน</label>
            <select className="sel" value={month} onChange={(e) => setMonth(e.target.value)} disabled={loading}>
              {TH_MONTHS.map((m: string) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">ปี พ.ศ.</label>
            <input type="number" className="inp" value={year} onChange={(e) => setYear(parseInt(e.target.value) || currentYearBE)} disabled={loading} />
          </div>
        </div>

        <div className="r2 mb4">
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">วันที่ออกบิล</label>
            <input type="date" className="inp" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} disabled={loading} />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">ครบกำหนดชำระ</label>
            <input type="date" className="inp" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={loading} />
          </div>
        </div>

        {/* Preview Table */}
        <div style={{ maxHeight: "320px", overflow: "auto", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", background: "var(--bg)" }} className="mb4">
          {completeRooms.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--t3)" }}>
              ไม่พบข้อมูลมิเตอร์ที่กรอกครบถ้วน <br />
              <span style={{ fontSize: "12px" }}>กรุณากรอกค่าน้ำและค่าไฟในเมนู "จดมิเตอร์+บันทึกร่าง" ก่อน</span>
            </div>
          ) : (
            <table className="meter-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: "12px", borderBottom: "1.5px solid var(--border)" }}>
                  <th style={{ padding: "8px 4px" }}>ห้อง / ผู้เช่า</th>
                  <th style={{ padding: "8px 4px", textAlign: "right" }}>ค่าเช่า</th>
                  <th style={{ padding: "8px 4px", textAlign: "right" }}>ค่าน้ำ</th>
                  <th style={{ padding: "8px 4px", textAlign: "right" }}>ค่าไฟ</th>
                  <th style={{ padding: "8px 4px", textAlign: "right" }}>อื่นๆ</th>
                  <th style={{ padding: "8px 4px", textAlign: "right" }}>รวมสุทธิ</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "13px" }}>
                {completeRooms.map((r: any) => {
                  const draft = periodSavedDraft[r.id];
                  const wNew = parseInt(draft.w);
                  const { wOld, eOld } = getPreviousMeterReadings(r.id, r);
                  const wDiff = wNew - wOld;
                  const wCost = wDiff * waterRate;

                  const eNew = parseInt(draft.e);
                  const eDiff = eNew - eOld;
                  const eCost = eDiff * elecRate;

                  const rent = r.rentPrice || 0;
                  const extList = draft.extras || [];
                  const extTotal = extList.reduce((acc: number, cur: any) => acc + (cur.amt || 0), 0);
                  const total = rent + wCost + eCost + extTotal;

                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border2)" }}>
                      <td style={{ padding: "8px 4px" }}>
                        <div style={{ fontWeight: 600 }}>ห้อง {r.room_number || r.id}</div>
                        <div style={{ fontSize: "11px", color: "var(--t2)" }}>{r.tenant || "ไม่มีชื่อ"}</div>
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 500 }}>฿{rent.toLocaleString()}</td>
                      <td style={{ padding: "8px 4px", textAlign: "right" }}>
                        <div>฿{wCost.toLocaleString()}</div>
                        <div style={{ fontSize: "10px", color: "var(--t3)" }}>{wDiff} หน่วย</div>
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right" }}>
                        <div>฿{eCost.toLocaleString()}</div>
                        <div style={{ fontSize: "10px", color: "var(--t3)" }}>{eDiff} หน่วย</div>
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right" }}>
                        <div>฿{extTotal.toLocaleString()}</div>
                        {extList.length > 0 && (
                          <div style={{ fontSize: "9px", color: "var(--t3)", maxWidth: "100px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={extList.map((x: any) => `${x.desc}: ฿${x.amt}`).join(", ")}>
                            {extList.map((x: any) => x.desc).join(", ")}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 700, color: "var(--green)" }}>฿{total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {completeRooms.length > 0 && (
          <div className="alert al-info mb4" style={{ fontSize: "12px" }}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            พร้อมสร้างบิลทั้งหมด <strong>{completeRooms.length} ห้อง</strong>
            {dorm.promptpay ? "" : " (กรุณาตั้งค่า พร้อมเพย์ เพื่อเปิดรับชำระผ่านระบบ)"}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
          <button type="button" className="btn bg f1" onClick={close} disabled={loading}>ยกเลิก</button>
          <button type="button" className="btn bp f1" onClick={handleCreateBills} disabled={loading || completeRooms.length === 0}>
            {loading ? "กำลังสร้างบิล..." : `สร้างบิลและแจ้งเตือนไลน์ (${completeRooms.length} ห้อง)`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- Pay Modal -----
function PayModal({ isOpen, close, modalData }: { isOpen: boolean; close: () => void; modalData: any }) {
  const { reloadDorm, toast, tenantRoom, tenantDormId } = useDorm();
  const [amount, setAmount] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [paymentTime, setPaymentTime] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(modalData?.amount ? String(modalData.amount) : "");
      setReferenceNumber("");
      setPaymentTime("");
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    }
  }, [isOpen, modalData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast("รองรับเฉพาะไฟล์รูปภาพ JPG, JPEG, PNG เท่านั้น", "error");
        return;
      }
      if (selectedFile.size > 2 * 1024 * 1024) {
        toast("ขนาดไฟล์ต้องไม่เกิน 2MB", "error");
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast("กรุณาระบุยอดเงินที่โอนให้ถูกต้อง", "error");
      return;
    }
    if (!file) {
      toast("กรุณาอัปโหลดหลักฐานการโอนเงิน (สลิป)", "error");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("dorm_id", tenantDormId || "");
      formData.append("room_id", tenantRoom || "");
      formData.append("amount", amount);
      formData.append("reference_number", referenceNumber);
      if (paymentTime) {
        formData.append("payment_time", new Date(paymentTime).toISOString());
      }
      formData.append("payment_type", "online");
      formData.append("file", file);

      await api.createOrder(formData);
      toast("แจ้งชำระเงินสำเร็จ ระบบส่งหลักฐานให้ผู้ดูแลตรวจสอบแล้ว", "success");
      
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
          โอนเงินเข้าพร้อมเพย์ <strong>{modalData?.promptpay || "พร้อมเพย์หอพัก"}</strong> ยอดเงิน <strong>฿{parseFloat(modalData?.amount || 0).toLocaleString()}</strong> แล้วส่งสลิปเพื่อแจ้งโอนเงิน
        </div>
        
        <form onSubmit={handlePaySubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">ยอดเงินโอน (บาท) *</label>
            <input 
              type="number" 
              step="0.01"
              className="inp" 
              placeholder="ระบุยอดเงินที่โอนจริงตามสลิป" 
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">เลขที่อ้างอิงรายการ (ถ้ามี)</label>
            <input 
              type="text" 
              className="inp" 
              placeholder="ระบุเลขอ้างอิงจากสลิปเพื่อช่วยในการตรวจ" 
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">วันเวลาที่โอนเงิน (ถ้ามี)</label>
            <input 
              type="datetime-local" 
              className="inp" 
              value={paymentTime}
              onChange={e => setPaymentTime(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">อัปโหลดรูปภาพสลิป (JPEG, PNG ไม่เกิน 2MB) *</label>
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/jpg"
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="modal-slip-upload-input"
              disabled={loading}
            />
            <label 
              htmlFor="modal-slip-upload-input" 
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                border: "2.5px dashed var(--border2)",
                borderRadius: "8px",
                cursor: "pointer",
                background: "var(--bg)",
                textAlign: "center",
                gap: "6px"
              }}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: 32, height: 32, color: "var(--t3)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span style={{ fontSize: "13px", fontWeight: "600" }}>
                {file ? file.name : "คลิกเลือกรูปภาพสลิป"}
              </span>
              <span style={{ fontSize: "11px", color: "var(--t3)" }}>
                JPEG, PNG ขนาดไม่เกิน 2MB
              </span>
            </label>
          </div>

          {previewUrl && (
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">ตัวอย่างรูปสลิป</label>
              <div style={{ position: "relative", width: "100%", maxHeight: "200px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)", display: "flex", justifyContent: "center", background: "black" }}>
                <img src={previewUrl} alt="Preview" style={{ maxHeight: "200px", objectFit: "contain" }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <button type="button" className="btn bg f1" onClick={close} disabled={loading}>ยกเลิก</button>
            <button type="submit" className="btn bp f1" disabled={loading}>
              {loading ? "กำลังส่ง..." : "ยืนยันแจ้งชำระ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
