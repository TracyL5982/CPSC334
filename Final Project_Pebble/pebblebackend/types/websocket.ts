// types/websocket.ts
import { APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';

export interface PebbleWebSocketEvent extends APIGatewayProxyWebsocketEventV2 {
  queryStringParameters?: {
    deviceId?: string;
  };
}