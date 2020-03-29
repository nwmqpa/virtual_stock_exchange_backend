import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

import { Order } from "../models/order";

interface OutputOrder extends Order {
    orderId: string;
}

type Table = aws.dynamodb.Table;
type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;
type EventHandler = aws.lambda.EventHandler<Request, Response>;

export const getOrders = (buys: Table, sells: Table): EventHandler => {

    return async (event: Request): Promise<Response> => {

        if (event.body == null) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    error: "Body is null"
                })
            }
        }

        const issuerId = JSON.parse(new Buffer(event.body, "base64").toString())["issuerId"];

        const client = new aws.sdk.DynamoDB.DocumentClient();

        const buyOrders: OutputOrder[] | undefined = await client.scan({
            TableName: buys.name.get(),
            FilterExpression: '#issuerId = :issuerId',
            ExpressionAttributeNames: {
                '#issuerId': "issuerId"
            },
            ExpressionAttributeValues: {
                ':issuerId': issuerId
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
            TableName: sells.name.get(),
            FilterExpression: '#issuerId = :issuerId',
            ExpressionAttributeNames: {
                '#issuerId': "issuerId"
            },
            ExpressionAttributeValues: {
                ':issuerId': issuerId
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

        let orders: OutputOrder[] = []
        if (buyOrders != undefined) {
            orders = orders.concat(buyOrders)
        }
        if (sellOrders != undefined) {
            orders = orders.concat(sellOrders)
        }
        

        return {
            statusCode: 200,
            body: JSON.stringify({
                orders
            })
        }

    }
}
