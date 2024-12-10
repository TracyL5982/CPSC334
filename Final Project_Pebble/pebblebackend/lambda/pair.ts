// lambda/pair.ts
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  console.log('Received pairing request:', JSON.stringify(event, null, 2));
  
  try {
    const body = JSON.parse(event.body || '{}');
    const { deviceId, partnerId } = body;

    // Verify both devices exist
    const [deviceExists, partnerExists] = await Promise.all([
      dynamo.send(new GetCommand({
        TableName: process.env.TABLE_NAME!,
        Key: { deviceId }
      })),
      dynamo.send(new GetCommand({
        TableName: process.env.TABLE_NAME!,
        Key: { deviceId: partnerId }
      }))
    ]);

    if (!deviceExists.Item || !partnerExists.Item) {
      console.error('One or both devices not found:', { deviceExists, partnerExists });
      return { statusCode: 400, body: 'One or both devices not found' };
    }

    console.log('Updating device pairs:', { deviceId, partnerId });

    // Update both devices to be paired with each other
    await Promise.all([
      dynamo.send(new UpdateCommand({
        TableName: process.env.TABLE_NAME!,
        Key: { deviceId },
        UpdateExpression: 'SET partnerId = :partnerId',
        ExpressionAttributeValues: { ':partnerId': partnerId }
      })),
      dynamo.send(new UpdateCommand({
        TableName: process.env.TABLE_NAME!,
        Key: { deviceId: partnerId },
        UpdateExpression: 'SET partnerId = :partnerId',
        ExpressionAttributeValues: { ':partnerId': deviceId }
      }))
    ]);

    console.log('Pairing successful');
    return { statusCode: 200, body: 'Devices paired successfully' };
  } catch (error) {
    console.error('Pairing error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to pair devices', details: error }) };
  }
};