import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';

type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;

export const handler = async (event: Request): Promise<Response> => {
    if (process.env.RESOURCES_TABLE == undefined) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "RESOURCES_TABLE is not defined"
            })
        }
    }
    const resourcesTable = process.env.RESOURCES_TABLE;

    const client = new AWS.DynamoDB.DocumentClient();
    var params = {
        TableName: resourcesTable,
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
