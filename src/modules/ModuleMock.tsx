import { LINKING_ERROR } from '../core/constants';

export const ModuleMock = new Proxy(
  {},
  {
    get() {
      throw new Error(LINKING_ERROR);
    },
  }
);
