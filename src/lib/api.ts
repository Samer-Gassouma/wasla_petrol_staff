import { API, ENDPOINTS } from "@/config/api";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

let authToken: string | null = null;

// Initialize auth token from localStorage on module load (for refresh persistence)
if (typeof window !== "undefined") {
  try {
    const saved = window.localStorage.getItem("authToken");
    if (saved) authToken = saved;
  } catch {}
}

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        window.localStorage.setItem("authToken", token);
      } else {
        window.localStorage.removeItem("authToken");
      }
    } catch {}
  }
}

export function getAuthToken() {
  return authToken;
}

async function request<T>(
  base: string,
  path: string,
  method: HttpMethod = "GET",
  body?: unknown
): Promise<T> {
  const url = `${base}${path}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorText}`);
  }

  return (await res.json()) as T;
}

// Auth API
export async function login(cin: string): Promise<{ 
  data: { 
    token: string; 
    staff: { firstName: string; lastName: string } 
  } 
}> {
  const response = await request<{ 
    success: boolean;
    message: string;
    data: { 
      token: string; 
      staff: { firstName: string; lastName: string } 
    } 
  }>(API.auth, ENDPOINTS.LOGIN, "POST", { cin });
  
  console.log('API login response:', response);
  const token = response.data.token;
  setAuthToken(token);
  return response;
}

export async function logout(): Promise<void> {
  try {
    await request(API.auth, ENDPOINTS.LOGOUT, "POST");
  } finally {
    setAuthToken(null);
  }
}

// Queue API
export async function listRoutes() {
  return request<{ data: unknown[] }>(API.queue, ENDPOINTS.ROUTES);
}

export async function listVehicles() {
  return request<{ data: unknown[] }>(API.queue, ENDPOINTS.VEHICLES);
}

export async function getVehicle(id: string) {
  return request<{ data: unknown }>(API.queue, `/api/v1/vehicles/${id}`);
}

export async function listQueue(destinationId: string) {
  return request<{ data: unknown[] }>(API.queue, ENDPOINTS.QUEUE(destinationId));
}

export async function listQueueSummaries() {
  return request<{ data: unknown[] }>(API.queue, ENDPOINTS.QUEUE_SUMMARIES);
}

export async function reorderQueue(destinationId: string, entryIds: string[]) {
  return request<{ data: unknown }>(
    API.queue, 
    ENDPOINTS.QUEUE_REORDER(destinationId), 
    "PUT", 
    { entryIds }
  );
}

export async function deleteQueueEntry(destinationId: string, entryId: string) {
  return request<{ data: unknown }>(
    API.queue, 
    ENDPOINTS.QUEUE_ENTRY(destinationId, entryId), 
    "DELETE"
  );
}

export async function moveQueueEntry(
  destinationId: string, 
  entryId: string, 
  newPosition: number
) {
  return request<{ data: unknown }>(
    API.queue, 
    ENDPOINTS.QUEUE_ENTRY_MOVE(destinationId, entryId), 
    "PUT", 
    { newPosition: newPosition }
  );
}

export async function addVehicleToQueue(destinationId: string, vehicleId: string, destinationName?: string) {
  return request<{ data: unknown }>(
    API.queue, 
    ENDPOINTS.QUEUE(destinationId), 
    "POST", 
    { 
      vehicleId,
      destinationId,
      destinationName: destinationName || destinationId // Use destinationId as fallback if name not provided
    }
  );
}

export async function getVehicleAuthorizedRoutes(vehicleId: string) {
  return request<{ data: unknown[] }>(
    API.queue, 
    ENDPOINTS.VEHICLE_AUTHORIZED_ROUTES(vehicleId)
  );
}

export async function searchVehicles(query: string) {
  return request<{ data: unknown[] }>(
    API.queue, 
    `/api/v1/vehicles/search?q=${encodeURIComponent(query)}`
  );
}

// Booking API
export async function createBookingByQueueEntry(
  destinationId: string, 
  queueEntryId: string, 
  seatCount: number
) {
  return request<{ data: unknown }>(
    API.booking, 
    "/api/v1/bookings/by-queue-entry", 
    "POST", 
    { destinationId, queueEntryId, seatCount }
  );
}

export async function cancelOneBookingByQueueEntry(queueEntryId: string) {
  return request<{ data: unknown }>(
    API.booking, 
    "/api/v1/bookings/cancel-one-by-queue-entry", 
    "POST", 
    { queueEntryId }
  );
}

export async function listTodayTrips() {
  return request<{ data: unknown[] }>(API.booking, "/api/v1/trips/today");
}
