import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { HomeStackParamList } from '../../router/HomeStackNavigator';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Styles from '../common/Styles';
import TabItem from './TabItem';
import MenuButton from './MenuButton';

type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, 'Home'>;

type TabName = 'Sessions' | 'Advanced' | 'API-Only';

type PageType = {
  title: string;
  route: keyof HomeStackParamList;
  testID: string;
};

const TABS: TabName[] = ['Sessions', 'Advanced', 'API-Only'];

const TAB_TEST_IDS: Record<TabName, string> = {
  'Sessions': 'tab-sessions',
  'Advanced': 'tab-advanced',
  'API-Only': 'tab-api-only',
};

const TAB_CONTENT: Record<TabName, PageType[]> = {
  'Sessions': [
    {
      title: 'Sessions DropIn',
      route: 'SessionsDropInCheckout',
      testID: 'menu-sessions-dropin',
    },
    {
      title: 'Sessions Components',
      route: 'SessionsComponentsCheckout',
      testID: 'menu-sessions-components',
    },
  ],
  'Advanced': [
    {
      title: 'Advanced Checkout',
      route: 'AdvancedCheckout',
      testID: 'menu-advanced-checkout',
    },
    {
      title: 'Partial Payment',
      route: 'PartialPaymentCheckout',
      testID: 'menu-partial-payment',
    },
  ],
  'API-Only': [
    {
      title: 'Custom Card (CSE)',
      route: 'CustomCard',
      testID: 'menu-custom-card',
    },
    {
      title: 'Stored Cards',
      route: 'StoredCards',
      testID: 'menu-stored-cards',
    },
  ],
};

const Home = ({ navigation }: HomeScreenProps) => {
  const [activeTab, setActiveTab] = useState<TabName>('Sessions');

  const navigationHandler = useCallback(
    (screenName: keyof HomeStackParamList) => {
      navigation.navigate(screenName as any);
    },
    [navigation]
  );

  return (
    <View style={[Styles.page]}>
      <View style={Styles.tabBar}>
        {TABS.map((tab) => (
          <TabItem
            key={tab}
            label={tab}
            testID={TAB_TEST_IDS[tab]}
            isActive={activeTab === tab}
            onPress={() => setActiveTab(tab)}
          />
        ))}
      </View>

      <View style={Styles.content}>
        {TAB_CONTENT[activeTab].map(({ title, route, testID }) => (
          <MenuButton
            key={title}
            title={title}
            testID={testID}
            onPress={() => navigationHandler(route)}
          />
        ))}
      </View>
    </View>
  );
};

export default Home;
