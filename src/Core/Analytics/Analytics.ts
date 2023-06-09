import postTelemetry from './post-telemetry';
import collectId from './collect-id';
import EventsQueue from './EventsQueue';
import { Configuration } from '../configuration';
import { CheckoutAttemptIdSession } from './types';

export type AnalyticsProps = Pick<
  Configuration,
  'environment' | 'locale' | 'clientKey' | 'analytics' | 'amount'
>;

/**
 * If the checkout attempt ID was stored more than fifteen minutes ago, then we should request a new ID.
 * More here: COWEB-1099
 */
function confirmSessionDurationIsMaxFifteenMinutes(
  checkoutAttemptIdSession: CheckoutAttemptIdSession
): boolean {
  if (!checkoutAttemptIdSession?.id) return false;

  const fifteenMinInMs = 1000 * 60 * 15;
  const fifteenMinAgoTimestamp = Date.now() - fifteenMinInMs;
  return checkoutAttemptIdSession.timestamp > fifteenMinAgoTimestamp;
}

class Analytics {
  private static defaultProps = {
    enabled: true,
  };

  public checkoutAttemptIdSession?: CheckoutAttemptIdSession = undefined;
  public props;
  private readonly logTelemetry;
  private readonly queue = new EventsQueue();
  public readonly collectId;

  constructor({
    clientKey,
    analytics,
    amount,
    locale,
    environment,
  }: AnalyticsProps) {
    this.props = { ...Analytics.defaultProps, ...analytics };
    this.logTelemetry = postTelemetry({
      environment,
      locale,
      clientKey,
      amount,
    });
    this.collectId = collectId({ environment, clientKey });
  }

  send(event: any) {
    const { enabled, payload } = this.props;

    if (enabled !== true) {
      return;
    }

    if (
      !this.checkoutAttemptIdSession ||
      confirmSessionDurationIsMaxFifteenMinutes(this.checkoutAttemptIdSession)
    ) {
      // fetch a new checkoutAttemptId if none is already available
      this.collectId()
        .then((checkoutAttemptIdSession) => {
          this.checkoutAttemptIdSession = checkoutAttemptIdSession;
          this.queue.run(this.checkoutAttemptIdSession);
        })
        .catch((e) => {
          console.warn(
            `Fetching checkoutAttemptId failed.${e ? ` Error=${e}` : ''}`
          );
        });
    }

    const telemetryTask = (
      checkoutAttemptIdSession: CheckoutAttemptIdSession
    ) =>
      this.logTelemetry({
        ...event,
        ...(payload && { ...payload }),
        checkoutAttemptId: checkoutAttemptIdSession.id,
      }).catch(() => {});

    this.queue.add(telemetryTask);

    if (this.checkoutAttemptIdSession) {
      this.queue.run(this.checkoutAttemptIdSession);
    }
  }
}

export default Analytics;
