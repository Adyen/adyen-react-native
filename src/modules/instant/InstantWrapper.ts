import { ActionHandlingComponentWrapper } from '../base/ActionHandlingComponentWrapper';

/** Instant payment wrapper - no additional events beyond inherited ones. */
export class InstantWrapper extends ActionHandlingComponentWrapper {
  name: string = 'Instant';
}
