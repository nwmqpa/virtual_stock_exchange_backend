import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

import { Order } from "../models/order";

type Table = aws.dynamodb.Table;
type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;
type EventHandler = aws.lambda.EventHandler<Request, Response>;

export const getInventory = (inventories: Table): EventHandler => {

    return async (event: Request): Promise<Response> => {

        if (event.body == null) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    error: "Body is null"
                })
            }
        }

        const ownerId = JSON.parse(new Buffer(event.body, "base64").toString())["ownerId"];

        const client = new aws.sdk.DynamoDB.DocumentClient();

        var params = {
            TableName: inventories.name.get(),
            KeyConditionExpression: 'ownerId = :oId',
            ExpressionAttributeValues: {
                ':oId': ownerId
            }
        };

        const result = await client.query(params).promise();


        return {
            statusCode: 200,
            body: JSON.stringify({
                items: result.Items
            })
        }

    }
}
