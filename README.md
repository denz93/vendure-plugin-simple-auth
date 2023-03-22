# Simple Auth Plugin for Vendure.io
[![Test CI](https://github.com/denz93/vendure-plugin-simple-auth/actions/workflows/codeql.yml/badge.svg?branch=master)](https://github.com/denz93/vendure-plugin-simple-auth/actions/workflows/codeql.yml)
[![Publish Package to npmjs](https://github.com/denz93/vendure-plugin-simple-auth/actions/workflows/public-package-npmjs.yml/badge.svg?branch=master&event=push)](https://github.com/denz93/vendure-plugin-simple-auth/actions/workflows/public-package-npmjs.yml)

A Vendure plugin allow users log in using email and verification code

## Use Case
A lot of times we want visitors (aka customers) to complete their purchase order as quick as possilble. However, they usually hesitate to create a credential to a random online shop at checkout step. So we provide a way to quickly authenticate those visitors by their email and a verification code that is sent to their email.

## What it does
Expose a GraphQL Query "`requestOneTimeCode`" and add an authentication strategy to GraphQL mutation "`authenticate`".

---

## How to use

### 1. Install

`yarn add @denz93/vendure-plugin-simple-auth`

or

`npm i --save @denz93/vendure-plugin-simple-auth`

### 2. Add the plugin to ***vendure-config.ts*** file

```typescript
import { SimpleAuthPlugin } from "@denz93/vendure-plugin-simple-auth";
...
export const config: VendureConfig  = {
 ...
 plugins: [
   ...
   SimpleAuthPlugin.init(options) //see Options
 ]
}
```

### 3. Options for `SimpleAuthPlugin.init`

* attempts: `number`
  > Plugin will invalidate the verification code after user's `attempts`.  
  **default**: 5
* ttl: `number`
  > Time to live  
  How long the verification code is valid for.  
  **default**: 600 (seconds)
* length: `number`
  > How long the verification code should be.  
  **default**: 6
* includeAlphabet: `boolean`
  > Should allow alphabet characters.  
  **default**: false (aka `digits only`)
* isDev: `boolean`
  > If true, the verification will return along with the response of query. `requestOneTimeCode`.  
  It's for debug and testing.  
  **default**: false

## Future Updates

- [ ] Prevent cross authenticate (Ex: users use same email for GoogleAuth and SimpleAuth)
