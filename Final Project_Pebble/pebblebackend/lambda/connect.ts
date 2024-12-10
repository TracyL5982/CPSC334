// lambda/connect.ts
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { PebbleWebSocketEvent } from '../types/websocket';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event: PebbleWebSocketEvent) => {
  try {
    const connectionId = event.requestContext.connectionId;
    const deviceId = event.queryStringParameters?.deviceId;

    if (!deviceId) {
      return { statusCode: 400, body: 'deviceId is required' };
    }

    // Check if device exists and preserve partnerId if it does
    const existingDevice = await dynamo.send(new GetCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { deviceId }
    }));

    const partnerId = existingDevice.Item?.partnerId;

    const item = {
      deviceId,
      connectionId,
      timestamp: Date.now(),
      lastHeartbeat: Date.now(),
      ...(partnerId && { partnerId })
    };

    console.log('Storing connection:', item);

    await dynamo.send(new PutCommand({
      TableName: process.env.TABLE_NAME!,
      Item: item
    }));

    // Verify the connection was stored
    const verifyResult = await dynamo.send(new GetCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { deviceId }
    }));

    console.log('Verified connection:', verifyResult.Item);

    return { statusCode: 200, body: 'Connected' };
  } catch (error) {
    console.error('Connection error:', error);
    return { statusCode: 500, body: 'Failed to connect' };
  }
};