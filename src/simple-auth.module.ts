/*
https://docs.nestjs.com/modules
*/

import { CacheModule, Inject } from '@nestjs/common';
import { AuthenticationStrategy, ConfigService, Logger, PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { EmailPlugin, EmailPluginDevModeOptions } from '@vendure/email-plugin';
import path from 'path';
import { SIMPLE_AUTH_PLUGIN_LOG_CONTEXT, SIMPLE_AUTH_PLUGIN_OPTIONS } from './constants';
import { copyDir } from './copy-dir';
import { queryExtension } from './schema';
import { SimpleAuthStrategy } from './simple-auth-strategy';
import { SimpleAuthResolver } from './simple-auth.resolver';
import { SimpleAuthService } from './simple-auth.service';
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
}

@VendurePlugin({
    imports: [
        PluginCommonModule, 
        CacheModule.register(),
    ],
    providers: [
        SimpleAuthService,
        {
            provide: SIMPLE_AUTH_PLUGIN_OPTIONS,
            useFactory: () => SimpleAuthPlugin.options
        }
    ],
    shopApiExtensions: {
        schema: queryExtension,
        resolvers: [SimpleAuthResolver]
    },
    configuration: (conf) => {
        const simpleAuthStrategy = new SimpleAuthStrategy();
        const strategies = conf.authOptions.shopAuthenticationStrategy as AuthenticationStrategy[];
        const isExisted = strategies.some(str => str.name === simpleAuthStrategy.name);
        if (!isExisted) {
            conf.authOptions.shopAuthenticationStrategy.push(simpleAuthStrategy);
        }
        
        return conf;
    },
})
export class SimpleAuthPlugin {
    constructor(@Inject(ConfigService) private conf: ConfigService) {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const plugins = conf.plugins as Type<any>[];
        const emailPlugin = plugins.find(plg => plg == EmailPlugin);
        if (emailPlugin) {
            const options = (emailPlugin as any)['options'] as EmailPluginDevModeOptions;
            const templatePath = options.templatePath;
            copyDir(path.join(__dirname, './template/onetimecode-requested'),
                 templatePath);
            Logger.info(`Template for onetimecode-requested created at ${templatePath}`, SIMPLE_AUTH_PLUGIN_LOG_CONTEXT);
        } else {
            Logger.warn(`Cannot find EmailPlugin in Vendure Config. This pluginn might not work correctly."`, SIMPLE_AUTH_PLUGIN_LOG_CONTEXT); 
        }
    }
 
    static options: NonNullable<ISimpleAuthPluginOptions>;
    static init(options: Partial<ISimpleAuthPluginOptions> = {}) {
        SimpleAuthPlugin.options = { 
            attempts: 5, 
            isDev: false, 
            ttl: 600, 
            length: 6,
            includeAlphabet: false,
            ...options 
        };
        return SimpleAuthPlugin;
    }
}
