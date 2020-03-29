import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';

export const handler = async (event: awsx.apigateway.Request): Promise<awsx.apigateway.Response> => {

    if (event.body == null) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "No body is received"
            })
        }
    }

    if (process.env.ACCOUNTS_TABLE == undefined) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Account table name not defined"
            })
        }
    }

    const client = new AWS.DynamoDB.DocumentClient();

    let account: { ownerId: string, fcmToken?: string } = JSON.parse(new Buffer(event.body, "base64").toString());


    const item = await client.get({
        TableName: process.env.ACCOUNTS_TABLE,
        Key: {
            ownerId: account.ownerId
        }
    }).promise()

    if (item.Item == undefined) {
        await client.update({
            TableName: process.env.ACCOUNTS_TABLE,
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
            TableName: process.env.ACCOUNTS_TABLE,
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