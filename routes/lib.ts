import { getInventory } from './getInventory';
import { EventHandlerRoute } from '@pulumi/awsx/apigateway';
import * as aws from "@pulumi/aws";



export const ROUTES = (tables: {
    buys: aws.dynamodb.Table,
    sells: aws.dynamodb.Table,
    inventories: aws.dynamodb.Table,
    accounts: aws.dynamodb.Table,
    resources: aws.dynamodb.Table,
    transactions: aws.dynamodb.Table,
    ohlcv: aws.dynamodb.Table,
    old_orders: aws.dynamodb.Table,
    old_transactions: aws.dynamodb.Table
}): EventHandlerRoute[] => {
    return [
        { path: "/inventory", method: "POST", eventHandler: getInventory(tables.inventories) },
    ]
};