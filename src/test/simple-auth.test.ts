import { EventBus } from '@vendure/core';
import { createTestEnvironment, registerInitializer, SqljsInitializer, testConfig } from '@vendure/testing';
import gql from 'graphql-tag';
import path from 'path';
import { Subscription } from 'rxjs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { OneTimeCodeRequestedEvent } from '../events';
import { SimpleAuthPlugin } from '../simple-auth.module';
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
  const TEST_EMAIL = 'test@gmail.com';

  const { server, shopClient } = createTestEnvironment({
    ...testConfig,
    plugins: [SimpleAuthPlugin.init({ttl: 2})]
  });

  beforeAll(async () => {
    try {
      await server.init({
        productsCsvPath: path.join(__dirname, './fixtures/e2e-product-data-full.csv'),
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
  beforeEach(async () => {
    await shopClient.asAnonymousUser();

    const eventBus = await server.app.resolve(EventBus);
    subscription = eventBus.ofType(OneTimeCodeRequestedEvent).subscribe((event) => {
      code = event.code;
      email = event.email;
    });
  })
  afterEach(() => {
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
    });
  })

  test('code should renew after ttl reach', async () => {
    const res = await shopClient.query(REQUEST_ONE_TIME_CODE, { email: TEST_EMAIL });
    expect(res).toMatchObject({requestOneTimeCode: {value: 'A code sent to your email'}});
    expect(email).toBe(TEST_EMAIL);

    const saveCode = code;

    await shopClient.query(REQUEST_ONE_TIME_CODE, { email: TEST_EMAIL});
    expect(code).toBe(saveCode);

    await sleep(2100);

    await shopClient.query(REQUEST_ONE_TIME_CODE, { email: TEST_EMAIL});
    expect(code).not.toBe(saveCode);
    expect(code.length).toBe(6);
  }, {timeout: 3000})

  test('code should invalidated after ttl reach', async () => {
    const res = await shopClient.query(REQUEST_ONE_TIME_CODE, { email: TEST_EMAIL });
    expect(res).toMatchObject({requestOneTimeCode: {value: 'A code sent to your email'}});
    expect(email).toBe(TEST_EMAIL);
    await sleep(2100);
    const authRes = await shopClient.query(AUTHENTICATE, {code: code, email: TEST_EMAIL});
    expect(authRes).toEqual({
      authenticate: expect.objectContaining({
        message: 'The provided credentials are invalid',
        errorCode: 'INVALID_CREDENTIALS_ERROR'
      })
    });
  }, 3000);

  test('should return error if input wrong code', async () => {
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
  });
});