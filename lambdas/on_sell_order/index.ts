import * as aws from "@pulumi/aws";
import * as AWS from 'aws-sdk';

type Event = aws.dynamodb.TableEvent

export const handler = async (event: Event) => {
    if (process.env.PRIVATE_KEY_FCM == undefined) {
        console.error("PRIVATE_KEY_FCM is not defined")
        return
    }
    const privateKeyFcm = JSON.parse(process.env.PRIVATE_KEY_FCM);

    event.Records.forEach(record => {
        switch (record.eventName) {
            case 'INSERT':
                break;
            case 'MODIFY':
                // TODO: Tell issuer
                break;
            case 'REMOVE':
                // TODO: Tell issuer
                break;
        }
    })
}
