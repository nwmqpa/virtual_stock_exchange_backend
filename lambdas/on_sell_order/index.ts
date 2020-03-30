import * as aws from "@pulumi/aws";
import * as AWS from 'aws-sdk';

type Event = aws.dynamodb.TableEvent

export const handler = async (event: Event) => {

    console.log(event.Records)

}
