import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

import { Order } from "../models/order";

type Table = aws.dynamodb.Table;
type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;
type EventHandler = aws.lambda.EventHandler<Request, Response>;

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

        const client = new aws.sdk.DynamoDB.DocumentClient();
        let order: Order = JSON.parse(new Buffer(event.body, "base64").toString());

        var params = {
            TableName: 'CUSTOMER_LIST',
            Item: {
                'orderId': uuid.v4(),
                'resourceId': order.resourceId,
                'quantity': order.quantity.toString(),
                'price': order.price.toString(),
                'issuerId': order.issuerId.toString()
            }
        };

        if (order.mode == "BUY") {
            params.TableName = buys.name.get();
        } else {
            params.TableName = sells.name.get();
        }


        await client.put(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                orderId: params.Item.orderId 
            })
        }
    }
}