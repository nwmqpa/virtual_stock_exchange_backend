import { putOrder } from './putOrder';
import { getResources } from './getResources';
import { getInventory } from './getInventory';
import { putResource } from './putResource';
import { EventHandlerRoute } from '@pulumi/awsx/apigateway';
import * as aws from "@pulumi/aws";



export const ROUTES = (tables: {
    buys: aws.dynamodb.Table,
    sells: aws.dynamodb.Table,
    inventories: aws.dynamodb.Table,
    resources: aws.dynamodb.Table,
    transactions: aws.dynamodb.Table,
    ohlcv: aws.dynamodb.Table,
    old_orders: aws.dynamodb.Table,
    old_transactions: aws.dynamodb.Table
}): EventHandlerRoute[] => {
    return [
        { path: "/order", method: "PUT", eventHandler: putOrder(tables.buys, tables.sells) },
        { path: "/inventory", method: "POST", eventHandler: getInventory(tables.inventories) },
        { path: "/resources", method: "PUT", eventHandler: putResource(tables.resources) },
        { path: "/resources", method: "GET", eventHandler: getResources(tables.resources) },
    ]
};