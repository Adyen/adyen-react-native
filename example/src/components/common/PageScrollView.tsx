import { useMemo, type PropsWithChildren } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Styles from './Styles';

const PageScrollView = ({ children }: PropsWithChildren) => {
  const insets = useSafeAreaInsets();
  const contentContainerStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, 16) }),
    [insets.bottom]
  );
  return (
    <ScrollView
      style={Styles.page}
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </ScrollView>
  );
};

export default PageScrollView;
