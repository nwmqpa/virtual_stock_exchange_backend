import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

import { Order } from "../models/order";

type Table = aws.dynamodb.Table;
type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;
type EventHandler = aws.lambda.EventHandler<Request, Response>;

export const getResources = (resources: Table): EventHandler => {

    return async (event: Request): Promise<Response> => {

        const client = new aws.sdk.DynamoDB.DocumentClient();
        var params = {
            TableName: resources.name.get(),
            Select: "ALL_ATTRIBUTES"
        };

        const result = await client.scan(params).promise();


        return {
            statusCode: 200,
            body: JSON.stringify({
                resources: result.Items
            })
        }

    }
}
