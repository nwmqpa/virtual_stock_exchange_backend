"use strict;"
import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';

export const handler = async (event: awsx.apigateway.Request): Promise<awsx.apigateway.Response> => {

    if (process.env.RESOURCES_TABLE == undefined) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "RESOURCES_TABLE is not defined"
            })
        }
    }
    if (process.env.OHLCV_TABLE == undefined) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "OHLCV_TABLE is not defined"
            })
        }
    }
    const resourcesTable = process.env.RESOURCES_TABLE;
    const ohlcvTable = process.env.OHLCV_TABLE;

    const client = new AWS.DynamoDB.DocumentClient();

    var params = {
        TableName: resourcesTable,
        AttributesToGet: ["resourceId"]
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

    const result = await Promise.all(resourcesIds.Items.map(async ({ resourceId }) => {
        var params = {
            TableName: ohlcvTable,
            KeyConditionExpression: "#rid = :rid",
            ExpressionAttributeNames: {
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
            return { resourceId, trend: ((close1 / close2) * 100) - 100 };
        }
        return { resourceId, trend: 0.0 };
    }))


    return {
        statusCode: 200,
        body: JSON.stringify({
            trends: result
        })
    }

}
