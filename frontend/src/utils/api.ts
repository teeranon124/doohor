const API_BASE = "http://localhost:8000/api/v1";

export async function request(path: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
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
