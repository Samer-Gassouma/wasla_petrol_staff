import { API } from "@/config/api";
import { getAuthToken } from "@/lib/api";

export interface WSHandlers {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onConnectionStatus?: (connected: boolean, latency: number) => void;
}

export interface WSClient {
  connect: () => void;
  disconnect: () => void;
  subscribe: (events: string[]) => void;
  unsubscribe: (events: string[]) => void;
  send: (message: unknown) => void;
  getLatency: () => number;
  isConnected: () => boolean;
}

export function connectQueue(stationId: string, handlers: WSHandlers = {}): WSClient {
  const token = getAuthToken() || (typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null);
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  const url = `${API.ws}/ws/queue/${encodeURIComponent(stationId)}${qs}`;
  
  console.log('WebSocket connecting to:', url);
  console.log('Token available:', !!token);
  
  let ws: WebSocket | null = null;
  let closedByUser = false;
  let retries = 0;
  let latency = 0;
  let connected = false;
  let pingInterval: NodeJS.Timeout | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let lastPingTime = 0;

  const connect = () => {
    console.log('Creating WebSocket connection...');
    ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('WebSocket connection opened');
      retries = 0;
      connected = true;
      handlers.onOpen?.();
      handlers.onConnectionStatus?.(true, latency);
      
      // Start heartbeat
      startHeartbeat();
      
      // Subscribe to default events
      subscribe(['queue_updated', 'queue_entry_added', 'queue_entry_removed', 'queue_entry_updated', 'queue_reordered', 'day_pass_created', 'exit_pass_created']);
    };
    
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        
        // Handle different message types
        switch (msg.type) {
          case 'pong':
            handlePong();
            break;
          case 'subscription_confirmed':
            console.log('Subscription confirmed for events:', msg.events);
            break;
          default:
            handlers.onMessage?.(ev);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        handlers.onMessage?.(ev);
      }
    };
    
    ws.onerror = (ev) => {
      console.error('WebSocket error:', ev);
      console.error('WebSocket URL:', url);
      console.error('WebSocket readyState:', ws?.readyState);
      handlers.onError?.(ev);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      connected = false;
      handlers.onClose?.();
      handlers.onConnectionStatus?.(false, latency);
      
      stopHeartbeat();
      
      // Auto-reconnect unless closed by user
      if (!closedByUser && retries < 5) {
        retries++;
        const delay = Math.min(1000 * Math.pow(2, retries), 30000);
        console.log(`Reconnecting in ${delay}ms (attempt ${retries}/5)`);
        setTimeout(connect, delay);
      }
    };
  };

  const disconnect = () => {
    closedByUser = true;
    stopHeartbeat();
    if (ws) {
      ws.close();
      ws = null;
    }
  };

  const subscribe = (events: string[]) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'subscribe',
        events: events
      }));
    }
  };

  const unsubscribe = (events: string[]) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'unsubscribe',
        events: events
      }));
    }
  };

  const send = (message: unknown) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  const startHeartbeat = () => {
    // Send ping every 30 seconds
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        lastPingTime = Date.now();
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Check connection health every 10 seconds
    heartbeatInterval = setInterval(() => {
      if (ws && ws.readyState !== WebSocket.OPEN) {
        console.log('WebSocket connection lost, attempting reconnect...');
        connect();
      }
    }, 10000);
  };

  const stopHeartbeat = () => {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  const handlePong = () => {
    if (lastPingTime > 0) {
      latency = Date.now() - lastPingTime;
      handlers.onConnectionStatus?.(connected, latency);
    }
  };

  const getLatency = () => latency;
  const isConnected = () => connected;

  // Auto-connect
  connect();

  return {
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    send,
    getLatency,
    isConnected
  };
}
