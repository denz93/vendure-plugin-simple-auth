import { RequestContext, VendureEvent } from "@vendure/core";

export class OneTimeCodeRequestedEvent extends VendureEvent {

  constructor(
    public code: string, 
    public email: string,
    public ctx: RequestContext
    ) { super(); }
}