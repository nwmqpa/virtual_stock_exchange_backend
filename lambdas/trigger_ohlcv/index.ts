import * as aws from "@pulumi/aws";
import * as AWS from 'aws-sdk';
import * as admin from "firebase-admin";

type Event = aws.cloudwatch.EventRuleEvent

interface Resource {
    resourceId: string;
    name: string;
    image: string;
    type: "solid" | "fluid";
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

if (process.env.TRANSACTIONS_TABLE == undefined) {
    console.error("TRANSACTIONS_TABLE is not defined")
    process.exit()
}

const transactionsTable = process.env.TRANSACTIONS_TABLE

if (process.env.OLD_TRANSACTIONS_TABLE == undefined) {
    console.error("TRANSACTIONS_TABLE is not defined")
    process.exit()
}

const oldTransactionsTable = process.env.OLD_TRANSACTIONS_TABLE


if (process.env.OHLCV_TABLE == undefined) {
    console.error("OHLCV_TABLE is not defined")
    process.exit()
}

const ohlcvTable = process.env.OHLCV_TABLE;

if (process.env.RESOURCES_TABLE == undefined) {
    console.error("RESOURCES_TABLE is not defined")
    process.exit()
}

const resourcesTable = process.env.RESOURCES_TABLE;

if (process.env.PRIVATE_KEY_FCM == undefined) {
    console.error("PRIVATE_KEY_FCM is not defined")
    process.exit()
}

const privateKeyFcm = JSON.parse(process.env.PRIVATE_KEY_FCM)

admin.initializeApp({
    credential: admin.credential.cert(privateKeyFcm),
});

const getOHLCV = async (transactions: Transaction[]): Promise<{ open: number, low: number, high: number, close: number, volumeto: number }> => {
    const ohlcv = await client.query({
        TableName: ohlcvTable,
        KeyConditionExpression: "#resourceId = :resourceId",
        ExpressionAttributeNames: {
            "#resourceId": "resourceId"
        },
        ExpressionAttributeValues: {
            ":resourceId": transactions[0].resourceId
        },
        ScanIndexForward: false
    }).promise()
    const open = ohlcv.Items == undefined || ohlcv.Items[0] == undefined ? transactions[0].price : ohlcv.Items[0]["close"];
    let low = ohlcv.Items == undefined || ohlcv.Items[0] == undefined ? transactions[0].price : ohlcv.Items[0]["close"];
    let high = ohlcv.Items == undefined || ohlcv.Items[0] == undefined ? transactions[0].price : ohlcv.Items[0]["close"];
    let close = transactions[transactions.length - 1].price;
    let volumeto = 0;
    for (let transaction of transactions) {
        volumeto += transaction.quantity;
        low = low > transaction.price ? transaction.price : low;
        high = high < transaction.price ? transaction.price : high;
    }
    return { open, low, high, close, volumeto };
}

export const handler = async (event: Event) => {
    const resources = await client.scan({
        TableName: resourcesTable,
        Select: "ALL_ATTRIBUTES"
    }).promise().then(result => result.Items?.map(item => item as Resource))
    if (resources != undefined) {
        const ohlcvs = await Promise.all(resources.map(async (resource) => {
            const transactions = await client.query({
                TableName: transactionsTable,
                KeyConditionExpression: "#resourceId = :resourceId",
                ExpressionAttributeNames: {
                    "#resourceId": "resourceId"
                },
                ExpressionAttributeValues: {
                    ":resourceId": resource.resourceId
                },
                ScanIndexForward: true
            }).promise().then(result => result.Items?.map(item => item as Transaction))
            if (transactions != undefined && transactions.length > 0) {
                await client.batchWrite({
                    RequestItems: {
                        [transactionsTable]: transactions.map(transaction => {
                            return {
                                DeleteRequest: {
                                    Key: {
                                        resourceId: transaction.resourceId,
                                        timestamp: transaction.timestamp
                                    }
                                }
                            }
                        })
                    }
                }).promise()
                return { resourceId: resource.resourceId, ...await getOHLCV(transactions) };
            }
        }))
        if (ohlcvs.filter(ohlcv => ohlcv != undefined).length > 0) {
            await client.batchWrite({
                RequestItems: {
                    [ohlcvTable]: ohlcvs.filter(ohlcv => ohlcv != undefined).map((ohlcv: any) => {
                        return {
                            PutRequest: {
                                Item: {
                                    timestamp: Date.now(),
                                    ...ohlcv
                                }
                            }
                        }
                    })
                }
            }).promise();
        }
    }
}
