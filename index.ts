import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as util from "util";
import { exec } from "child_process";

const config = new pulumi.Config();

const execPromise = util.promisify(exec)

// Configure IAM so that the AWS Lambda can be run.
const handlerRole = new aws.iam.Role("handlerRole", {
    assumeRolePolicy: {
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Principal: {
                Service: "lambda.amazonaws.com",
            },
            Effect: "Allow",
            Sid: "",
        }],
    },
});

new aws.iam.RolePolicyAttachment("funcRoleAttach", {
    role: handlerRole,
    policyArn: aws.iam.AWSLambdaFullAccess,
});


const buys = new aws.dynamodb.Table("buys", {
    attributes: [
        { name: "resourceId", type: "S" },
        { name: "orderId", type: "S" },
    ],
    hashKey: "resourceId",
    rangeKey: "orderId",
    readCapacity: 1,
    writeCapacity: 1,
    streamEnabled: true,
    streamViewType: "NEW_AND_OLD_IMAGES"
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
    streamEnabled: true,
    streamViewType: "NEW_AND_OLD_IMAGES"
});


buys.onEvent("onBuyOrder", new aws.lambda.Function("on_buy_order", {
    handler: "index.handler",
    code: execPromise("yarn --cwd ./lambdas/on_buy_order run clean && yarn --cwd ./lambdas/on_buy_order run bundle").then(_ =>
        new pulumi.asset.FileArchive("./lambdas/on_buy_order/bundle.zip")
    ),
    runtime: "nodejs12.x",
    role: handlerRole.arn,
    environment: {
        variables: {
            "SELLS_TABLE": sells.name,
            "BUYS_TABLE": buys.name,
            "PRIVATE_KEY_FCM": config.requireSecret("privateKeyFcm")
        }
    }
}), {
    startingPosition: "LATEST"
})

sells.onEvent("onSellOrder", new aws.lambda.Function("on_sell_order", {
    handler: "index.handler",
    code: execPromise("yarn --cwd ./lambdas/on_sell_order run clean && yarn --cwd ./lambdas/on_sell_order run bundle").then(_ =>
        new pulumi.asset.FileArchive("./lambdas/on_sell_order/bundle.zip")
    ),
    runtime: "nodejs12.x",
    role: handlerRole.arn,
    environment: {
        variables: {
            "SELLS_TABLE": sells.name,
            "BUYS_TABLE": buys.name,
            "PRIVATE_KEY_FCM": config.requireSecret("privateKeyFcm")
        }
    }
}), {
    startingPosition: "LATEST"
})


const accounts = new aws.dynamodb.Table("accounts", {
    attributes: [
        { name: "ownerId", type: "S" },
    ],
    hashKey: "ownerId",
    readCapacity: 1,
    writeCapacity: 1,
    streamEnabled: true,
    streamViewType: "NEW_AND_OLD_IMAGES"
});

accounts.onEvent("onAccountChange", new aws.lambda.Function("on_account_change", {
    handler: "index.handler",
    code: execPromise("yarn --cwd ./lambdas/on_account_change run clean && yarn --cwd ./lambdas/on_account_change run bundle").then(_ =>
        new pulumi.asset.FileArchive("./lambdas/on_account_change/bundle.zip")
    ),
    runtime: "nodejs12.x",
    role: handlerRole.arn,
    environment: {
        variables: {
            "PRIVATE_KEY_FCM": config.requireSecret("privateKeyFcm")
        }
    }
}), {
    startingPosition: "LATEST"
})

const inventories = new aws.dynamodb.Table("inventories", {
    attributes: [
        { name: "ownerId", type: "S" },
        { name: "resourceId", type: "S" },
    ],
    hashKey: "ownerId",
    rangeKey: "resourceId",
    readCapacity: 1,
    writeCapacity: 1,
    streamEnabled: true,
    streamViewType: "NEW_IMAGE"
});

