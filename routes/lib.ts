import { putOrder } from './putOrder';
import { getResources } from '../lambdas/get_resources/getResources';
import { getInventory } from './getInventory';
import { putResource } from './putResource';
import { getAccount } from './getAccount';
import { getTrends } from '../lambdas/get_trends';
import { getOrders } from './getOrders';
import { getOHLC } from './getOHLC';
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
        { path: "/order", method: "PUT", eventHandler: putOrder(tables.buys, tables.sells) },
        { path: "/order", method: "POST", eventHandler: getOrders(tables.buys, tables.sells) },
        { path: "/inventory", method: "POST", eventHandler: getInventory(tables.inventories) },
        { path: "/resources", method: "PUT", eventHandler: putResource(tables.resources) },
        { path: "/ohlcv", method: "POST", eventHandler: getOHLC(tables.ohlcv) },
    ]
};