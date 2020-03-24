import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

import { Order } from "../models/order";

type Table = aws.dynamodb.Table;
type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;
type EventHandler = aws.lambda.EventHandler<Request, Response>;

export const getTrends = (resources: Table, ohlcv: Table): EventHandler => {

    return async (event: Request): Promise<Response> => {

        const client = new aws.sdk.DynamoDB.DocumentClient();
        var params = {
            TableName: resources.name.get(),
            AttributesToGet: [ "resourceId" ]
        };

        const resourcesIds = await client.scan(params).promise();

        if (resourcesIds.Items === undefined) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Cannot query resources"
                })
            }
        }

        const result = await Promise.all(resourcesIds.Items.map(async ({resourceId}) => {
            var params = {
                TableName: ohlcv.name.get(),
                KeyConditionExpression: "#rid = :rid",
                ExpressionAttributeNames:{
                    "#rid": "resourceId"
                },
                ExpressionAttributeValues: {
                    ":rid": resourceId
                },
                ScanIndexForward: false
            };
            const data = await client.query(params).promise();
            if (data.Items !== undefined && data.Items.length >= 2) {
                const close1: number = data.Items[0]["close"];
                const close2: number = data.Items[1]["close"];
                return {resourceId, trend: ((close1 / close2) * 100) - 100};
            }
            return {resourceId, trend: 0.0};
        }))


        return {
            statusCode: 200,
            body: JSON.stringify({
                trends: result
            })
        }

    }
}
