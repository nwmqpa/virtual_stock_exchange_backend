import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';

import { Order } from "./order";

interface OutputOrder extends Order {
    orderId: string;
}

type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;

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
                statusCode: 200,
                body: JSON.stringify({
                    error: "Body is null"
                })
            }
        }
        
        let data: {issuerId: string};
        if (event.isBase64Encoded) {
            data = JSON.parse(new Buffer(event.body, "base64").toString());
        } else {
            data = JSON.parse(event.body);
        }

        const client = new AWS.DynamoDB.DocumentClient();

        const buyOrders: OutputOrder[] | undefined = await client.scan({
            TableName: buysTable,
            FilterExpression: '#issuerId = :issuerId',
            ExpressionAttributeNames: {
                '#issuerId': "issuerId"
            },
            ExpressionAttributeValues: {
                ':issuerId': data.issuerId
            }
        }).promise().then(items => items.Items?.map(item => {
            return {
                orderId: item["orderId"],
                mode: "BUY",
                resourceId: item["resourceId"],
                price: item["price"],
                issuerId: item["issuerId"],
                quantity: item["quantity"]
            }
        }));

        const sellOrders: OutputOrder[] | undefined = await client.scan({
            TableName: sellsTable,
            FilterExpression: '#issuerId = :issuerId',
            ExpressionAttributeNames: {
                '#issuerId': "issuerId"
            },
            ExpressionAttributeValues: {
                ':issuerId': data.issuerId
            }
        }).promise().then(items => items.Items?.map(item => {
            return {
                orderId: item["orderId"],
                mode: "SELL",
                resourceId: item["resourceId"],
                price: item["price"],
                issuerId: item["issuerId"],
                quantity: item["quantity"]
            }
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                orders: (buyOrders ?? []).concat(sellOrders ?? [])
            })
        }

    }
