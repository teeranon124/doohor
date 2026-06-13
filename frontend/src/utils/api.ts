const API_BASE = "http://localhost:8000/api/v1";

export function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || "";
  return "";
}

export async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getCookie("dormy_admin_token");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
  }
  return response.json();
}

export const api = {
  // Auth
  loginAdmin: (data: any) => request("/auth/login/admin", { method: "POST", body: JSON.stringify(data) }),
  loginTenant: (data: any) => request("/auth/login/tenant", { method: "POST", body: JSON.stringify(data) }),
  loginTenantByUuid: (uuid: string) => request(`/auth/login/tenant/${uuid}`),
  getTenantSessionByUuid: (uuid: string) => request(`/auth/login/tenant/${uuid}`), // alias
  getTenantSession: (uuid: string) => request(`/auth/tenant/session/${uuid}`),

  // Dorms
  getDorms: () => request("/dorms"),
  createDorm: (data: any) => request("/dorms", { method: "POST", body: JSON.stringify(data) }),
  updateDorm: (dormId: string, data: any) => request(`/dorms/${dormId}`, { method: "PUT", body: JSON.stringify(data) }),
  getDormDetails: (dormId: string) => request(`/dorms/${dormId}/details`),

  // Room Types
  createRoomType: (data: any) => request("/room-types", { method: "POST", body: JSON.stringify(data) }),
  updateRoomType: (typeId: string, data: any) => request(`/room-types/${typeId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteRoomType: (typeId: string) => request(`/room-types/${typeId}`, { method: "DELETE" }),

  // Rooms
  createRoom: (data: any) => request("/rooms", { method: "POST", body: JSON.stringify(data) }),
  updateRoom: (roomId: string, data: any) => request(`/rooms/${roomId}`, { method: "PUT", body: JSON.stringify(data) }),
  checkinTenant: (roomId: string, data: any) => request(`/rooms/${roomId}/checkin`, { method: "POST", body: JSON.stringify(data) }),
  checkoutTenant: (roomId: string, data: any) => request(`/rooms/${roomId}/checkout`, { method: "POST", body: JSON.stringify(data) }),
  manageDeposit: (roomId: string, data: any) => request(`/rooms/${roomId}/deposit`, { method: "POST", body: JSON.stringify(data) }),

  // Bills
  getTenantBills: (roomUuid: string) => request(`/bills/tenant/${roomUuid}`),
  bulkCreateBills: (data: any) => request("/bills/bulk", { method: "POST", body: JSON.stringify(data) }),
  updateBill: (billId: string, data: any) => request(`/bills/${billId}`, { method: "PUT", body: JSON.stringify(data) }),

  // Repairs
  createRepair: (data: any) => request("/repairs", { method: "POST", body: JSON.stringify(data) }),
  updateRepair: (repairId: string, data: any) => request(`/repairs/${repairId}`, { method: "PUT", body: JSON.stringify(data) }),
};

// Helper: Convert YYYY-MM-DD (Gregorian) -> DD/MM/YYYY (Buddhist Era) for API
export function toApiDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0]);
    const m = parts[1];
    const d = parts[2];
    return `${d}/${m}/${y + 543}`;
  }
  return dateStr;
}

// Helper: Convert DD/MM/YYYY (Buddhist Era) -> YYYY-MM-DD (Gregorian) for <input type="date">
export function fromApiDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const d = parts[0];
    const m = parts[1];
    const y = parseInt(parts[2]);
    return `${y - 543}-${m}-${d}`;
  }
  return dateStr;
}
