import type { Environment } from '@adyen/react-native';

export function getIconUrl(environment: Environment, icon: string) {
  return `https://checkoutshopper-${environment}.adyen.com/checkoutshopper/images/logos/small/${icon}@3x.png`;
}
