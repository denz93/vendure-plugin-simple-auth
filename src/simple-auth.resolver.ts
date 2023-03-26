import { Inject, PipeTransform } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, EventBus, RequestContext } from '@vendure/core';
import { validate as isEmail } from 'isemail';
import { SIMPLE_AUTH_PLUGIN_OPTIONS } from './constants';
import { OneTimeCodeRequestedEvent } from './events';
import { ISimpleAuthPluginOptions } from './interfaces';
import { SimpleAuthService } from './simple-auth.service';

class EmailValidation implements PipeTransform<string,string> {
  transform(value: string): string {
    if (isEmail(value)) {
      return value.toLowerCase()
    }
    throw new Error(`${value} is not a valid email`);
  }
  
}

export class RequestOneTimeCodeError {
  readonly __typename = 'RequestOneTimeCodeError';

  constructor(private message: string, private errorCode: string) {
    console.log('runhere');
  }
}

@Resolver()
export class SimpleAuthResolver {
  constructor(
    @Inject(SimpleAuthService) private service: SimpleAuthService, 
    @Inject(EventBus) private eventBus: EventBus,
    @Inject(SIMPLE_AUTH_PLUGIN_OPTIONS) private pluginOptions: ISimpleAuthPluginOptions) {
    }
  
  @Query()
  async requestOneTimeCode(@Ctx() ctx: RequestContext, @Args('email', EmailValidation) email: string) {
    if (this.pluginOptions.preventCrossStrategies) {
      const foundStrategy = await this.service.checkCrossStrategies(ctx, email);
      if (foundStrategy) 
        return new RequestOneTimeCodeError(
          `Email already used with "${foundStrategy}" authentication`, 
          'CROSS_EMAIL_AUTHENTICATION')
    }
    const value = await this.service.generateCode(email);
    const fiteredValue = this.pluginOptions.isDev ? value : 'A code sent to your email';
    this.eventBus.publish(new OneTimeCodeRequestedEvent(value, email, ctx));

    return { __typename: 'OneTimeCode', value: fiteredValue };
  } 
}