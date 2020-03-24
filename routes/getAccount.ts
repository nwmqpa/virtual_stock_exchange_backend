import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

type Table = aws.dynamodb.Table;
type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;
type EventHandler = aws.lambda.EventHandler<Request, Response>;

export const getAccount = (accounts: Table): EventHandler => {

    return async (event: Request): Promise<Response> => {

        if (event.body == null) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "No body is received"
                })
            }
        }

        const client = new aws.sdk.DynamoDB.DocumentClient();

        let account: { ownerId: string, fcmToken?: string } = JSON.parse(new Buffer(event.body, "base64").toString());


        const item = await client.get({
            TableName: accounts.name.get(),
            Key: {
                ownerId: account.ownerId
            }
        }).promise()

        if (item.Item == undefined) {
            await client.update({
                TableName: accounts.name.get(),
                Key: {
                    ownerId: account.ownerId
                },
                UpdateExpression: 'set #balance = :balance',
                ExpressionAttributeNames: {'#balance' : 'balance'},
                ExpressionAttributeValues: {
                    ':balance' : 10000.00,
                }
            }).promise()
            item.Item = {
                balance: 10000.0,
                fcmToken: account.fcmToken
            }
        }

        if (account.fcmToken !== undefined) {
            await client.update({
                TableName: accounts.name.get(),
                Key: {
                    ownerId: account.ownerId
                },
                UpdateExpression: 'set #token = :token',
                ExpressionAttributeNames: {'#token' : 'fcmToken'},
                ExpressionAttributeValues: {
                    ':token' : account.fcmToken,
                }
            }).promise()
        }

        return {
            statusCode: 200,
            body: JSON.stringify(
                item.Item
            )
        }
    }
}