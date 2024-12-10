// tests/websocket-client.ts
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { RawData } from 'ws';

interface Message {
  action?: string;
  deviceId?: string;
  message?: {
    timestamp: number;
    timeSinceLastClick: number;
    messageId?: string;
  };
  type?: string; // For server-initiated messages
  messageId?: string;
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket;
  private deviceId: string;
  private lastClickTime: number = 0;
  private sentMessages: Set<string> = new Set();
  private receivedMessages: Set<string> = new Set();

  constructor(url: string, deviceId: string) {
    super();
    this.deviceId = deviceId;
    this.ws = new WebSocket(`${url}?deviceId=${encodeURIComponent(deviceId)}`);

    this.ws.on('open', () => {
      this.emit('connected');
    });

    this.ws.on('message', (data: RawData) => {
      const message: Message = JSON.parse(data.toString());
      if (message.messageId) {
        this.receivedMessages.add(message.messageId);
      }
      this.emit('message', message);
    });

    this.ws.on('close', () => {
      this.emit('disconnected');
    });

    this.ws.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }

  public sendClick(): string {
    const now = Date.now();
    const messageId = `${this.deviceId}-${now}`;
    const timeSinceLastClick = this.lastClickTime ? now - this.lastClickTime : 0;
    
    const message = {
      action: 'message',
      deviceId: this.deviceId,
      message: {
        timestamp: now,
        timeSinceLastClick,
        messageId
      }
    };

    this.ws.send(JSON.stringify(message));
    this.sentMessages.add(messageId);
    this.lastClickTime = now;
    return messageId;
  }

  public sendPair(partnerId: string): void {
    const message = {
      action: 'pair',
      deviceId: this.deviceId,
      partnerId: partnerId
    };
    this.ws.send(JSON.stringify(message));
  }

  public sendHeartbeat(): void {
    const message = {
      action: 'heartbeat',
      deviceId: this.deviceId,
    };
    this.ws.send(JSON.stringify(message));
  }

  public getMessageStats(): { sent: number; received: number } {
    return {
      sent: this.sentMessages.size,
      received: this.receivedMessages.size
    };
  }

  public getReceivedMessages(): Set<string> {
    return new Set(this.receivedMessages);
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public close(): void {
    this.ws.close();
  }
}
