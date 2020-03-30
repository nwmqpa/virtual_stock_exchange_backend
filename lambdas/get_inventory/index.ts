import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';

type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;

const client = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: Request): Promise<Response> => {

    if (process.env.INVENTORIES_TABLE == undefined) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "INVENTORIES_TABLE is not defined"
            })
        }
    }
    const inventoriesTable = process.env.INVENTORIES_TABLE;

    if (event.body == null) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                error: "Body is null"
            })
        }
    }

    let data: {ownerId: string};
    if (event.isBase64Encoded) {
        data = JSON.parse(new Buffer(event.body, "base64").toString());
    } else {
        data = JSON.parse(event.body);
    }

    const result = await client.query({
        TableName: inventoriesTable,
        KeyConditionExpression: 'ownerId = :oId',
        ExpressionAttributeValues: {
            ':oId': data.ownerId
        }
    }).promise();

    return {
        statusCode: 200,
        body: JSON.stringify({
            items: result.Items
        })
    }

}
