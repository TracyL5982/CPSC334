// lambda/messageProcessor.ts
import { SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});

interface MessageDetail {
  senderId: string;
  receiverId: string;
  timestamp: number;
  timeSinceLastClick: number;
  messageId: string;
  messageGroupId: string;
}

interface EventBridgeEvent {
  detail: MessageDetail;
  'detail-type': string;
  source: string;
  // ... other fields we don't need
}



export const handler = async (event: SQSEvent) => {
    const apiGw = new ApiGatewayManagementApiClient({
      endpoint: process.env.WEBSOCKET_ENDPOINT,
    });
  
    // Sort records by sequence number before processing
    const records = event.Records.slice().sort((a, b) => {
      const detailA = JSON.parse(a.body).detail;
      const detailB = JSON.parse(b.body).detail;
      return detailA.sequenceNumber - detailB.sequenceNumber;
    });
  
    console.log('Sorted message batch:', records.map(record => {
      const detail = JSON.parse(record.body).detail;
      return {
        messageId: detail.messageId,
        sequenceNumber: detail.sequenceNumber,
        timestamp: detail.timestamp
      };
    }));
  
    for (const record of records) {
      try {
        const eventBridgeEvent = JSON.parse(record.body);
        const detail = eventBridgeEvent.detail;
        
        console.log('Processing message:', {
          messageId: detail.messageId,
          senderId: detail.senderId,
          receiverId: detail.receiverId,
          timestamp: detail.timestamp,
          sequenceNumber: detail.sequenceNumber
        });
  
        // Get receiver's connection with detailed logging
        console.log('Looking up receiver connection:', detail.receiverId);
        
        const receiverResult = await dynamo.send(new GetCommand({
          TableName: process.env.TABLE_NAME!,
          Key: { deviceId: detail.receiverId },
        }));
  
        console.log('Receiver lookup result:', {
          found: !!receiverResult.Item,
          connectionId: receiverResult.Item?.connectionId,
          lastHeartbeat: receiverResult.Item?.lastHeartbeat,
          deviceId: receiverResult.Item?.deviceId
        });
  
        if (!receiverResult.Item?.connectionId) {
          console.error(`No connection found for receiver ${detail.receiverId}. Full record:`, receiverResult.Item);
          continue;
        }
  
        try {
          await apiGw.send(new PostToConnectionCommand({
            ConnectionId: receiverResult.Item.connectionId,
            Data: JSON.stringify({
              type: 'click',
              timestamp: detail.timestamp,
              timeSinceLastClick: detail.timeSinceLastClick,
              messageId: detail.messageId,
              sequenceNumber: detail.sequenceNumber // Include sequence number in output
            }),
          }));
  
          console.log(`Successfully sent message ${detail.messageId} to connection ${receiverResult.Item.connectionId}`);
        } catch (sendError) {
          console.error('Error sending message:', {
            error: sendError,
            connectionId: receiverResult.Item.connectionId,
            messageId: detail.messageId,
            sequenceNumber: detail.sequenceNumber
          });
          
          // If we get a GoneException, the connection is stale
          if ((sendError as any).name === 'GoneException') {
            console.log('Connection is stale, cleaning up...');
            // You might want to clean up the stale connection here
          }
          throw sendError;
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    }
  };