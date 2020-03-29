import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';

type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;

export const handler = async (event: Request): Promise<Response> => {

    if (process.env.ACCOUNTS_TABLE == undefined) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Account table name not defined"
            })
        }
    }
    const accountsTable = process.env.ACCOUNTS_TABLE


    if (event.body == null) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "No body is received"
            })
        }
    }

    const client = new AWS.DynamoDB.DocumentClient();

    let account: { ownerId: string, fcmToken?: string } = JSON.parse(new Buffer(event.body, "base64").toString());


    const item = await client.get({
        TableName: accountsTable,
        Key: {
            ownerId: account.ownerId
        }
    }).promise()

    if (item.Item == undefined) {
        await client.update({
            TableName: accountsTable,
            Key: {
                ownerId: account.ownerId
            },
            UpdateExpression: 'set #balance = :balance',
            ExpressionAttributeNames: { '#balance': 'balance' },
            ExpressionAttributeValues: {
                ':balance': 10000.00,
            }
        }).promise()
        item.Item = {
            ownerId: account.ownerId,
            balance: 10000.0,
            fcmToken: account.fcmToken
        }
    }

    if (account.fcmToken !== undefined) {
        await client.update({
            TableName: accountsTable,
            Key: {
                ownerId: account.ownerId
            },
            UpdateExpression: 'set #token = :token',
            ExpressionAttributeNames: { '#token': 'fcmToken' },
            ExpressionAttributeValues: {
                ':token': account.fcmToken,
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