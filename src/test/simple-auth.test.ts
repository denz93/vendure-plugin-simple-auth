import { EventBus, ExternalAuthenticationService, NativeAuthenticationMethod } from '@vendure/core';
import { EmailPlugin, EmailPluginOptions } from '@vendure/email-plugin';
import { EMAIL_PLUGIN_OPTIONS } from '@vendure/email-plugin/lib/src/constants';
import { createTestEnvironment, registerInitializer, SqljsInitializer, testConfig } from '@vendure/testing';
import fs from 'fs';
import gql from 'graphql-tag';
import path from 'path';
import { Subscription } from 'rxjs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi, vitest } from 'vitest';
import { oneTimeCodeRequestedEventHandler } from '../email-handler';
import { OneTimeCodeRequestedEvent } from '../events';
import { SimpleAuthPlugin } from '../simple-auth.module';
import { SimpleAuthService } from '../simple-auth.service';
import { initialData } from './fixtures/e2e-initial-data';

async function sleep(ms = 1000) {
  return await new Promise<void>((resolver) => {
    setTimeout(resolver, ms);
  });
}
const sqliteDataDir = path.join(__dirname, '__data__');

const REQUEST_ONE_TIME_CODE = gql(`
  query requestCode($email: String!){
    requestOneTimeCode(email: $email) {
      ...on OneTimeCode {
        value
      }
      ...on RequestOneTimeCodeError {
        message
        errorCode
      }
    }
  }
`);
const AUTHENTICATE = gql(`
  mutation authenticate($email: String!, $code: String!) {
    authenticate(input: { simple: { email: $email, code: $code } }) {
      ...on CurrentUser {
        identifier
      }

      ...on InvalidCredentialsError {
        errorCode
        message
        authenticationError
      }

    }
  }
`);

