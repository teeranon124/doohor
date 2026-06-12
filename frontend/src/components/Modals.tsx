
"use client";
import React, { useState, useEffect } from 'react';
import { useDorm } from '@/context/DormContext';

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

  const handleClose = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('overlay')) {
      closeModal();
    }
  };

  if (!activeModal) return null;

  return (
    <>
      <AddDormModal isOpen={activeModal==='m-add-dorm'} close={closeModal} />
      <AddRoomModal isOpen={activeModal==='m-add-room'} close={closeModal} />
      <DepositModal isOpen={activeModal==='m-deposit'} close={closeModal} roomId={modalData?.roomId} />
      <TenantModal isOpen={activeModal==='m-tenant'} close={closeModal} roomId={modalData?.roomId} mode={modalData?.mode} />
      <ExtraModal isOpen={activeModal==='m-extra'} close={closeModal} roomId={modalData?.roomId} />
      <ConfirmDeleteModal isOpen={activeModal==='m-confirm-delete'} close={closeModal} typeId={modalData?.typeId} />
      <BillPreviewModal isOpen={activeModal==='m-bill-preview'} close={closeModal} />
      <PayModal isOpen={activeModal==='m-pay'} close={closeModal} />
    </>
  );
}

// ----- Add Dorm Modal -----
function AddDormModal({ isOpen, close }: { isOpen: boolean, close: () => void }) {
  if (!isOpen) return null;
  return (
    <div className={`overlay ${isOpen?'open':''}`} onClick={close}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div className="modal-handle"></div>
        <div className="modal-title">เพิ่มหอพักใหม่</div>
        <div className="fg"><label className="fl">ชื่อหอพัก</label><input type="text" className="inp" placeholder="เช่น Dormy สาขา 2" /></div>
        <div className="fg"><label className="fl">ที่อยู่ / สาขา <span>(ไม่บังคับ)</span></label><input type="text" className="inp" placeholder="เช่น ซอยรามคำแหง 24" /></div>
        <div className="fg"><label className="fl">เบอร์พร้อมเพย์</label><input type="text" className="inp" placeholder="081-XXX-XXXX" /></div>
        <div style={{display:'flex',gap:'8px',marginTop:'6px'}}>
          <button className="btn bg f1" onClick={close}>ยกเลิก</button>
          <button className="btn bp f1" onClick={()=>alert('ยังไม่ได้เขียนฟังก์ชันนี้')}>เพิ่มหอ</button>
        </div>
      </div>
    </div>
  );
}

