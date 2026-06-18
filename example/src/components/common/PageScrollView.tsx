import type { PropsWithChildren } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Styles from './Styles';

const PageScrollView = ({ children }: PropsWithChildren) => {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={Styles.page}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      {children}
    </ScrollView>
  );
};

export default PageScrollView;
