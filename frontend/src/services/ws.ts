import { getWsBaseUrl } from './api';

export interface ClockSyncData {
  offsetMs: number;
  rttMs: number;
}

export type WebSocketListener = (data: any) => void;

class RoomWebSocketService {
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private token: string | null = null;
  private listeners: Set<WebSocketListener> = new Set();
  private pingInterval: any = null;
  private driftInterval: any = null;
  private clockSkewMs: number = 0;
  private rttMs: number = 0;
  private isConnecting: boolean = false;
  private intentionalDisconnect: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: any = null;
  private getLocalPlaybackPositionMs: (() => number) | null = null;

  connect(roomId: string, token: string, getLocalPos?: () => number) {
    if (this.ws && this.roomId === roomId && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.intentionalDisconnect = false;
    this.roomId = roomId;
    this.token = token;
    if (getLocalPos) this.getLocalPlaybackPositionMs = getLocalPos;

    const base = getWsBaseUrl();
    if (!base) {
      console.warn('Room WebSocket cannot connect: Backend server URL is not configured.');
      return;
    }
    const wsUrl = `${base}/ws/rooms/${roomId}?token=${encodeURIComponent(token)}`;

    this.isConnecting = true;
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        const wasReconnected = this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;
        this.startClockSync();
        this.startDriftReporting();
        this.notifyListeners({ type: 'WS_CONNECTED', reconnected: wasReconnected });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopIntervals();
        this.notifyListeners({ type: 'WS_DISCONNECTED' });

        // Automatic exponential backoff reconnection if not intentionally disconnected
        if (!this.intentionalDisconnect && this.roomId && this.token) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Room WebSocket error', err);
      };
    } catch (e) {
      this.isConnecting = false;
      if (!this.intentionalDisconnect && this.roomId && this.token) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.intentionalDisconnect) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Room WebSocket max reconnection attempts reached');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, up to 15s + jitter
    const baseDelay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    const jitter = Math.random() * 500;
    const delay = Math.round(baseDelay + jitter);

    this.reconnectAttempts++;
    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.intentionalDisconnect && this.roomId && this.token) {
        this.connect(this.roomId, this.token);
      }
    }, delay);
  }

  private handleIncomingMessage(data: any) {
    if (data.type === 'PONG') {
      const t3 = Date.now() / 1000;
      const t0 = data.client_timestamp;
      const t1 = data.server_timestamp;
      const t2 = t1; // Simplified symmetric
      const rtt = (t3 - t0);
      const skew = t1 - (t0 + rtt / 2);
      this.clockSkewMs = skew * 1000;
      this.rttMs = rtt * 1000;
    }

    this.notifyListeners(data);
  }

  private startClockSync() {
    this.sendPing();
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 10000); // Sync clock every 10s
  }

  private sendPing() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'PING',
        client_timestamp: Date.now() / 1000
      }));
    }
  }

  private startDriftReporting() {
    this.driftInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.getLocalPlaybackPositionMs) {
        const localPosMs = this.getLocalPlaybackPositionMs();
        this.ws.send(JSON.stringify({
          type: 'DRIFT_REPORT',
          current_position_ms: Math.round(localPosMs),
          client_timestamp: Date.now() / 1000
        }));
      }
    }, 3000); // Report drift every 3 seconds
  }

  sendCommand(action: string, positionMs?: number, songId?: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: action,
        position_ms: positionMs,
        song_id: songId,
        client_timestamp: Date.now() / 1000
      }));
    }
  }

  sendReaction(emoji: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'REACTION',
        emoji
      }));
    }
  }

  subscribe(listener: WebSocketListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(data: any) {
    this.listeners.forEach((l) => l(data));
  }

  getClockSkewMs(): number {
    return this.clockSkewMs;
  }

  private stopIntervals() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.driftInterval) clearInterval(this.driftInterval);
  }

  disconnect() {
    this.intentionalDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.stopIntervals();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.roomId = null;
  }
}

export const roomWs = new RoomWebSocketService();

