import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

import { Order } from "../models/order";

type Table = aws.dynamodb.Table;
type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;
type EventHandler = aws.lambda.EventHandler<Request, Response>;

const client = new aws.sdk.DynamoDB.DocumentClient();

interface Transaction {

    transactionId: string;
    resourceId: string;
    quantity: number;
    buyOrderId: string;
    sellOrderId: string;

}


export const putOrder = (buys: Table, sells: Table): EventHandler => {

    return async (event: Request): Promise<Response> => {

        if (event.body == null) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "No body is received"
                })
            }
        }

        let order: Order = JSON.parse(new Buffer(event.body, "base64").toString());

        var params = {
            TableName: order.mode == "BUY" ? buys.name.get() : sells.name.get(),
            Item: {
                'orderId': uuid.v4(),
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
                orderId: params.Item.orderId
            })
        }
    }
}