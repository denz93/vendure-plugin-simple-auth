import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';
import crypto from 'crypto';
import { Cache } from 'cache-manager';
import { SIMPLE_AUTH_PLUGIN_OPTIONS } from './constants';
import { ISimpleAuthPluginOptions } from './simple-auth.module';

@Injectable()
export class SimpleAuthService {
  readonly prefix: string = 'simple-auth-service';

  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    @Inject(SIMPLE_AUTH_PLUGIN_OPTIONS) private options: ISimpleAuthPluginOptions
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
      code += digits[index];
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
}