registerInitializer('sqljs', new SqljsInitializer(sqliteDataDir));
describe('SimpleAuthPlugin Testing', () => {
  const TEST_EMAIL = 'test@gmail.com'

  fs.mkdirSync(path.join(__dirname, '__data__/email/output'), { recursive: true })
  fs.mkdirSync(path.join(__dirname, '__data__/email/mailbox'), { recursive: true })
  fs.mkdirSync(path.join(__dirname, '__data__/email/templates/partials'), { recursive: true })


  const { server, shopClient } = createTestEnvironment({
    ...testConfig,
    plugins: [
      EmailPlugin.init({
        devMode: true,
        outputPath: path.join(__dirname, '__data__/email/output'),
        route: path.join(__dirname, '__data__/email/mailbox'),
        templatePath: path.join(__dirname, '__data__/email/templates'),
        handlers: []
      }),
      SimpleAuthPlugin.init({ttl: 1, preventCrossStrategies: true})
    ]
  });

  beforeAll(async () => {
    try {
      await server.init({
        productsCsvPath: path.join(__dirname, './fixtures/e2e-product-data-full.csv') ,
        initialData: initialData
      });
    } catch (err) {
      console.log('Error happens during init server');
      console.log(err);
    }
   
  }, 60000)

  afterAll(async () => {
    try {
      await server.destroy();
    } catch (err) {
      console.log('Error during destroy server');
      console.log(err);
    }
    
  })

  let code = '';
  let email = '';
  let subscription: Subscription | null;
  let options: typeof SimpleAuthPlugin.options;

  beforeEach(async () => {
    await shopClient.asAnonymousUser();
    options = {...SimpleAuthPlugin.options };

    const eventBus = await server.app.resolve(EventBus);
    subscription = eventBus.ofType(OneTimeCodeRequestedEvent).subscribe((event) => {
      code = event.code;
      email = event.email;
    });
  })
  afterEach(() => {
    Object.keys(options).forEach(k => SimpleAuthPlugin.options[k] = options[k]);

    subscription?.unsubscribe();
    code = '';
    email = '';
    subscription = null;
  })

  test('generate one time code and authenticate', async () => {

    const res = await shopClient.query(REQUEST_ONE_TIME_CODE, { email: TEST_EMAIL });
    expect(res).toMatchObject({requestOneTimeCode: {value: 'A code sent to your email'}});
    expect(email).toBe(TEST_EMAIL);

    const authRes = await shopClient.query(AUTHENTICATE, {code: code, email: TEST_EMAIL});
    expect(authRes).toMatchObject({
      authenticate: {

        identifier: TEST_EMAIL
      }
    })
  })

  test('code should renew after ttl reach', async () => {
    const res = await shopClient.query(REQUEST_ONE_TIME_CODE, { email: TEST_EMAIL });
    expect(res).toMatchObject({requestOneTimeCode: {value: 'A code sent to your email'}});
    expect(email).toBe(TEST_EMAIL);

    const saveCode = code;

    await shopClient.query(REQUEST_ONE_TIME_CODE, { email: TEST_EMAIL});
    expect(code).toBe(saveCode);

    await sleep(1100);

    await shopClient.query(REQUEST_ONE_TIME_CODE, { email: TEST_EMAIL});
    expect(code).not.toBe(saveCode);
    expect(code.length).toBe(6);
  }, {timeout: 3000})

  test('code should invalidated after ttl reach', async () => {
    const res = await shopClient.query(REQUEST_ONE_TIME_CODE, { email: TEST_EMAIL });
    expect(res).toMatchObject({requestOneTimeCode: {value: 'A code sent to your email'}});
    expect(email).toBe(TEST_EMAIL);
    await sleep(1100);
    const authRes = await shopClient.query(AUTHENTICATE, {code: code, email: TEST_EMAIL});
    expect(authRes).toEqual({
      authenticate: expect.objectContaining({
        message: 'The provided credentials are invalid',
        errorCode: 'INVALID_CREDENTIALS_ERROR'
      })
    })
  }, 3000)

  test('should return error if input wrong code', async () => {
    SimpleAuthPlugin.options.preventCrossStrategies = false
    
    const res = await shopClient.query(REQUEST_ONE_TIME_CODE, { email: TEST_EMAIL });
    expect(res).toMatchObject({requestOneTimeCode: {value: 'A code sent to your email'}});
    expect(email).toBe(TEST_EMAIL);

    const authRes = await shopClient.query(AUTHENTICATE, {code: code + 'X', email: TEST_EMAIL});
    expect(authRes).toEqual({
      authenticate: expect.objectContaining({
        message: 'The provided credentials are invalid',
        errorCode: 'INVALID_CREDENTIALS_ERROR'
      })
    });

  })

  test('should treat email as case-insensitive', async () => {
    await shopClient.query(REQUEST_ONE_TIME_CODE, { email: TEST_EMAIL.toUpperCase() });
    expect(email).toBe(TEST_EMAIL);

    const authRes = await shopClient.query(AUTHENTICATE, {code: code, email: TEST_EMAIL[0].toUpperCase() + TEST_EMAIL.substring(1)});
    expect(authRes).toMatchObject({
      authenticate: {

        identifier: TEST_EMAIL
      }
    })
  })

  test('input invalid email should be handled', async () => {
      try {
          await shopClient
          .query(REQUEST_ONE_TIME_CODE, {email: 'Thisnotanemail'})
      } catch (err) {
        expect(err).toBeInstanceOf(Error)
        expect(err.response.errors.length).toBeGreaterThan(0)
        expect(err.response.errors[0]).toMatchObject({
          message: 'Thisnotanemail is not a valid email'
        })
      }
        const res = await shopClient.query(AUTHENTICATE, { email: 'Thisisnotanemail', code: 'XXX' })
        expect(res).toEqual({
          authenticate: expect.objectContaining({
            authenticationError: 'Email is invalid'
          })
        })
      
  })

  test('raise error when cross authentication detected', async () => {
    const externalAuthService = server.app.get(ExternalAuthenticationService);
    const spy = vi.spyOn(externalAuthService, 'findCustomerUser');

    spy.mockResolvedValue({
      id: 1,
      authenticationMethods: [],
      createdAt: new Date(),
      customFields: [],
      deletedAt: new Date(),
      identifier: TEST_EMAIL,
      verified: true,
      roles: [],
      getNativeAuthenticationMethod: (strict?: boolean) => ({} as NativeAuthenticationMethod),
      lastLogin: null,
      updatedAt: new Date()

    });

    const res = await shopClient.query(REQUEST_ONE_TIME_CODE, {email: TEST_EMAIL})
    expect(res.requestOneTimeCode).toMatchObject({
      errorCode: 'CROSS_EMAIL_AUTHENTICATION',
      message: 'Email already used with "native" authentication'
    })
    spy.mockClear();
    spy.mockRestore();
  })

  test('code should include alphabets', async () => {
    const simpleAuthService = server.app.get(SimpleAuthService);
    expect(simpleAuthService).toBeInstanceOf(SimpleAuthService);
    const tries = 10;
    SimpleAuthPlugin.options.includeAlphabet = true;
    const codes: string[] = [];

    for (let i = 0; i < tries; i++) {
      const code = await simpleAuthService.generateCode(`testing${i}@gmail.com`);
      codes.push(code);
    }
    expect(codes.some(code => code.match(/[a-z]+/i))).toBeTruthy();
  });

  test('code should return along with requestOneTimeCode in dev mode', async () => {
    SimpleAuthPlugin.options.isDev = true

    const res = await shopClient.query(REQUEST_ONE_TIME_CODE, {email: TEST_EMAIL})
    expect(res.requestOneTimeCode).toMatchObject({
      value: code
    })

  })

  test('email handler should trigger', async () => {
    const emailOptions = server.app.get<EmailPluginOptions>(EMAIL_PLUGIN_OPTIONS)
    expect(emailOptions.handlers).contain(oneTimeCodeRequestedEventHandler)
    const spy = vitest.spyOn(oneTimeCodeRequestedEventHandler, 'handle')

    await shopClient.query(REQUEST_ONE_TIME_CODE, {email: TEST_EMAIL})
    await sleep(100)
    expect(spy).toBeCalledTimes(1)

    expect(spy.mock.lastCall?.[0].code).toBe(code)
    expect(spy.mock.lastCall?.[0].email).toBe(TEST_EMAIL)

    spy.mockClear()
  })
})

describe('SimpleAuthPlugin load without EmailPlugin', () => {
  /**
   * Without saveOptions, this suite test will affect other suites
   * because SimpleAuthPlugin.options is static
   * 
   * In real application, this is not the case because SimpleAuthPlugin
   * should only init once
   */
  const saveOptions = SimpleAuthPlugin.options;

  const {server} = createTestEnvironment({
    ...testConfig,
    plugins: [
      SimpleAuthPlugin.init(saveOptions)
    ]
  })
  beforeAll(async () => {
    await server.init({
      productsCsvPath: path.join(__dirname, 'fixtures/e2e-product-data-full.csv'),
      initialData: initialData
    })
  })

  afterAll(async () => {
    await server.destroy();
  })

  test('server runs', () => {
    const plugin = server.app.get(SimpleAuthPlugin)
    expect(plugin).toBeInstanceOf(SimpleAuthPlugin)
  })
})
