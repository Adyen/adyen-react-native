import { useCallback } from 'react';
import { View, Button } from 'react-native';
import { HomeStackParamList } from '../router/HomeStackNavigator';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Styles from './common/Styles';

type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, 'Home'>;

const Home = ({ navigation }: HomeScreenProps) => {
  const navigationHandler = useCallback(
    (screenName: keyof HomeStackParamList) => {
      navigation.navigate(screenName as any);
    },
    [navigation]
  );

  type PageType = {
    title: string;
    route: keyof HomeStackParamList;
  };

  const pagesWithButtons: PageType[] = [
    {
      title: 'Sessions DropIn',
      route: 'SessionsDropInCheckout',
    },
    {
      title: 'Sessions Components',
      route: 'SessionsComponentsCheckout',
    },
    {
      title: 'Advanced case',
      route: 'AdvancedCheckout',
    },
    {
      title: 'Advanced partial payment case',
      route: 'PartialPaymentCheckout',
    },
    {
      title: 'Custom Card Integration',
      route: 'CustomCard',
    },
  ];

  return (
    <View style={[Styles.page, Styles.content]}>
      {pagesWithButtons.map(({ title, route }) => (
        <Button
          title={title}
          key={title}
          onPress={() => navigationHandler(route)}
        />
      ))}
    </View>
  );
};

export default Home;
