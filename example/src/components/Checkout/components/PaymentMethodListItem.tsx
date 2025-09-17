import { TouchableHighlight, View, Image } from 'react-native';
import { ENVIRONMENT } from '../../../Configuration';
import Styles from '../../common/Styles';
import { getIconUrl } from '../../utilities/getIcon';
import Colors from '../../common/Assets';
import AdaptiveText from '../../common/AdaptiveText';

interface PaymentMethodListItemProps {
  onPress: () => void;
  title: string;
  subtitle?: string;
  icon: string;
}

const PaymentMethodListItem = (props: PaymentMethodListItemProps) => {
  const iconURI = getIconUrl(ENVIRONMENT.environment, props.icon);

  return (
    <TouchableHighlight
      onPress={props.onPress}
      style={Styles.btnClickContain}
      underlayColor={Colors.buttonOverlay}
    >
      <View style={Styles.btnContainer}>
        <Image source={{ uri: iconURI }} style={Styles.btnIcon} />
        <View>
          <AdaptiveText style={Styles.btnText}>{props.title}</AdaptiveText>
          {props.subtitle && (
            <AdaptiveText style={Styles.btnSubText}>
              {props.subtitle}
            </AdaptiveText>
          )}
        </View>
      </View>
    </TouchableHighlight>
  );
};

export default PaymentMethodListItem;
