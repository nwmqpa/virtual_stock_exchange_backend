export interface Order {

    orderId: string;
    mode: "SELL" | "BUY";
    resourceId: string;
    price: number;
    issuerId: string;
    quantity: number;

};