// ----- Add Room Modal -----
function AddRoomModal({ isOpen, close }: { isOpen: boolean, close: () => void }) {
  if (!isOpen) return null;
  const { dorm } = useDorm();
  return (
    <div className={`overlay ${isOpen?'open':''}`} onClick={close}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div className="modal-handle"></div>
        <div className="modal-title">เพิ่มห้องพักใหม่</div>
        <div className="r2">
          <div className="fg"><label className="fl">หมายเลขห้อง</label><input type="text" className="inp" placeholder="เช่น 301" /></div>
          <div className="fg">
            <label className="fl">ประเภท</label>
            <select className="sel">
              {(dorm?.roomTypes||[]).map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="fg"><label className="fl">ค่าเช่า/เดือน (บาท)</label><input type="number" className="inp" placeholder="4500" /></div>
        <div style={{display:'flex',gap:'8px',marginTop:'6px'}}>
          <button className="btn bg f1" onClick={close}>ยกเลิก</button>
          <button className="btn bp f1">เพิ่มห้อง</button>
        </div>
      </div>
    </div>
  );
}

// ----- Deposit Modal -----
function DepositModal({ isOpen, close, roomId }: { isOpen: boolean, close: () => void, roomId?: string }) {
  if (!isOpen) return null;
  const { dorm } = useDorm();
  const r = dorm?.rooms?.find((x:any)=>x.id===roomId);
  const hist = dorm?.depositHistory?.filter((x:any)=>x.room===roomId) || [];

  return (
    <div className={`overlay ${isOpen?'open':''}`} onClick={close}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div className="modal-handle"></div>
        <div className="modal-title">จัดการมัดจำ — ห้อง {roomId}</div>
        
        <div style={{background:'var(--s2)',borderRadius:'var(--rsm)',padding:'11px 13px',marginBottom:'13px',fontSize:'13px'}}>
          <div style={{fontWeight:700,marginBottom:'4px'}}>ยอดมัดจำ: ฿{(r?.depositAmount||0).toLocaleString()}</div>
          <div>สถานะ: {r?.depositStatus==='held'?'อยู่กับเจ้าของ':r?.depositStatus==='returned'?'คืนแล้ว':'ไม่มี'}</div>
        </div>
        <div className="r2 mb3">
          <div className="fg" style={{marginBottom:0}}>
            <label className="fl">ประเภท</label>
            <select className="sel"><option value="received">รับมัดจำเพิ่ม</option><option value="partial">หักค่าเสียหาย</option></select>
          </div>
          <div className="fg" style={{marginBottom:0}}>
            <label className="fl">จำนวน (บาท)</label>
            <input type="number" className="inp" placeholder="0" />
          </div>
        </div>
        <div className="fg mb3"><label className="fl">หมายเหตุ</label><input type="text" className="inp" placeholder="ถ้ามี" /></div>
        <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
          <button className="btn bg f1" onClick={close}>ปิด</button>
          <button className="btn bp f1">บันทึก</button>
        </div>
        
        <div className="sec-lbl">ประวัติมัดจำ</div>
        <div className="ow" style={{maxHeight:'200px'}}>
          {hist.length===0?<div style={{fontSize:'13px',color:'var(--t3)'}}>ยังไม่มีประวัติ</div>:hist.map((h:any,i:number)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:'13px'}}>
              <div><div style={{fontWeight:600}}>{h.type==='received'?'รับมัดจำ':h.type==='returned'?'คืนมัดจำ':'หักค่าเสียหาย'}</div><div style={{fontSize:'11px',color:'var(--t2)'}}>{h.date}{h.note?' — '+h.note:''}</div></div>
              <div style={{fontWeight:700,color:h.type==='received'?'var(--green)':h.type==='returned'?'var(--blue)':'var(--red)'}}>฿{h.amount.toLocaleString()}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ----- Tenant Modal -----
function TenantModal({ isOpen, close, roomId, mode }: { isOpen: boolean, close: () => void, roomId?: string, mode?: string }) {
  const { dorm, setData, data } = useDorm();
  const r = dorm?.rooms?.find((x:any)=>x.id===roomId);
  
  const [selectedType, setSelectedType] = useState(r?.type || '');
  const [rentPrice, setRentPrice] = useState(r?.rentPrice || 0);
  const [deposit, setDeposit] = useState(r?.depositAmount || 0);
  
  useEffect(() => {
    if (isOpen) {
      setSelectedType(r?.type || '');
      setRentPrice(r?.rentPrice || 0);
      setDeposit(r?.depositAmount || 0);
    }
  }, [isOpen, r]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tName = e.target.value;
    setSelectedType(tName);
    const tObj = dorm?.roomTypes?.find((x:any)=>x.name===tName);
    if (tObj) {
      setRentPrice(tObj.rent || 0);
      setDeposit(tObj.deposit || 0);
    }
  };

  if (!isOpen) return null;
  const titles:any = {checkin:'รับผู้เช่าใหม่ — ห้อง '+roomId, edit:'แก้ไขข้อมูล — ห้อง '+roomId, checkout:'ย้ายออก — ห้อง '+roomId};

  return (
    <div className={`overlay ${isOpen?'open':''}`} onClick={close}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div className="modal-handle"></div>
        <div className="modal-title">{titles[mode||'edit']}</div>
        
        {mode === 'checkin' && (
          <>
          <div className="fg"><label className="fl">ชื่อผู้เช่า</label><input type="text" className="inp" placeholder="ชื่อ-นามสกุล" /></div>
          <div className="r2">
            <div className="fg">
              <label className="fl">ประเภทห้อง</label>
              <select className="sel" value={selectedType} onChange={handleTypeChange}>
                <option value="">เลือกประเภท</option>
                {(dorm?.roomTypes||[]).map((t:any)=><option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">ค่าเช่า/เดือน (บาท)</label><input type="number" className="inp" value={rentPrice||''} onChange={e=>setRentPrice(parseInt(e.target.value))} /></div>
          </div>
          <div className="r2">
            <div className="fg"><label className="fl">วันที่เข้าอยู่</label><input type="date" className="inp" /></div>
            <div className="fg"><label className="fl">ค่ามัดจำ (บาท)</label><input type="number" className="inp" value={deposit||''} onChange={e=>setDeposit(parseInt(e.target.value))} /></div>
          </div>
          <div className="r2">
            <div className="fg"><label className="fl">วันเริ่มสัญญา</label><input type="date" className="inp" /></div>
            <div className="fg"><label className="fl">วันสิ้นสุดสัญญา</label><input type="date" className="inp" /></div>
          </div>
          <div className="r2">
            <div className="fg"><label className="fl">มิเตอร์น้ำเริ่มต้น</label><input type="number" className="inp" defaultValue={r?.lastWaterMeter||0} /></div>
            <div className="fg"><label className="fl">มิเตอร์ไฟเริ่มต้น</label><input type="number" className="inp" defaultValue={r?.lastElectricMeter||0} /></div>
          </div>
          <div style={{display:'flex',gap:'8px',marginTop:'6px'}}>
            <button className="btn bg f1" onClick={close}>ยกเลิก</button>
            <button className="btn bp f1" onClick={()=>alert('ยังไม่ได้ทำระบบ Save ลง Database ครับ')}>ยืนยันรับผู้เช่า</button>
          </div>
          </>
        )}

        {mode === 'edit' && r?.status === 'vacant' && (
          <>
          <div className="r2">
            <div className="fg">
              <label className="fl">ประเภทห้อง</label>
              <select className="sel" value={selectedType} onChange={handleTypeChange}>
                <option value="">เลือกประเภท</option>
                {(dorm?.roomTypes||[]).map((t:any)=><option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">ค่าเช่าเริ่มต้น (บาท)</label><input type="number" className="inp" value={rentPrice||''} onChange={e=>setRentPrice(parseInt(e.target.value))} /></div>
          </div>
          <div style={{display:'flex',gap:'8px',marginTop:'6px'}}>
            <button className="btn bg f1" onClick={close}>ยกเลิก</button>
            <button className="btn bp f1" onClick={()=>alert('ยังไม่ได้ทำระบบ Save ลง Database ครับ')}>บันทึก</button>
          </div>
          </>
        )}

        {mode === 'edit' && r?.status !== 'vacant' && (
          <>
          <div className="fg"><label className="fl">ชื่อผู้เช่า</label><input type="text" className="inp" defaultValue={r?.tenant||''} /></div>
          <div className="r2">
            <div className="fg">
              <label className="fl">ประเภทห้อง</label>
              <select className="sel" value={selectedType} onChange={handleTypeChange}>
                <option value="">เลือกประเภท</option>
                {(dorm?.roomTypes||[]).map((t:any)=><option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">ค่าเช่า/เดือน (บาท)</label><input type="number" className="inp" value={rentPrice||''} onChange={e=>setRentPrice(parseInt(e.target.value))} /></div>
          </div>
          <div className="r2">
            <div className="fg"><label className="fl">วันเริ่มสัญญา</label><input type="date" className="inp" /></div>
            <div className="fg"><label className="fl">วันสิ้นสุดสัญญา</label><input type="date" className="inp" /></div>
          </div>
          <div style={{display:'flex',gap:'8px',marginTop:'6px'}}>
            <button className="btn bg f1" onClick={close}>ยกเลิก</button>
            <button className="btn bp f1" onClick={()=>alert('ยังไม่ได้ทำระบบ Save ลง Database ครับ')}>บันทึก</button>
          </div>
          <div className="div mt4"></div>
          <button className="btn bd bblk">ย้ายออก / ยกเลิกสัญญา</button>
          </>
        )}

      </div>
    </div>
  );
}

// ----- Extra Modal -----
function ExtraModal({ isOpen, close, roomId }: { isOpen: boolean, close: () => void, roomId?: string }) {
  const { meterDraft, setMeterDraft } = useDorm();
  const draft = roomId && meterDraft[roomId] ? meterDraft[roomId] : {w:'', e:'', extras:[]};
  const [items, setItems] = useState<{desc:string, amt:number}[]>([]);

  useEffect(() => {
    if (isOpen) {
      setItems([...(draft.extras || [])]);
    }
  }, [isOpen, roomId]);

  const addRow = () => setItems([...items, {desc:'', amt:0}]);
  const updateRow = (i: number, field: 'desc'|'amt', val: string) => {
    const newItems = [...items];
    if (field==='desc') newItems[i].desc = val;
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
      const validItems = items.filter(x => x.desc.trim() && x.amt > 0);
      setMeterDraft((prev: any) => ({...prev, [roomId]: {...(prev[roomId]||{w:'', e:'', extras:[]}), extras: validItems}}));
    }
    close();
  };

  if (!isOpen) return null;
  return (
    <div className={`overlay ${isOpen?'open':''}`} onClick={close}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div className="modal-handle"></div>
        <div className="modal-title">ค่าใช้จ่ายเพิ่มเติม — ห้อง {roomId}</div>
        
        <div style={{marginBottom:'14px'}}>
          {items.map((it, i) => (
            <div key={i} style={{display:'flex', gap:'8px', marginBottom:'8px'}}>
              <input type="text" className="inp" style={{flex:2, marginBottom:0}} placeholder="รายการ" value={it.desc} onChange={e=>updateRow(i, 'desc', e.target.value)} />
              <input type="number" className="inp" style={{flex:1, marginBottom:0}} placeholder="จำนวนเงิน (บาท)" value={it.amt||''} onChange={e=>updateRow(i, 'amt', e.target.value)} />
              <button className="btn bd" style={{padding:'0 8px'}} onClick={()=>removeRow(i)}><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:'15px',height:'15px'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
            </div>
          ))}
        </div>

        <button className="btn bline bsm mb4" style={{width:'100%'}} onClick={addRow}>+ เพิ่มรายการ</button>
        <div style={{display:'flex',gap:'8px'}}>
          <button className="btn bg f1" onClick={close}>ยกเลิก</button>
          <button className="btn bp f1" onClick={save}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}

// ----- Confirm Delete Modal -----
function ConfirmDeleteModal({ isOpen, close, typeId }: { isOpen: boolean, close: () => void, typeId?: string }) {
  if (!isOpen) return null;
  return (
    <div className={`overlay ${isOpen?'open':''}`} onClick={close}>
      <div className="modal" style={{maxWidth:'400px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div style={{width:'56px',height:'56px',borderRadius:'50%',background:'var(--rl)',color:'var(--red)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{width:'28px',height:'28px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </div>
        <div className="modal-title" style={{marginBottom:'8px'}}>ยืนยันการลบ</div>
        <div style={{fontSize:'14px',color:'var(--t2)',marginBottom:'24px'}}>คุณแน่ใจหรือไม่ว่าต้องการลบประเภทห้องนี้?</div>
        <div style={{display:'flex',gap:'8px'}}>
          <button className="btn bg f1" onClick={close}>ยกเลิก</button>
          <button className="btn bd f1">ลบประเภทห้อง</button>
        </div>
      </div>
    </div>
  );
}

// ----- Bill Preview Modal -----
function BillPreviewModal({ isOpen, close }: { isOpen: boolean, close: () => void }) {
  if (!isOpen) return null;
  return (
    <div className={`overlay ${isOpen?'open':''}`} onClick={close}>
      <div className="modal" style={{maxWidth:'600px'}} onClick={e=>e.stopPropagation()}>
        <div className="modal-handle"></div>
        <div className="modal-title">ตรวจสอบบิลก่อนส่ง</div>
        <div style={{display:'flex',gap:'8px',marginTop:'14px',flexWrap:'wrap'}}>
          <button className="btn bg f1" onClick={close}>แก้ไข</button>
          <button className="btn bp f1">สร้างบิลทั้งหมด</button>
          <button className="btn bline f1">สร้าง + แจ้ง LINE</button>
        </div>
      </div>
    </div>
  );
}

// ----- Pay Modal -----
function PayModal({ isOpen, close }: { isOpen: boolean, close: () => void }) {
  if (!isOpen) return null;
  return (
    <div className={`overlay ${isOpen?'open':''}`} onClick={close}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div className="modal-handle"></div>
        <div className="modal-title">แจ้งการชำระเงิน</div>
        <div className="alert al-info mb4">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          โอนเงินเข้าพร้อมเพย์ <strong id="pay-pp"></strong> แล้วกดยืนยัน
        </div>
        <div className="fg"><label className="fl">วันที่โอน</label><input type="date" className="inp" /></div>
        <div className="fg"><label className="fl">หมายเหตุ <span>(ไม่บังคับ)</span></label><input type="text" className="inp" placeholder="เช่น โอน KBank" /></div>
        <div style={{display:'flex',gap:'8px',marginTop:'6px'}}>
          <button className="btn bg f1" onClick={close}>ยกเลิก</button>
          <button className="btn bp f1">ยืนยันแจ้งชำระ</button>
        </div>
      </div>
    </div>
  );
}
