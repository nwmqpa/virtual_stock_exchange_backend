import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';

type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;

interface Resource {
    resourceId: string;
    name: string;
    image: string;
    type: "solid" | "fluid";
}

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

    if (event.body == null) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "No body is received"
            })
        }
    }

    const client = new AWS.DynamoDB.DocumentClient();

    let resource: Resource;
    if (event.isBase64Encoded) {
        resource = JSON.parse(new Buffer(event.body, "base64").toString())
    } else {
        resource = JSON.parse(event.body)
    }

    await client.put({
        TableName: resourcesTable,
        Item: resource
    }).promise();

    return {
        statusCode: 200,
        body: JSON.stringify(resource)
    }
}
