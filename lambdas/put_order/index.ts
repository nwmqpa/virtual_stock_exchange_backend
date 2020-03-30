import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

import { Order } from "./order";

type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;

const client = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: Request): Promise<Response> => {
    if (process.env.BUYS_TABLE == undefined) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "BUYS_TABLE is not defined"
            })
        }
    }
    const buysTable = process.env.BUYS_TABLE;

    if (process.env.SELLS_TABLE == undefined) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "SELLS_TABLE is not defined"
            })
        }
    }
    const sellsTable = process.env.SELLS_TABLE;

    if (event.body == null) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "No body is received"
            })
        }
    }

    let order: Order;
    if (event.isBase64Encoded) {
        order = {orderId: uuid.v4(), ...JSON.parse(new Buffer(event.body, "base64").toString())};
    } else {
        order = {orderId: uuid.v4(), ...JSON.parse(event.body)};
    }

    var params = {
        TableName: order.mode == "BUY" ? buysTable : sellsTable,
        Item: {
            'orderId': order.orderId,
            'resourceId': order.resourceId,
            'quantity': order.quantity,
            'price': order.price.toFixed(2),
            'issuerId': order.issuerId
        }
    };

    await client.put(params).promise();

    return {
        statusCode: 200,
        body: JSON.stringify({
            order
        })
    }
}