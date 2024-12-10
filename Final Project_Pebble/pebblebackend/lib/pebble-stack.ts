// lib/pebble-stack.ts
import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

import { RuleTargetInput } from 'aws-cdk-lib/aws-events'; // Needed if you use fromPath()



export class PebbleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table
    const connectionsTable = new dynamodb.Table(this, "DeviceConnections", {
      tableName: "pebble-device-connections",
      partitionKey: {
        name: "deviceId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // EventBridge bus
    const eventBus = new events.EventBus(this, 'PebbleEventBus', {
      eventBusName: 'pebble-events'
    });



    // SQS FIFO queue for message processing
    const messageQueue = new sqs.Queue(this, 'MessageQueue', {
      fifo: true,
      queueName: 'pebble-messages.fifo',
      contentBasedDeduplication: true,
    });

        // Create a DLQ for Lambda failures
        const lambdaDeadLetterQueue = new sqs.Queue(this, 'LambdaDeadLetterQueue', {
          fifo: true,
          queueName: 'pebble-lambda-dlq.fifo',
          contentBasedDeduplication: true
        });



    // Create WebSocket API
    const webSocketApi = new apigatewayv2.WebSocketApi(this, "PebbleWebSocketApi");
    const stage = new apigatewayv2.WebSocketStage(this, "PebbleStage", {
      webSocketApi,
      stageName: "dev",
      autoDeploy: true,
    });

    // Define API Gateway policy
    const apiGwPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["execute-api:ManageConnections"],
      resources: [
        `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${stage.stageName}/*`,
      ],
    });

    // Message processor function
    const messageProcessorFunction = new NodejsFunction(this, 'MessageProcessorFunction', {
      entry: path.join(__dirname, '../lambda/messageProcessor.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: connectionsTable.tableName,
        WEBSOCKET_ENDPOINT: `https://${webSocketApi.apiId}.execute-api.${this.region}.amazonaws.com/${stage.stageName}`
      },
      timeout: cdk.Duration.seconds(30)
    });

    // Connect function
    const connectFunction = new NodejsFunction(this, "ConnectFunction", {
      entry: path.join(__dirname, "../lambda/connect.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: connectionsTable.tableName,
      },
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:Query",
            "dynamodb:Scan",
          ],
          resources: [connectionsTable.tableArn],
        }),
      ],
    });

    // Disconnect function
    const disconnectFunction = new NodejsFunction(this, "DisconnectFunction", {
      entry: path.join(__dirname, "../lambda/disconnect.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: connectionsTable.tableName,
      },
    });

    // Message function
    const messageFunction = new NodejsFunction(this, "MessageFunction", {
      entry: path.join(__dirname, "../lambda/message.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: connectionsTable.tableName,
        EVENT_BUS_NAME: eventBus.eventBusName
      },
    });

    // Pair function
    const pairFunction = new NodejsFunction(this, "PairFunction", {
      entry: path.join(__dirname, "../lambda/pair.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: connectionsTable.tableName,
      },
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "dynamodb:UpdateItem",
            "dynamodb:GetItem",
            "dynamodb:PutItem",
          ],
          resources: [connectionsTable.tableArn],
        }),
      ],
    });

    // Heartbeat function
    const heartbeatFunction = new NodejsFunction(this, "HeartbeatFunction", {
      entry: path.join(__dirname, "../lambda/heartbeat.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: connectionsTable.tableName,
      },
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "dynamodb:GetItem",
            "dynamodb:UpdateItem",
            "dynamodb:Query",
          ],
          resources: [connectionsTable.tableArn],
        }),
      ],
    });

    // Add WebSocket routes
    webSocketApi.addRoute("$connect", {
      integration: new integrations.WebSocketLambdaIntegration(
        "ConnectIntegration",
        connectFunction
      ),
    });

    webSocketApi.addRoute("$disconnect", {
      integration: new integrations.WebSocketLambdaIntegration(
        "DisconnectIntegration",
        disconnectFunction
      ),
    });

    webSocketApi.addRoute("message", {
      integration: new integrations.WebSocketLambdaIntegration(
        "MessageIntegration",
        messageFunction
      ),
    });

    webSocketApi.addRoute("pair", {
      integration: new integrations.WebSocketLambdaIntegration(
        "PairIntegration",
        pairFunction
      ),
    });

    webSocketApi.addRoute("heartbeat", {
      integration: new integrations.WebSocketLambdaIntegration(
        "HeartbeatIntegration",
        heartbeatFunction
      ),
    });

    // EventBridge to SQS rule
// EventBridge to SQS rule
// new events.Rule(this, 'ClickEvents', {
//   eventBus,
//   eventPattern: {
//     source: ['pebble.click'],
//     detailType: ['click']
//   },
//   targets: [new targets.SqsQueue(messageQueue, {
//     messageGroupId: '#{detail.messageGroupId}',
//     message: RuleTargetInput.fromEventPath('$.detail') // Use RuleTargetInput for message deduplication
//   })]
// });

new events.Rule(this, 'ClickEvents', {
  eventBus,
  eventPattern: {
    source: ['pebble.click'],
    detailType: ['click']
  },
  targets: [new targets.SqsQueue(messageQueue, {
    messageGroupId: '#{detail.messageGroupId}'
  })]
});


    // Add SQS trigger to message processor
    messageProcessorFunction.addEventSource(new SqsEventSource(messageQueue, {
      batchSize: 1
    }));

    // Add DLQ configuration to the Lambda function itself
    messageProcessorFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sqs:SendMessage'],
      resources: [lambdaDeadLetterQueue.queueArn]
    }));

    messageProcessorFunction.addEnvironment('DLQ_URL', lambdaDeadLetterQueue.queueUrl);
    
    // Grant permissions
    connectionsTable.grantWriteData(connectFunction);
    connectionsTable.grantReadWriteData(messageProcessorFunction);
    connectionsTable.grantReadWriteData(heartbeatFunction);
    connectionsTable.grantReadWriteData(messageFunction);
    connectionsTable.grantReadWriteData(disconnectFunction);

    eventBus.grantPutEventsTo(messageFunction);
    messageQueue.grantSendMessages(new iam.ServicePrincipal('events.amazonaws.com'));

    // Add API Gateway permissions to all functions
    [
      connectFunction,
      disconnectFunction,
      messageFunction,
      pairFunction,
      heartbeatFunction,
      messageProcessorFunction
    ].forEach(fn => fn.addToRolePolicy(apiGwPolicy));

    // Output
    new cdk.CfnOutput(this, "WebSocketURL", {
      value: stage.url,
      description: "WebSocket API URL",
    });
  }
}