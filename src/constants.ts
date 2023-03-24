import { ISimpleAuthPluginOptions } from "./interfaces";

export const SIMPLE_AUTH_PLUGIN_OPTIONS = Symbol("SIMPLE_AUTH_PLUGIN_OPTIONS");

export const SIMPLE_AUTH_PLUGIN_LOG_CONTEXT = 'SimpleAuthPlugin';

export const EMAIL_EVENT_NAME = 'onetimecode-requested';

export const EMAIL_TEMPLATE_NAME = EMAIL_EVENT_NAME;

export const DEFAULT_OPTIONS: ISimpleAuthPluginOptions = {
  attempts: 5, 
  isDev: false, 
  ttl: 600, 
  length: 6,
  includeAlphabet: false,
  cacheModuleOption: {}
};