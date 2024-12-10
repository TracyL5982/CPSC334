// lambda/heartbeat.ts

import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const HEARTBEAT_EXPIRY_MINUTES = 2;

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  try {
    const body = JSON.parse(event.body || '{}');
    const { deviceId } = body;

    // Update last heartbeat time
    const result = await dynamo.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { deviceId },
      UpdateExpression: 'SET lastHeartbeat = :now',
      ExpressionAttributeValues: {
        ':now': Date.now()
      },
      ReturnValues: 'ALL_NEW'
    }));

    // Check if device is paired and connected
    if (result.Attributes?.partnerId) {
      const partnerResult = await dynamo.send(new GetCommand({
        TableName: process.env.TABLE_NAME!,
        Key: { deviceId: result.Attributes.partnerId }
      }));

      if (partnerResult.Item) {
        const partnerLastHeartbeat = partnerResult.Item.lastHeartbeat || 0;
        const isPartnerActive = Date.now() - partnerLastHeartbeat < HEARTBEAT_EXPIRY_MINUTES * 60 * 1000;

        // Notify the device about partner's connection state
        const apiGw = new ApiGatewayManagementApiClient({
          endpoint: `https://${domain}/${stage}`
        });

        await apiGw.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            type: 'connectionState',
            partnerConnected: isPartnerActive
          })
        }));
      }
    }

    return { statusCode: 200, body: 'Heartbeat received' };
  } catch (error) {
    console.error('Heartbeat error:', error);
    return { statusCode: 500, body: 'Failed to process heartbeat' };
  }
};