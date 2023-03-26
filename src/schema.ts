import gql from 'graphql-tag';

export const queryExtension = gql`
  extend enum ErrorCode {
    CROSS_EMAIL_AUTHENTICATION
  }
  type RequestOneTimeCodeError implements ErrorResult {
    errorCode: ErrorCode!
    message: String!
  }

  type OneTimeCode {
    value: String!
  }

  union RequestOneTimeCodeResult = OneTimeCode | RequestOneTimeCodeError

  extend type Query {
    requestOneTimeCode(email: String!): RequestOneTimeCodeResult!
  }
`;