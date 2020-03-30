import * as aws from "@pulumi/aws";
import * as AWS from 'aws-sdk';
import { exists } from "fs";
import * as admin from "firebase-admin";

type Event = aws.dynamodb.TableEvent

interface Resource {
    ownerId: string;
    resourceId: string;
    quantity: number;
}

interface Account {
    balance: number;
    ownerId: string;
    fcmToken?: string;
}


const client = new AWS.DynamoDB.DocumentClient()

if (process.env.ACCOUNTS_TABLE == undefined) {
    console.error("ACCOUNTS_TABLE is not defined")
    process.exit()
}

const accountsTable = process.env.ACCOUNTS_TABLE

if (process.env.PRIVATE_KEY_FCM == undefined) {
    console.error("PRIVATE_KEY_FCM is not defined")
    process.exit()
}

const privateKeyFcm = JSON.parse(process.env.PRIVATE_KEY_FCM)

admin.initializeApp({
    credential: admin.credential.cert(privateKeyFcm),
});

const getFcmTokenForAccount = async (ownerId: string): Promise<string | undefined> => {
    return client.query({
        TableName: accountsTable,
        KeyConditionExpression: "#oId = :oId",
        ExpressionAttributeNames: {
            "#oId": "ownerId"
        },
        ExpressionAttributeValues: {
            ":oId": ownerId
        }
    }).promise()
        .then(result => result.Items != undefined ? result.Items[0] : undefined)
        .then((item) => item != undefined ? (item as Account).fcmToken : undefined);
}

const updateInventory = async (record: aws.dynamodb.TableEventRecord) => {
    if (record.dynamodb.NewImage != undefined) {
        const resource = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage) as Resource
        const token = await getFcmTokenForAccount(resource.ownerId);
        if (token != undefined) {
            await admin.messaging().send({
                data: {
                    title: "action",
                    value: JSON.stringify({
                        action: "setItemAmount",
                        resourceId: resource.resourceId,
                        value: resource.quantity
                    })
                },
                token
            }).then((response: any) => {
                console.log('Successfully sent message:', response);
            }).catch((error: any) => {
                console.log('Error sending message:', error);
            });
        }
    }
}

export const handler = async (event: Event) => {
    await Promise.all(event.Records.map(async (record) => {
        switch (record.eventName) {
            case 'INSERT':
                await updateInventory(record)
                break;
            case 'MODIFY':
                await updateInventory(record)
                break;
            case 'REMOVE':
                break;
        }
    }))
}
