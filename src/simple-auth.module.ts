/*
https://docs.nestjs.com/modules
*/

import { CacheModule, Inject, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService, Logger, PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { EmailPlugin, EmailPluginDevModeOptions } from '@vendure/email-plugin';
import path from 'path';
import { DEFAULT_OPTIONS, SIMPLE_AUTH_PLUGIN_LOG_CONTEXT, SIMPLE_AUTH_PLUGIN_OPTIONS } from './constants';
import { copyDir } from './copy-dir';
import { ISimpleAuthPluginOptions } from './interfaces';
import { queryExtension } from './schema';
import { SimpleAuthStrategy } from './simple-auth-strategy';
import { SimpleAuthResolver } from './simple-auth.resolver';
import { SimpleAuthService } from './simple-auth.service';



@VendurePlugin({
    imports: [
        PluginCommonModule,
        CacheModule.registerAsync({
            useFactory: () => {
                return SimpleAuthPlugin.options.cacheModuleOption;
            }
        }),
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
        conf.authOptions.shopAuthenticationStrategy.push(simpleAuthStrategy);
        
        return conf;
    },
})

export class SimpleAuthPlugin implements OnApplicationBootstrap {
    constructor(@Inject(ConfigService) private conf: ConfigService) {
        
    }
    onApplicationBootstrap() {
        this.cloneEmailTemplate();
    }

    cloneEmailTemplate() {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const plugins = this.conf.plugins as Type<any>[];
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
 
    static options: NonNullable<ISimpleAuthPluginOptions> = DEFAULT_OPTIONS;
    static init(options: Partial<ISimpleAuthPluginOptions>) {
        SimpleAuthPlugin.options = { 
            ...DEFAULT_OPTIONS,
            ...options 
        };
        
        return SimpleAuthPlugin;
    }
}