inventories.onEvent("onInventoryUpdate", new aws.lambda.Function("on_inventory_update", {
    handler: "index.handler",
    code: execPromise("yarn --cwd ./lambdas/on_inventory_update run clean && yarn --cwd ./lambdas/on_inventory_update run bundle").then(_ =>
        new pulumi.asset.FileArchive("./lambdas/on_inventory_update/bundle.zip")
    ),
    runtime: "nodejs12.x",
    role: handlerRole.arn,
    environment: {
        variables: {
            "ACCOUNTS_TABLE": accounts.name,
            "PRIVATE_KEY_FCM": config.requireSecret("privateKeyFcm")
        }
    }
}), {
    startingPosition: "LATEST"
})

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
    routes: [
        {
            path: "/account", method: "POST", eventHandler: new aws.lambda.Function("get_account", {
                handler: "index.handler",
                code: execPromise("yarn --cwd ./lambdas/get_account run clean && yarn --cwd ./lambdas/get_account run bundle").then(_ =>
                    new pulumi.asset.FileArchive("./lambdas/get_account/bundle.zip")
                ),
                runtime: "nodejs12.x",
                role: handlerRole.arn,
                environment: {
                    variables: {
                        "ACCOUNTS_TABLE": accounts.name
                    }
                }
            })
        },
        {
            path: "/trends", method: "GET", eventHandler: new aws.lambda.Function("get_trends", {
                handler: "index.handler",
                code: execPromise("yarn --cwd ./lambdas/get_trends run clean && yarn --cwd ./lambdas/get_trends run bundle").then(_ =>
                    new pulumi.asset.FileArchive("./lambdas/get_trends/bundle.zip")
                ),
                runtime: "nodejs12.x",
                role: handlerRole.arn,
                environment: {
                    variables: {
                        "RESOURCES_TABLE": resources.name,
                        "OHLCV_TABLE": ohlcv.name
                    }
                }
            })
        },
        {
            path: "/resources", method: "GET", eventHandler: new aws.lambda.Function("get_resources", {
                handler: "index.handler",
                code: execPromise("yarn --cwd ./lambdas/get_resources run clean && yarn --cwd ./lambdas/get_resources run bundle").then(_ =>
                    new pulumi.asset.FileArchive("./lambdas/get_resources/bundle.zip")
                ),
                runtime: "nodejs12.x",
                role: handlerRole.arn,
                environment: {
                    variables: {
                        "RESOURCES_TABLE": resources.name,
                    }
                }
            })
        },
        {
            path: "/resources", method: "PUT", eventHandler: new aws.lambda.Function("put_resources", {
                handler: "index.handler",
                code: execPromise("yarn --cwd ./lambdas/put_resources run clean && yarn --cwd ./lambdas/put_resources run bundle").then(_ =>
                    new pulumi.asset.FileArchive("./lambdas/put_resources/bundle.zip")
                ),
                runtime: "nodejs12.x",
                role: handlerRole.arn,
                environment: {
                    variables: {
                        "RESOURCES_TABLE": resources.name,
                    }
                }
            })
        },
        {
            path: "/ohlcv", method: "POST", eventHandler: new aws.lambda.Function("get_ohlcv", {
                handler: "index.handler",
                code: execPromise("yarn --cwd ./lambdas/get_ohlcv run clean && yarn --cwd ./lambdas/get_ohlcv run bundle").then(_ =>
                    new pulumi.asset.FileArchive("./lambdas/get_ohlcv/bundle.zip")
                ),
                runtime: "nodejs12.x",
                role: handlerRole.arn,
                environment: {
                    variables: {
                        "OHLCV_TABLE": ohlcv.name,
                    }
                }
            })
        },
        {
            path: "/order", method: "POST", eventHandler: new aws.lambda.Function("get_orders", {
                handler: "index.handler",
                code: execPromise("yarn --cwd ./lambdas/get_orders run clean && yarn --cwd ./lambdas/get_orders run bundle").then(_ =>
                    new pulumi.asset.FileArchive("./lambdas/get_orders/bundle.zip")
                ),
                runtime: "nodejs12.x",
                role: handlerRole.arn,
                environment: {
                    variables: {
                        "SELLS_TABLE": sells.name,
                        "BUYS_TABLE": buys.name,
                    }
                }
            })
        },
        {
            path: "/order", method: "PUT", eventHandler: new aws.lambda.Function("put_order", {
                handler: "index.handler",
                code: execPromise("yarn --cwd ./lambdas/put_order run clean && yarn --cwd ./lambdas/put_order run bundle").then(_ =>
                    new pulumi.asset.FileArchive("./lambdas/put_order/bundle.zip")
                ),
                runtime: "nodejs12.x",
                role: handlerRole.arn,
                environment: {
                    variables: {
                        "SELLS_TABLE": sells.name,
                        "BUYS_TABLE": buys.name,
                    }
                }
            })
        },
        {
            path: "/inventory", method: "POST", eventHandler: new aws.lambda.Function("get_inventory", {
                handler: "index.handler",
                code: execPromise("yarn --cwd ./lambdas/get_inventory run clean && yarn --cwd ./lambdas/get_inventory run bundle").then(_ =>
                    new pulumi.asset.FileArchive("./lambdas/get_inventory/bundle.zip")
                ),
                runtime: "nodejs12.x",
                role: handlerRole.arn,
                environment: {
                    variables: {
                        "INVENTORIES_TABLE": inventories.name,
                    }
                }
            })
        }
    ],
})

// Export the auto-generated API Gateway base URL.
export const url = api.url;