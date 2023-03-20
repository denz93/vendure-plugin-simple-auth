import { AuthenticationStrategy, ExternalAuthenticationService, Injector, RequestContext, User } from "@vendure/core";
import { DocumentNode } from "graphql";
import gql from 'graphql-tag';
import { SimpleAuthService } from "./simple-auth.service";

export type SimpleAuthData = {
  email: string
  code: string
};

export class SimpleAuthStrategy implements AuthenticationStrategy<SimpleAuthData> {
  name = 'simple';
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
    const isValidCode = await this.simpleAuthService.verifyCode(data.email, data.code);

    if (!isValidCode) return "Invalid verification code";

    let user = await this.externalAuthenticationService.findCustomerUser(ctx, this.name, data.email);

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