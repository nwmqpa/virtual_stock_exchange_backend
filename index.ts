import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { ROUTES } from "./routes/lib";

const buys = new aws.dynamodb.Table("buys", {
    attributes: [
        { name: "resourceId", type: "S" },
        { name: "orderId", type: "S" },
    ],
    hashKey: "resourceId",
    rangeKey: "orderId",
    readCapacity: 1,
    writeCapacity: 1,
});

const sells = new aws.dynamodb.Table("sells", {
    attributes: [
        { name: "resourceId", type: "S" },
        { name: "orderId", type: "S" },
    ],
    hashKey: "resourceId",
    rangeKey: "orderId",
    readCapacity: 1,
    writeCapacity: 1,
});

const inventories = new aws.dynamodb.Table("inventories", {
    attributes: [
        { name: "ownerId", type: "S" },
        { name: "resourceId", type: "S" },
    ],
    hashKey: "ownerId",
    rangeKey: "resourceId",
    readCapacity: 1,
    writeCapacity: 1,
});


const resources = new aws.dynamodb.Table("resources", {
    attributes: [
        { name: "resourceId", type: "S" },
    ],
    hashKey: "resourceId",
    readCapacity: 1,
    writeCapacity: 1,
});


const transactions = new aws.dynamodb.Table("transactions", {
    attributes: [
        { name: "resourceId", type: "S" },
        { name: "transactionId", type: "S" },
    ],
    hashKey: "resourceId",
    rangeKey: "transactionId",
    readCapacity: 1,
    writeCapacity: 1,
});

const ohlcv = new aws.dynamodb.Table("ohlcv", {
    attributes: [
        { name: "resourceId", type: "S" },
        { name: "timestamp", type: "N" },
    ],
    hashKey: "resourceId",
    rangeKey: "timestamp",
    readCapacity: 1,
    writeCapacity: 1,
});

const old_orders = new aws.dynamodb.Table("old_orders", {
    attributes: [
        { name: "resourceId", type: "S" },
        { name: "orderId", type: "S" },
    ],
    hashKey: "resourceId",
    rangeKey: "orderId",
    readCapacity: 1,
    writeCapacity: 1,
});

const old_transactions = new aws.dynamodb.Table("old_transactions", {
    attributes: [
        { name: "resourceId", type: "S" },
        { name: "transactionId", type: "S" },
    ],
    hashKey: "resourceId",
    rangeKey: "transactionId",
    readCapacity: 1,
    writeCapacity: 1,
});


const api = new awsx.apigateway.API("virtual_stock_exchange", {
    routes: ROUTES({
        buys, sells, resources, inventories, transactions, ohlcv, old_orders, old_transactions
    }),
})

// Export the auto-generated API Gateway base URL.
export const url = api.url;