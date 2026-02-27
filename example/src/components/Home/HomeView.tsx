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
};

const TABS: TabName[] = ['Sessions', 'Advanced', 'API-Only'];

const TAB_CONTENT: Record<TabName, PageType[]> = {
  'Sessions': [
    { title: 'Sessions DropIn', route: 'SessionsDropInCheckout' },
    { title: 'Sessions Components', route: 'SessionsComponentsCheckout' },
  ],
  'Advanced': [
    { title: 'Advanced Checkout', route: 'AdvancedCheckout' },
    { title: 'Partial Payment', route: 'PartialPaymentCheckout' },
  ],
  'API-Only': [
    { title: 'Custom Card (CSE)', route: 'CustomCard' },
    { title: 'Stored Cards', route: 'StoredCards' },
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
            isActive={activeTab === tab}
            onPress={() => setActiveTab(tab)}
          />
        ))}
      </View>

      <View style={Styles.content}>
        {TAB_CONTENT[activeTab].map(({ title, route }) => (
          <MenuButton
            key={title}
            title={title}
            onPress={() => navigationHandler(route)}
          />
        ))}
      </View>
    </View>
  );
};

export default Home;
