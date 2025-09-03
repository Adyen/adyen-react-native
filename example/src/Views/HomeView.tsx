import { useCallback, useEffect } from 'react';
import { View, Button } from 'react-native';
import Styles from '../Utilities/Styles';
import type { PageProps } from '../State/RootStackParamList';

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
      title: 'Sessions flow',
      route: { name: 'SessionsCheckout', params: undefined },
    },
    {
      title: 'Advanced flow',
      route: { name: 'AdvancedCheckout', params: undefined },
    }
  ];

  return (
    <View style={Styles.content}>
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
