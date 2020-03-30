import * as aws from "@pulumi/aws";
import * as AWS from 'aws-sdk';
import { exists } from "fs";
import * as admin from "firebase-admin";

type Event = aws.dynamodb.TableEvent

interface Account {
    balance: number;
    ownerId: string;
    fcmToken?: string;
}

if (process.env.PRIVATE_KEY_FCM == undefined) {
    console.error("PRIVATE_KEY_FCM is not defined")
    process.exit()
}

const privateKeyFcm = JSON.parse(process.env.PRIVATE_KEY_FCM)

admin.initializeApp({
    credential: admin.credential.cert(privateKeyFcm),
});

const updateBalance = async (record: aws.dynamodb.TableEventRecord) => {
    if (record.dynamodb.NewImage != undefined) {
        const newAccount = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage) as Account
        if (newAccount.fcmToken != undefined) {
            await admin.messaging().send({
                data: {
                    title: "action",
                    value: JSON.stringify({
                        action: "setBalance",
                        value: newAccount.balance
                    })
                },
                token: newAccount.fcmToken
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
                break;
            case 'MODIFY':
                await updateBalance(record)
                break;
            case 'REMOVE':
                break;
        }
    }))
}
