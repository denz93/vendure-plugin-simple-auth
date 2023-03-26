import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService, ExternalAuthenticationService, RequestContext } from '@vendure/core';
import { Cache } from 'cache-manager';
import crypto from 'crypto';
import { SIMPLE_AUTH_PLUGIN_OPTIONS, STRATEGY_NAME } from './constants';
import { ISimpleAuthPluginOptions } from './interfaces';

@Injectable()
export class SimpleAuthService {
  readonly prefix: string = 'simple-auth-service';

  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    @Inject(SIMPLE_AUTH_PLUGIN_OPTIONS) private options: ISimpleAuthPluginOptions,
    @Inject(ConfigService) private configService: ConfigService,
    @Inject(ExternalAuthenticationService) private externalAuthService: ExternalAuthenticationService,
  ) {
  }

  private keyof(email: string) {
    return `${this.prefix}:${email}`;
  }

  async generateCode(email: string) {
    const ttl = this.options.ttl;
    const key = this.keyof(email);
    let code = await this.cache.get<string>(key);

    if (typeof code === 'string') {
      return code;
    }

    const alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const target = digits + (this.options.includeAlphabet ? alphabets : '');
    const length = this.options.length;
    code = '';
    for (let i = 0; i < length; i++) {
      const index = crypto.randomInt(0, target.length);
      code += target[index];
    }

    await this.cache.set(key, code, ttl);
    return code;
  }

  async verifyCode(email: string, code: string) {
    const key = this.keyof(email);
    const savedCode = await this.cache.get<string>(key);
    if (typeof savedCode === 'string' && code === savedCode) {
      await this.cache.del(key);
      return true;
    }
    return false;
  }

  getAllStrategyNames () {
    return this.configService
    .authOptions
    .shopAuthenticationStrategy
    .map(strategy => strategy.name)
    .filter(name => name !== STRATEGY_NAME);
  }

  async checkCrossStrategies(ctx: RequestContext, email: string) {
    for (const strategyName of this.getAllStrategyNames()) {
      const user = await this.externalAuthService.findCustomerUser(
        ctx,
        strategyName,
        email
      );
      if (user) return strategyName;
    }
    return null;
  }
}