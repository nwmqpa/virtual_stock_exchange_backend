import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';

type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;

export const handler = async (event: Request): Promise<Response> => {
    if (process.env.OHLCV_TABLE == undefined) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "OHLCV_TABLE is not defined"
            })
        }
    }
    const ohlcvTable = process.env.OHLCV_TABLE;

    if (event.body == null) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                error: "Body is null"
            })
        }
    }


    let data: {resourceId: string};
    if (event.isBase64Encoded) {
        data = JSON.parse(new Buffer(event.body, "base64").toString());
    } else {
        data = JSON.parse(event.body);
    }

    const client = new AWS.DynamoDB.DocumentClient();

    var params = {
        TableName: ohlcvTable,
        KeyConditionExpression: 'resourceId = :rId',
        ExpressionAttributeValues: {
            ':rId': data.resourceId
        }
    };

    const result = await client.query(params).promise();

    return {
        statusCode: 200,
        body: JSON.stringify({
            ohlcv: result.Items
        })
    }

}
