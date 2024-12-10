// lambda/disconnect.ts
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    
    const result = await dynamo.send(new ScanCommand({
      TableName: process.env.TABLE_NAME!,
      FilterExpression: 'connectionId = :connectionId',
      ExpressionAttributeValues: {
        ':connectionId': connectionId,
      },
    }));

    if (result.Items?.length) {
      await dynamo.send(new DeleteCommand({
        TableName: process.env.TABLE_NAME!,
        Key: { deviceId: result.Items[0].deviceId },
      }));
    }

    return { statusCode: 200, body: 'Disconnected' };
  } catch (error) {
    console.error('Disconnect error:', error);
    return { statusCode: 500, body: 'Failed to disconnect' };
  }
};