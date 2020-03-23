export interface Order {

    mode: "SELL" | "BUY";

    resourceId: string;
    price: number;
    issuerId: string;
    quantity: number;

};