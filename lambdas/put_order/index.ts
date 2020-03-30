import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

import { Order } from "./order";

type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;

const client = new AWS.DynamoDB.DocumentClient();

if (process.env.BUYS_TABLE == undefined) {
    console.error("BUYS_TABLE is not defined")
    process.exit()
} else if (process.env.SELLS_TABLE == undefined) {
    console.error("SELLS_TABLE is not defined")
    process.exit()
} else if (process.env.ACCOUNTS_TABLE == undefined) {
    console.error("ACCOUNTS_TABLE is not defined")
    process.exit()
} else if (process.env.INVENTORIES_TABLE == undefined) {
    console.error("INVENTORIES_TABLE is not defined")
    process.exit()
}

const buysTable = process.env.BUYS_TABLE;
const sellsTable = process.env.SELLS_TABLE;
const accountsTable = process.env.ACCOUNTS_TABLE;
const inventoriesTable = process.env.INVENTORIES_TABLE;


const payOrder = async (order: Order): Promise<Response | undefined> => {
    const result = await client.get({
        TableName: accountsTable,
        Key: {
            ownerId: order.issuerId,
        }
    }).promise()
    if (result.Item != undefined) {
        const toPay = order.price * order.quantity;
        if (toPay > result.Item["balance"]) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Insufficient funds"
                })
            };
        }
        await client.update({
            TableName: accountsTable,
            Key: {
                ownerId: order.issuerId
            },
            UpdateExpression: "ADD #balance :topay",
            ExpressionAttributeValues: {
                ":topay": -toPay
            },
            ExpressionAttributeNames: {
                "#balance": "balance"
            }
        }).promise()
        return undefined;
    } else {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "No user is registered to this issuerId"
            })
        };
    }
}

const retrieveStock = async (order: Order): Promise<Response | undefined> => {
    const result = await client.get({
        TableName: inventoriesTable,
        Key: {
            ownerId: order.issuerId,
            resourceId: order.resourceId
        }
    }).promise()
    if (result.Item != undefined) {
        const toPay = order.quantity;
        if (toPay > result.Item["quantity"]) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Insufficient stocks"
                })
            };
        }
        await client.update({
            TableName: inventoriesTable,
            Key: {
                ownerId: order.issuerId,
                resourceId: order.resourceId
            },
            UpdateExpression: "ADD #quantity :topay",
            ExpressionAttributeValues: {
                ":topay": -toPay
            },
            ExpressionAttributeNames: {
                "#quantity": "quantity"
            }
        }).promise()
        return undefined;
    } else {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "No user is registered to this issuerId"
            })
        };
    }
}


export const handler = async (event: Request): Promise<Response> => {

    if (event.body == null) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "No body is received"
            })
        }
    }

    const bodyData = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body);
    const order: Order = { orderId: uuid.v4(), ...bodyData }

    if (order.mode == "BUY") {
        const result = await payOrder(order);
        if (result != undefined) {
            return result;
        }
    } else if (order.mode == "SELL") {
        const result = await retrieveStock(order);
        if (result != undefined) {
            return result;
        }
    }

    await client.put({
        TableName: order.mode == "BUY" ? buysTable : sellsTable,
        Item: {
            'orderId': order.orderId,
            'resourceId': order.resourceId,
            'quantity': order.quantity,
            'price': Number(order.price.toFixed(2)),
            'issuerId': order.issuerId
        }
    }).promise();

    return {
        statusCode: 200,
        body: JSON.stringify({
            order
        })
    }
}