export const API = {
  auth: "http://192.168.0.193:8001",
  queue: "http://192.168.0.193:8002", 
  booking: "http://192.168.0.193:8003",
  ws: "ws://192.168.0.193:8004",
};

export const ENDPOINTS = {
  // Auth endpoints
  LOGIN: "/api/v1/auth/login",
  REFRESH: "/api/v1/auth/refresh",
  LOGOUT: "/api/v1/auth/logout",
  
  // Queue endpoints
  QUEUE: (stationId: string) => `/api/v1/queue/${stationId}`,
  QUEUE_REORDER: (stationId: string) => `/api/v1/queue/${stationId}/reorder`,
  QUEUE_ENTRY: (stationId: string, entryId: string) => `/api/v1/queue/${stationId}/entry/${entryId}`,
  QUEUE_ENTRY_MOVE: (stationId: string, entryId: string) => `/api/v1/queue/${stationId}/entry/${entryId}/move`,
  QUEUE_SUMMARIES: "/api/v1/queue-summaries",
  ROUTES: "/api/v1/routes",
  VEHICLES: "/api/v1/vehicles",
  VEHICLE_AUTHORIZED_ROUTES: (vehicleId: string) => `/api/v1/vehicles/${vehicleId}/authorized-routes`,
  
  // WebSocket endpoints
  WS_QUEUE: (stationId: string) => `/ws/queue/${stationId}`,
} as const;
