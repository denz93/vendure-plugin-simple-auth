import { AuthenticationStrategy, ExternalAuthenticationService, Injector, RequestContext, User } from "@vendure/core";
import { DocumentNode } from "graphql";
import gql from 'graphql-tag';
import { validate as isEmail } from "isemail";
import { STRATEGY_NAME } from "./constants";
import { SimpleAuthService } from "./simple-auth.service";

export type SimpleAuthData = {
  email: string
  code: string
};

export class SimpleAuthStrategy implements AuthenticationStrategy<SimpleAuthData> {
  name = STRATEGY_NAME;
  simpleAuthService: SimpleAuthService;
  externalAuthenticationService: ExternalAuthenticationService;

  defineInputType(): DocumentNode {
    return gql`
      input SimpleAuthInput {
        email: String!
        code: String!
      }
    `;
  }

  async authenticate(ctx: RequestContext, data: SimpleAuthData): Promise<string | false | User> {
    if (!isEmail(data.email)) {
      return "Email is invalid";
    }
    const email = data.email.toLowerCase();
    const isValidCode = await this.simpleAuthService.verifyCode(email, data.code);

    if (!isValidCode) return "Invalid verification code";

    let user = await this.externalAuthenticationService.findCustomerUser(ctx, this.name, email);

    if (user) return user;

    user = await this.externalAuthenticationService.createCustomerAndUser(ctx, {
      emailAddress: data.email,
      externalIdentifier: data.email,
      strategy: this.name,
      verified: true,
      firstName: '',
      lastName: '',
    });

    return user;
  }

  init(injector: Injector) {
    this.externalAuthenticationService = injector.get(ExternalAuthenticationService);
    this.simpleAuthService = injector.get(SimpleAuthService);
  }

}