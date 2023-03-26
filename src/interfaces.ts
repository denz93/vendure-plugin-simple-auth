import { CacheManagerOptions, CacheModuleOptions } from "@nestjs/common"

export interface ISimpleAuthPluginOptions {
  /**
   * @description
   * How many times to allow User attempt the verification code.
   * After attempts reached, the code will be invalidated
   * @default
   * 5
   */
  attempts: number

  /**
   * @description
   * Time to live in seconds once a code created. 
   * If the code not being verified by users during the ttl window, it will be discarded
   * 
   * @default
   * 600 - 10 minutes
   */
  ttl: number

  /**
   * @description
   * How many digits/letters the code should be
   * 
   * @example
   * 6 digits code: 340082
   * 
   * @default
   * 6
   */
  length: number

  /**
   * @description
   * Allow alphabets in code
   * 
   * @default
   * false - Only digits allow
   */
  includeAlphabet: boolean

  /**
   * @description
   * Developer mode
   * If enabled, the code will return along with the response "requestOneTimeCode"
   * 
   * @default
   * false
   */
  isDev: boolean

  /**
   * @description
   * By default, the plugin use 'memory' for caching using NestJs CacheModule
   * To change cache store to Redis, MongoDB, etc, please see NestJs CacheModule docs
   * @see https://docs.nestjs.com/techniques/caching#different-stores
   * You also want to @see https://github.com/node-cache-manager/node-cache-manager/tree/4.1.0
   *
   */
  cacheModuleOption: Omit<CacheManagerOptions | CacheModuleOptions, "ttl">

  /**
   * @description
   * Strictly enforce unique email among all strategies
   * 
   * For example:
   *  - One day, user "John" sign in using Google authentication with "john@gmail.com"
   *  - Another day, user "John" sign in using One-time passcode authenication (this plugin) with the same email
   *  - This plugin will throw an error if the flag is enabled
   * 
   * @default
   * false
   * 
   * @note
   * This only works if Google authentication plugin using email as an identifier
   */
  preventCrossStrategies: boolean;
}
