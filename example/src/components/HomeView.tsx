import { useCallback, useEffect } from 'react';
import { View, Button } from 'react-native';
import type { PageProps } from '../State/RootStackParamList';
import Styles from './common/Styles';

function createOptions({ navigation }: PageProps) {
  return {
    headerRight: () => (
      <Button
        title="Settings"
        onPress={() => navigation.navigate('Settings')}
      />
    ),
  };
}

const Home = ({ navigation }: PageProps) => {
  useEffect(() => {
    const options = createOptions({ navigation });
    navigation.setOptions(options);
  }, [navigation]);

  const navigationHandler = useCallback(
    (targetScreen: Parameters<typeof navigation.navigate>[0]) => {
      navigation.navigate(targetScreen);
    },
    [navigation]
  );

  type PageType = {
    title: string;
    route: Parameters<typeof navigation.navigate>[0];
  };

  const pagesWithButtons: PageType[] = [
    {
      title: 'Checkout',
      route: { name: 'SessionsCheckout', params: undefined },
    },
    {
      title: 'Advanced case',
      route: { name: 'AdvancedCheckout', params: undefined },
    },
    {
      title: 'Advanced partial payment case',
      route: { name: 'PartialPaymentCheckout', params: undefined },
    },
    {
      title: 'Custom Card Integration',
      route: { name: 'CustomCard', params: undefined },
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
