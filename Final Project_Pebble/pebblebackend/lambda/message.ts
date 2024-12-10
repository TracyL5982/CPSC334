// lambda/message.ts
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const eventBridge = new EventBridgeClient({});
const HEARTBEAT_EXPIRY_MINUTES = 2;

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    const body = JSON.parse(event.body || '{}');
    const { deviceId, message } = body;

    // Verify sending device exists and is connected
    const deviceResult = await dynamo.send(new GetCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { deviceId },
    }));

    if (!deviceResult.Item) {
      return { statusCode: 400, body: 'Device not found' };
    }

    if (deviceResult.Item.connectionId !== connectionId) {
      return { statusCode: 403, body: 'Invalid connection' };
    }

    if (!deviceResult.Item.partnerId) {
      return { statusCode: 400, body: 'No paired device found' };
    }

    // Verify partner device connection and heartbeat
    const partnerResult = await dynamo.send(new GetCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { deviceId: deviceResult.Item.partnerId },
    }));

    if (!partnerResult.Item?.connectionId) {
      return { statusCode: 400, body: 'Partner not connected' };
    }

    const partnerLastHeartbeat = partnerResult.Item.lastHeartbeat || 0;
    if (Date.now() - partnerLastHeartbeat > HEARTBEAT_EXPIRY_MINUTES * 60 * 1000) {
      return { statusCode: 400, body: 'Partner connection expired' };
    }

    const messageId = `${deviceId}-${message.timestamp}`;
const sequenceNumber = Date.now() * 1000 + Math.floor(Math.random() * 1000); // microsecond precision

    // const messageGroupId = `${deviceId}-${deviceResult.Item.partnerId}`;
    const messageGroupId = `${deviceId}-${message.timestamp}`; // Instead of ${deviceId}-${partnerId}

    // Log the event we're about to send
    console.log('Sending event:', {
      deviceId,
      partnerId: deviceResult.Item.partnerId,
      messageId,
      messageGroupId
    });

    // Send to EventBridge
    await eventBridge.send(new PutEventsCommand({
      Entries: [{
        EventBusName: process.env.EVENT_BUS_NAME,
        Source: 'pebble.click',
        DetailType: 'click',
        Detail: JSON.stringify({
          senderId: deviceId,
          receiverId: deviceResult.Item.partnerId,
          timestamp: message.timestamp,
          timeSinceLastClick: message.timeSinceLastClick,
          messageId,
          messageGroupId,
          sequenceNumber
        })
      }]
    }));

    return { statusCode: 200, body: 'Message queued' };
  } catch (error) {
    console.error('Message error:', error);
    return { statusCode: 500, body: 'Failed to queue message' };
  }
};