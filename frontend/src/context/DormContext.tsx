"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, getCookie } from "@/utils/api";

const VERSION = '5.1';
const STORE = 'dormy_v5';

export const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

const DEFAULT_DATA = {
  version: VERSION,
  activeDorm: '',
  dorms: []
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
  
  const [isDraftHydrated, setIsDraftHydrated] = useState<boolean>(false);
  const [meterDraft, setMeterDraft] = useState<Record<string, any>>({});
  const [savedMeterDraft, setSavedMeterDraft] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Modal States
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const openModal = useCallback((modalName: string, modalPayload: any = null) => {
    setActiveModal(modalName);
    setModalData(modalPayload);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  // Custom toast helper (replicates vanilla JS behavior)
  const toast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
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
  }, []);

  // Hydrate session and settings on mount
  useEffect(() => {
    const localRole = localStorage.getItem("dormy_role");
    const localTenantRoom = localStorage.getItem("dormy_tenant_room");
    const localTenantRoomNumber = localStorage.getItem("dormy_tenant_room_number");
    const localTenantDormId = localStorage.getItem("dormy_tenant_dorm_id");
    const localActiveDorm = localStorage.getItem("dormy_active_dorm");

    // Align context role with the session cookie state
    const token = getCookie("dormy_admin_token");
    if (token) {
      setRole("admin");
      localStorage.setItem("dormy_role", "admin");
    } else {
      if (localRole === "admin") {
        localStorage.removeItem("dormy_role");
        setRole(null);
      } else {
        if (localRole) setRole(localRole);
      }
    }

    if (localTenantRoom && localTenantRoom !== "undefined" && localTenantRoom !== "null") setTenantRoom(localTenantRoom);
    if (localTenantRoomNumber && localTenantRoomNumber !== "undefined" && localTenantRoomNumber !== "null") setTenantRoomNumber(localTenantRoomNumber);
    if (localTenantDormId && localTenantDormId !== "undefined" && localTenantDormId !== "null") setTenantDormId(localTenantDormId);
    
    if (localActiveDorm) {
      setActiveDormId(localActiveDorm);
    }

    const savedDraft = localStorage.getItem("dormy_meter_draft");
    if (savedDraft) {
      try {
        setMeterDraft(JSON.parse(savedDraft));
      } catch (e) {}
    }
    const savedConfirmedDraft = localStorage.getItem("dormy_saved_meter_draft");
    if (savedConfirmedDraft) {
      try {
        setSavedMeterDraft(JSON.parse(savedConfirmedDraft));
      } catch (e) {}
    }
    setIsDraftHydrated(true);

    const saved = localStorage.getItem(STORE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === VERSION) {
          setData(parsed);
          if (parsed.activeDormDetails) {
            setActiveDormDetails(parsed.activeDormDetails);
          }
          return;
        }
      } catch (e) {}
    }
    setData(DEFAULT_DATA);
    localStorage.setItem(STORE, JSON.stringify(DEFAULT_DATA));
  }, []);

  // Sync meter draft to localStorage on change
  useEffect(() => {
    if (isDraftHydrated) {
      localStorage.setItem("dormy_meter_draft", JSON.stringify(meterDraft));
    }
  }, [meterDraft, isDraftHydrated]);

  // Sync saved meter draft to localStorage on change
  useEffect(() => {
    if (isDraftHydrated) {
      localStorage.setItem("dormy_saved_meter_draft", JSON.stringify(savedMeterDraft));
    }
  }, [savedMeterDraft, isDraftHydrated]);

  // Fetch from API when role changes or activeDormId changes
  useEffect(() => {
    const syncDorms = async () => {
      if (!role) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        if (role === "admin") {
          let targetDormId = activeDormId;
          let dormsList: any[] = [];
          let details: any = null;

          if (targetDormId) {
            // Run requests in parallel to optimize latency
            const [dList, dDetails] = await Promise.all([
              api.getDorms(),
              api.getDormDetails(targetDormId)
            ]);
            dormsList = dList;
            details = dDetails;
          } else {
            // Run sequentially on first-time load to obtain first dorm ID
            dormsList = await api.getDorms();
            if (dormsList.length > 0) {
              targetDormId = dormsList[0].id;
              setActiveDormId(targetDormId);
              localStorage.setItem("dormy_active_dorm", targetDormId);
              details = await api.getDormDetails(targetDormId);
            }
          }

          setData((prev: any) => {
            const nextData = {
              ...prev,
              activeDorm: targetDormId,
              dorms: dormsList,
              activeDormDetails: details
            };
            localStorage.setItem(STORE, JSON.stringify(nextData));
            return nextData;
          });

          if (details) {
            setActiveDormDetails(details);
          }
        } else if (role === "tenant" && tenantRoom) {
          // Hydrate tenant room details
          const session = await api.getTenantSession(tenantRoom);
          setTenantRoomNumber(session.room_number);
          setTenantDormId(session.dorm_id);
          localStorage.setItem("dormy_tenant_room_number", session.room_number);
          localStorage.setItem("dormy_tenant_dorm_id", session.dorm_id);

          // Construct a scoped, secure dorm details object using only the active lease session fields
          const tenantDormObj = {
            id: session.dorm_id,
            name: session.dorm_name,
            address: session.dorm_address,
            promptpay: session.dorm_promptpay,
            waterRate: session.dorm_water_rate,
            electricRate: session.dorm_electric_rate,
            dueDayOfMonth: session.dorm_due_day_of_month,
            rooms: [
              {
                id: session.room_number,
                uuid: session.room_id, // This is the active lease UUID (Room Key)
                status: "occupied",
                tenant: session.tenant_name,
                moveInDate: session.move_in_date,
                contractStart: session.contract_start,
                contractEnd: session.contract_end,
                depositAmount: session.deposit_amount,
                depositStatus: session.deposit_status,
                depositNote: session.deposit_note,
                lastWaterMeter: session.last_water_meter,
                lastElectricMeter: session.last_electric_meter
              }
            ]
          };
          setData((prev: any) => {
            const nextData = {
              ...prev,
              activeDormDetails: tenantDormObj
            };
            localStorage.setItem(STORE, JSON.stringify(nextData));
            return nextData;
          });
          setActiveDormDetails(tenantDormObj);
        }
      } catch (err: any) {
        console.error("syncDorms error caught:", err);
        const errMsg = err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์";
        toast(`ข้อผิดพลาดการดึงข้อมูล: ${errMsg}`, "error");
        
        const isAuthOrInvalidError = 
          errMsg.includes("โปรดเข้าสู่ระบบใหม่") || 
          errMsg.includes("หมดอายุ") || 
          errMsg.includes("ไม่ถูกต้อง") ||
          errMsg.includes("ไม่พบข้อมูล") ||
          errMsg.includes("ระบุรหัส");

        if (isAuthOrInvalidError) {
          // Delay logout so the user can read the error message
          setTimeout(() => {
            logout();
          }, 3000);
        } else {
          setLoading(false);
        }
      } finally {
        setLoading(false);
      }
    };

    syncDorms();
  }, [role, activeDormId, tenantRoom]);

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
      setData((prev: any) => {
        const nextData = {
          ...prev,
          activeDorm: id,
          activeDormDetails: details
        };
        localStorage.setItem(STORE, JSON.stringify(nextData));
        return nextData;
      });
      setActiveDormDetails(details);
    } catch (err: any) {
      toast(err.message || "ไม่สามารถเปลี่ยนข้อมูลหอพักได้", "error");
    } finally {
      setLoading(false);
    }
  };

  const reloadDorm = async () => {
    try {
      if (role === "admin") {
        if (!activeDormId) return;
        const [details, list] = await Promise.all([
          api.getDormDetails(activeDormId),
          api.getDorms()
        ]);
        setData((prev: any) => {
          const nextData = {
            ...prev,
            dorms: list,
            activeDormDetails: details
          };
          localStorage.setItem(STORE, JSON.stringify(nextData));
          return nextData;
        });
        setActiveDormDetails(details);
      } else if (role === "tenant" && tenantRoom) {
        const session = await api.getTenantSession(tenantRoom);
        setTenantRoomNumber(session.room_number);
        setTenantDormId(session.dorm_id);
        localStorage.setItem("dormy_tenant_room_number", session.room_number);
        localStorage.setItem("dormy_tenant_dorm_id", session.dorm_id);

        const tenantDormObj = {
          id: session.dorm_id,
          name: session.dorm_name,
          address: session.dorm_address,
          promptpay: session.dorm_promptpay,
          waterRate: session.dorm_water_rate,
          electricRate: session.dorm_electric_rate,
          dueDayOfMonth: session.dorm_due_day_of_month,
          rooms: [
            {
              id: session.room_number,
              uuid: session.room_id,
              status: "occupied",
              tenant: session.tenant_name,
              moveInDate: session.move_in_date,
              contractStart: session.contract_start,
              contractEnd: session.contract_end,
              depositAmount: session.deposit_amount,
              depositStatus: session.deposit_status,
              depositNote: session.deposit_note,
              lastWaterMeter: session.last_water_meter,
              lastElectricMeter: session.last_electric_meter
            }
          ]
        };

        setData((prev: any) => {
          const nextData = {
            ...prev,
            activeDormDetails: tenantDormObj
          };
          localStorage.setItem(STORE, JSON.stringify(nextData));
          return nextData;
        });
        setActiveDormDetails(tenantDormObj);
      }
    } catch (err: any) {
      console.warn("Failed to reload from backend:", err);
    }
  };

  const logout = () => {
    setRole(null);
    setTenantRoom(null);
    setTenantRoomNumber(null);
    setTenantDormId(null);
    setActiveDormDetails(null);
    setData(DEFAULT_DATA);
    localStorage.removeItem("dormy_role");
    localStorage.removeItem("dormy_tenant_room");
    localStorage.removeItem("dormy_tenant_room_number");
    localStorage.removeItem("dormy_tenant_dorm_id");
    document.cookie = "dormy_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  };
  const setSessionRole = useCallback((newRole: string | null) => {
    setRole(newRole);
    if (newRole) {
      localStorage.setItem("dormy_role", newRole);
    } else {
      localStorage.removeItem("dormy_role");
    }
  }, []);

  const setSessionTenantRoom = useCallback((roomUuid: string | null) => {
    setTenantRoom(roomUuid);
    if (roomUuid) {
      localStorage.setItem("dormy_tenant_room", roomUuid);
    } else {
      localStorage.removeItem("dormy_tenant_room");
    }
  }, []);

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
      savedMeterDraft,
      setSavedMeterDraft,
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
