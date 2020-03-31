import * as aws from "@pulumi/aws";
import * as AWS from 'aws-sdk';
import * as admin from "firebase-admin";

type Event = aws.dynamodb.TableEvent

interface Account {
    balance: number;
    ownerId: string;
    fcmToken?: string;
}

interface Transaction {
    timestamp: number;
    resourceId: string;
    transactionId: string;
    buyerId: string;
    sellerId: string;
    quantity: number;
    price: number;
}

const client = new AWS.DynamoDB.DocumentClient()

if (process.env.ACCOUNTS_TABLE == undefined) {
    console.error("ACCOUNTS_TABLE is not defined")
    process.exit()
}

const accountsTable = process.env.ACCOUNTS_TABLE

if (process.env.INVENTORIES_TABLE == undefined) {
    console.error("INVENTORIES_TABLE is not defined")
    process.exit()
}

const inventoriesTable = process.env.INVENTORIES_TABLE;


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


const updateSellerBalance = async (transaction: Transaction) => {
    const token = await getFcmTokenForAccount(transaction.sellerId)
    const pay = Number((transaction.price * transaction.quantity).toFixed(2))
    console.log(pay)
    await client.update({
        TableName: accountsTable,
        Key: {
            ownerId: transaction.sellerId
        },
        UpdateExpression: "ADD #balance :pay",
        ExpressionAttributeNames: {
            "#balance": "balance"
        },
        ExpressionAttributeValues: {
            ":pay": pay
        }
    }).promise()
    if (token != undefined) {
        await admin.messaging().send({
            data: {
                title: "action",
                value: JSON.stringify({
                    action: "addBalance",
                    value: pay
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

const updateBuyerStock = async (transaction: Transaction) => {
    const token = await getFcmTokenForAccount(transaction.buyerId)
    const item = (await client.get({
        TableName: inventoriesTable,
        Key: {
            ownerId: transaction.buyerId,
            resourceId: transaction.resourceId
        }
    }).promise()).Item
    if (item != undefined) {
        await client.put({
            TableName: inventoriesTable,
            Item: {
                resourceId: transaction.resourceId,
                ownerId: transaction.buyerId,
                quantity: transaction.quantity
            }
        }).promise()
        if (token != undefined) {
            await admin.messaging().send({
                data: {
                    title: "action",
                    value: JSON.stringify({
                        action: "setItemAmount",
                        resourceId: transaction.resourceId,
                        value: transaction.quantity
                    })
                },
                token
            }).then((response: any) => {
                console.log('Successfully sent message:', response);
            }).catch((error: any) => {
                console.log('Error sending message:', error);
            });
        }
    } else {
        await client.update({
            TableName: inventoriesTable,
            Key: {
                ownerId: transaction.buyerId,
                resourceId: transaction.resourceId
            },
            UpdateExpression: "ADD #quantity :quantity",
            ExpressionAttributeNames: {
                "#quantity": "quantity"
            },
            ExpressionAttributeValues: {
                ":quantity": transaction.quantity
            }
        }).promise()
        if (token != undefined) {
            await admin.messaging().send({
                data: {
                    title: "action",
                    value: JSON.stringify({
                        action: "addItemAmount",
                        resourceId: transaction.resourceId,
                        value: transaction.quantity
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

const processTransaction = async (record: aws.dynamodb.TableEventRecord) => {
    if (record.dynamodb.NewImage != undefined) {
        const transaction = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage) as Transaction;
        await updateSellerBalance(transaction)
        await updateBuyerStock(transaction);
    }
}

export const handler = async (event: Event) => {

    await Promise.all(event.Records.map(async (record) => {
        console.log(record);
        switch (record.eventName) {
            case 'INSERT':
                await processTransaction(record)
                break;
            case 'MODIFY':
                break;
            case 'REMOVE':
                break;
        }
    }))
}
