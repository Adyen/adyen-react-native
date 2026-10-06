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
  disabled?: boolean;
};

const TABS: TabName[] = ['Sessions', 'Advanced', 'API-Only'];

const TAB_CONTENT: Record<TabName, PageType[]> = {
  'Sessions': [
    {
      title: 'Sessions DropIn',
      route: 'SessionsDropInCheckout',
      disabled: true,
    },
    { title: 'Sessions Components', route: 'SessionsComponentsCheckout' },
  ],
  'Advanced': [{ title: 'Advanced Checkout', route: 'AdvancedCheckout' }],
  'API-Only': [
    { title: 'Custom Card (CSE)', route: 'CustomCard' },
    { title: 'Stored Cards', route: 'StoredCards' },
    { title: 'Checkout validation routes', route: 'ValidationRoutes' },
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
            testID={`tab-${tab}`}
            isActive={activeTab === tab}
            onPress={() => setActiveTab(tab)}
          />
        ))}
      </View>

      <View style={Styles.content}>
        {TAB_CONTENT[activeTab].map(({ title, route, disabled = false }) => (
          <MenuButton
            key={title}
            title={title}
            testID={`menu-item-${route}`}
            onPress={() => navigationHandler(route)}
            disabled={disabled}
          />
        ))}
      </View>
    </View>
  );
};

export default Home;
