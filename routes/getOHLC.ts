import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

import { Order } from "../models/order";

type Table = aws.dynamodb.Table;
type Request = awsx.apigateway.Request
type Response = awsx.apigateway.Response;
type EventHandler = aws.lambda.EventHandler<Request, Response>;

export const getOHLC = (ohlcv: Table): EventHandler => {

    return async (event: Request): Promise<Response> => {
        if (event.body == null) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    error: "Body is null"
                })
            }
        }
        
        let data = JSON.parse(new Buffer(event.body, "base64").toString());
        console.log(data);

        return {
            statusCode: 200,
            body: JSON.stringify({
                ohlc: [{
                    "open": 10,
                    "low": 8,
                    "high": 11,
                    "close": 10.5,
                    "volumeto": 20
                }]
            })
        }

    }
}
