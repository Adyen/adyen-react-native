import type { ApplePayError } from '../../core';

/** Internal result type passed to the native provideAuthorizationResult bridge method. Not part of the public API. */
export interface ApplePayAuthorizationResult {
  status: 'success' | 'failure';
  errors?: ApplePayError[];
}
