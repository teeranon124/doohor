"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/utils/api";

const VERSION = '5.1';
const STORE = 'dormy_v5';

export const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

const DEFAULT_DATA = {
  version: VERSION,
  activeDorm: 'D001',
  dorms: [
    {
      id: 'D001',
      name: 'Dormy Residence',
      addr: 'สาขาหลัก',
      promptpay: '081-XXX-XXXX',
      waterRate: 18,
      electricRate: 8,
      dueDayOfMonth: 5,
      roomTypes: [
        { id: 'T1', name: 'Standard', rent: 4500, deposit: 9000 },
        { id: 'T2', name: 'VIP', rent: 6500, deposit: 13000 }
      ],
      rooms: [
        { id:'101', type:'Standard', rentPrice:4500, status:'occupied', tenant:'คุณสมชาย ใจดี', moveInDate:'01/01/2567', contractStart:'01/01/2567', contractEnd:'31/12/2567', depositAmount:9000, depositStatus:'held', depositNote:'', lastWaterMeter:1250, lastElectricMeter:4200 },
        { id:'102', type:'Standard', rentPrice:4500, status:'vacant', tenant:null, moveInDate:null, contractStart:null, contractEnd:null, depositAmount:0, depositStatus:'none', depositNote:'', lastWaterMeter:1000, lastElectricMeter:3000 },
        { id:'103', type:'VIP', rentPrice:6500, status:'occupied', tenant:'คุณประเสริฐ', moveInDate:'01/03/2567', contractStart:'01/03/2567', contractEnd:'28/02/2568', depositAmount:13000, depositStatus:'held', depositNote:'', lastWaterMeter:500, lastElectricMeter:1200 },
        { id:'201', type:'VIP', rentPrice:6500, status:'occupied', tenant:'คุณสมหญิง รักดี', moveInDate:'01/06/2567', contractStart:'01/06/2567', contractEnd:'31/05/2568', depositAmount:13000, depositStatus:'held', depositNote:'', lastWaterMeter:840, lastElectricMeter:2150 },
        { id:'202', type:'Standard', rentPrice:4800, status:'vacant', tenant:null, moveInDate:null, contractStart:null, contractEnd:null, depositAmount:0, depositStatus:'none', depositNote:'', lastWaterMeter:0, lastElectricMeter:0 },
        { id:'301', type:'Standard', rentPrice:4500, status:'occupied', tenant:'คุณมานะ', moveInDate:'01/01/2568', contractStart:'01/01/2568', contractEnd:'31/12/2568', depositAmount:9000, depositStatus:'held', depositNote:'', lastWaterMeter:300, lastElectricMeter:800 },
        { id:'302', type:'Standard', rentPrice:4500, status:'vacant', tenant:null, moveInDate:null, contractStart:null, contractEnd:null, depositAmount:0, depositStatus:'none', depositNote:'', lastWaterMeter:0, lastElectricMeter:0 },
      ],
      bills: [
        { id:'B001', room:'101', month:'เมษายน', year:2568, issueDate:'25/04/2568', dueDate:'05/05/2568', rent:4500, ws:1240, we:1250, es:4100, ee:4200, otherFees:0, otherDesc:'', total:4500+(10*18)+(100*8), status:'paid', paidDate:'01/05/2568', payNote:'' },
        { id:'B002', room:'201', month:'พฤษภาคม', year:2568, issueDate:'25/05/2568', dueDate:'05/06/2568', rent:6500, ws:830, we:840, es:2000, ee:2150, otherFees:200, otherDesc:'ค่าส่วนกลาง', total:6500+(10*18)+(150*8)+200, status:'unpaid', paidDate:null, payNote:'' },
      ],
      repairs: [],
      depositHistory: [
        { id:'D001', room:'101', type:'received', amount:9000, date:'01/01/2567', note:'รับมัดจำเริ่มสัญญา' },
      ],
    }
  ]
};

const DormContext = createContext<any>(null);

