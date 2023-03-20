import { EmailEventListener } from "@vendure/email-plugin";
import { EMAIL_EVENT_NAME } from "./constants";
import { OneTimeCodeRequestedEvent } from "./events";

export const oneTimeCodeRequestedEventHandler = 
  new EmailEventListener(EMAIL_EVENT_NAME)
  .on(OneTimeCodeRequestedEvent)
  .setRecipient(event => event.email)
  .setSubject('One Time Code for website')
  .setFrom("{{ fromAddress }}")
  .setTemplateVars((event) => ({code: event.code}));