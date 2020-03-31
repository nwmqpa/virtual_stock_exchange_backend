import * as aws from "@pulumi/aws";
import * as AWS from 'aws-sdk';
import * as admin from "firebase-admin";
import * as uuid from 'uuid';

type Event = aws.dynamodb.TableEvent

interface Account {
    balance: number;
    ownerId: string;
    fcmToken?: string;
}

interface Order {
    issuerId: string;
    resourceId: string;
    orderId: string;
    quantity: number;
    price: number;
}

const client = new AWS.DynamoDB.DocumentClient()

if (process.env.ACCOUNTS_TABLE == undefined) {
    console.error("ACCOUNTS_TABLE is not defined")
    process.exit()
}

const accountsTable = process.env.ACCOUNTS_TABLE

if (process.env.BUYS_TABLE == undefined) {
    console.error("BUYS_TABLE is not defined")
    process.exit()
}

const buysTable = process.env.BUYS_TABLE

if (process.env.SELLS_TABLE == undefined) {
    console.error("SELLS_TABLE is not defined")
    process.exit()
}

const sellsTable = process.env.SELLS_TABLE

if (process.env.TRANSACTIONS_TABLE == undefined) {
    console.error("TRANSACTIONS_TABLE is not defined")
    process.exit()
}

const transactionsTable = process.env.TRANSACTIONS_TABLE

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

const completeOrderClient = async (record: aws.dynamodb.TableEventRecord) => {
    if (record.dynamodb.OldImage != undefined) {
        const order = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage) as Order
        const token = await getFcmTokenForAccount(order.issuerId);
        if (token != undefined) {
            await admin.messaging().send({
                data: {
                    title: "action",
                    value: JSON.stringify({
                        action: "orderComplete",
                        value: order.orderId
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

const updateOrderClient = async (record: aws.dynamodb.TableEventRecord) => {
    if (record.dynamodb.NewImage != undefined) {
        const order = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage) as Order
        const token = await getFcmTokenForAccount(order.issuerId);
        if (token != undefined) {
            await admin.messaging().send({
                data: {
                    title: "action",
                    value: JSON.stringify({
                        action: "orderUpdate",
                        orderId: order.orderId,
                        value: order.quantity
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

const createTransaction = async (order: Order, buyOrder: Order): Promise<[Order, Order]> => {
    const requested = order.quantity; 
    order.quantity -= buyOrder.quantity;
    buyOrder.quantity -= requested;

    const transferred = requested - (order.quantity > 0 ? order.quantity : 0)

    await client.put({
        TableName: transactionsTable,
        Item: {
            resourceId: order.resourceId,
            timestamp: Date.now(),
            transactionId: uuid.v4(),
            buyerId: buyOrder.issuerId,
            sellerId: order.issuerId,
            price: buyOrder.price,
            quantity: transferred
        }
    }).promise();
    return [order, buyOrder]
}

const updateOrder = async (order: Order, table: string, mode: "BUY" | "SELL") => {
    if (order.quantity > 0) {
        return client.update({
            TableName: table,
            Key: {
                resourceId: order.resourceId,
                orderId: order.orderId
            },
            UpdateExpression: "set #quantity = :quantity",
            ExpressionAttributeNames: {
                "#quantity": "quantity"
            },
            ExpressionAttributeValues: {
                ":quantity": order.quantity
            }
        }).promise()
    } else {
        await client.delete({
            TableName: table,
            Key: {
                resourceId: order.resourceId,
                orderId: order.orderId
            }
        }).promise()
    }
}

const matchOrder = async (record: aws.dynamodb.TableEventRecord) => {
    if (record.dynamodb.NewImage != undefined) {
        let order = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage) as Order
        const orders = await client.scan({
            TableName: buysTable,
            FilterExpression: "#resourceId = :resourceId AND #price >= :price AND (NOT #issuerId = :issuerId)",
            ExpressionAttributeNames: {
                "#resourceId": "resourceId",
                "#price": "price",
                "#issuerId": "issuerId"
            },
            ExpressionAttributeValues: {
                ":resourceId": order.resourceId,
                ":price": order.price,
                ":issuerId": order.issuerId
            }
        }).promise().then(result => result.Items).then(items => items?.map(item => item as Order))
        if (orders != undefined) {
            await Promise.all(orders.map(async (buyOrder) => {
                if (order.quantity > 0) {
                    [order, buyOrder] = await createTransaction(order, buyOrder)
                    await updateOrder(buyOrder, buysTable, "BUY")
                }
            }));
        }
        return updateOrder(order, sellsTable, "SELL")
    }
}



export const handler = async (event: Event) => {

    await Promise.all(event.Records.map(async (record) => {
        switch (record.eventName) {
            case 'INSERT':
                await matchOrder(record)
                break;
            case 'MODIFY':
                await updateOrderClient(record)
                break;
            case 'REMOVE':
                await completeOrderClient(record)
                break;
        }
    }))
}