export function DormProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<any>(null);
  const [activeDormId, setActiveDormId] = useState<string>("");
  const [activeDormDetails, setActiveDormDetails] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [tenantRoom, setTenantRoom] = useState<string | null>(null); // Room UUID
  const [tenantRoomNumber, setTenantRoomNumber] = useState<string | null>(null);
  const [tenantDormId, setTenantDormId] = useState<string | null>(null);
  
  const [meterDraft, setMeterDraft] = useState<Record<string, {w:string, e:string, extras:{desc:string, amt:number}[]}>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Modal States
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);

  const openModal = (modalName: string, modalPayload: any = null) => {
    setActiveModal(modalName);
    setModalData(modalPayload);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  // Custom toast helper (replicates vanilla JS behavior)
  const toast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (typeof window === "undefined") return;
    const w = document.getElementById('toast-wrap');
    if (!w) {
      console.warn("toast-wrap container not found, falling back to alert: ", msg);
      return;
    }
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    const ic = {
      success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    };
    el.innerHTML = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${ic[type] || ic.info}"/></svg><span>${msg}</span>`;
    w.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 220);
    }, 3200);
  };

  // Hydrate session and settings on mount
  useEffect(() => {
    const localRole = localStorage.getItem("dormy_role");
    const localTenantRoom = localStorage.getItem("dormy_tenant_room");
    const localTenantRoomNumber = localStorage.getItem("dormy_tenant_room_number");
    const localTenantDormId = localStorage.getItem("dormy_tenant_dorm_id");
    const localActiveDorm = localStorage.getItem("dormy_active_dorm");

    if (localRole) setRole(localRole);
    if (localTenantRoom) setTenantRoom(localTenantRoom);
    if (localTenantRoomNumber) setTenantRoomNumber(localTenantRoomNumber);
    if (localTenantDormId) setTenantDormId(localTenantDormId);
    
    // Set active dorm ID
    const initialDormId = localActiveDorm || DEFAULT_DATA.activeDorm;
    setActiveDormId(initialDormId);

    const saved = localStorage.getItem(STORE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === VERSION) {
          setData(parsed);
          return;
        }
      } catch (e) {}
    }
    setData(DEFAULT_DATA);
    localStorage.setItem(STORE, JSON.stringify(DEFAULT_DATA));
  }, []);

  // Fetch from API when role changes or activeDormId changes
  useEffect(() => {
    if (!data) return;

    const syncDorms = async () => {
      setLoading(true);
      try {
        if (role === "admin") {
          const dormsList = await api.getDorms();
          
          let targetDormId = activeDormId;
          if (!targetDormId && dormsList.length > 0) {
            targetDormId = dormsList[0].id;
            setActiveDormId(targetDormId);
            localStorage.setItem("dormy_active_dorm", targetDormId);
          }

          setData((prev: any) => ({
            ...prev,
            activeDorm: targetDormId,
            dorms: dormsList
          }));

          if (targetDormId) {
            const details = await api.getDormDetails(targetDormId);
            setActiveDormDetails(details);
          }
        } else if (role === "tenant" && tenantRoom) {
          // Hydrate tenant room details
          const session = await api.getTenantSession(tenantRoom);
          setTenantRoomNumber(session.room_number);
          setTenantDormId(session.dorm_id);
          localStorage.setItem("dormy_tenant_room_number", session.room_number);
          localStorage.setItem("dormy_tenant_dorm_id", session.dorm_id);

          const details = await api.getDormDetails(session.dorm_id);
          setActiveDormDetails(details);
        } else {
          // No role set (Landing screen) - hydrate default dorm details
          useLocalFallback();
        }
      } catch (err) {
        console.warn("Backend offline or failed, using local fallback.");
        useLocalFallback();
      } finally {
        setLoading(false);
      }
    };

    const useLocalFallback = () => {
      const fallbackData = data || DEFAULT_DATA;
      if (fallbackData.dorms && fallbackData.dorms.length > 0) {
        const localActiveId = activeDormId || fallbackData.activeDorm || fallbackData.dorms[0].id;
        const localDorm = fallbackData.dorms.find((x: any) => x.id === localActiveId) || fallbackData.dorms[0];
        
        setActiveDormId(localActiveId);
        setActiveDormDetails(localDorm);
        
        if (!data) {
          setData(fallbackData);
        }
      }
    };

    syncDorms();
  }, [role, activeDormId, tenantRoom, data === null]);

  const saveLocal = (newData: any) => {
    setData(newData);
    localStorage.setItem(STORE, JSON.stringify(newData));
  };

  const switchDorm = async (id: string) => {
    setActiveDormId(id);
    localStorage.setItem("dormy_active_dorm", id);
    setLoading(true);
    try {
      const details = await api.getDormDetails(id);
      setActiveDormDetails(details);
    } catch (err) {
      if (data && data.dorms) {
        const localDorm = data.dorms.find((x: any) => x.id === id);
        if (localDorm) setActiveDormDetails(localDorm);
      }
    } finally {
      setLoading(false);
    }
  };

  const reloadDorm = async () => {
    const targetId = role === "admin" ? activeDormId : tenantDormId;
    if (!targetId) return;
    try {
      const details = await api.getDormDetails(targetId);
      setActiveDormDetails(details);
      
      // Update list as well if admin
      if (role === "admin") {
        const list = await api.getDorms();
        setData((prev: any) => ({
          ...prev,
          dorms: list
        }));
      }
    } catch (err) {
      console.warn("Failed to reload from backend:", err);
    }
  };

  const logout = () => {
    setRole(null);
    setTenantRoom(null);
    setTenantRoomNumber(null);
    setTenantDormId(null);
    setActiveDormDetails(null);
    localStorage.removeItem("dormy_role");
    localStorage.removeItem("dormy_tenant_room");
    localStorage.removeItem("dormy_tenant_room_number");
    localStorage.removeItem("dormy_tenant_dorm_id");
  };

  const setSessionRole = (newRole: string | null) => {
    setRole(newRole);
    if (newRole) {
      localStorage.setItem("dormy_role", newRole);
    } else {
      localStorage.removeItem("dormy_role");
    }
  };

  const setSessionTenantRoom = (roomUuid: string | null) => {
    setTenantRoom(roomUuid);
    if (roomUuid) {
      localStorage.setItem("dormy_tenant_room", roomUuid);
    } else {
      localStorage.removeItem("dormy_tenant_room");
    }
  };

  return (
    <DormContext.Provider value={{
      data,
      setData: saveLocal,
      dorm: activeDormDetails,
      activeDormId,
      switchDorm,
      reloadDorm,
      meterDraft,
      setMeterDraft,
      role,
      setRole: setSessionRole,
      tenantRoom,
      setTenantRoom: setSessionTenantRoom,
      tenantRoomNumber,
      tenantDormId,
      loading,
      logout,
      toast,
      activeModal,
      modalData,
      openModal,
      closeModal
    }}>
      {children}
    </DormContext.Provider>
  );
}

export const useDorm = () => useContext(DormContext);
export { VERSION, STORE };
