import { Environment } from '../configuration';

export interface AnalyticsOptions {
  /**
   * Enable/Disable all analytics
   */
  enabled?: boolean;

  /**
   * Data to be sent along with the event data
   */
  payload?: any;
}

export type CheckoutAttemptIdSession = {
  id: string;
  timestamp: number;
};

export type CollectIdProps = {
  clientKey: string;
  environment: Environment;
};
