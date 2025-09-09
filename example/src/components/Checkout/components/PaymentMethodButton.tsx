import { TouchableHighlight, View, Image, Text } from "react-native";
import { ENVIRONMENT } from "../../../Configuration";
import Styles from "../../utilities/Styles";

interface PaymentMethodButtonProps {
    onPress: () => void;
    title: string;
    subtitle?: string;
    icon: string;
  }
  
  const PaymentMethodButton = (props: PaymentMethodButtonProps) => {
    const iconURI = `https://checkoutshopper-${ENVIRONMENT.environment}.adyen.com/checkoutshopper/images/logos/small/${props.icon}@3x.png`;
  
    return (
      <TouchableHighlight
        onPress={props.onPress}
        style={Styles.btnClickContain}
        underlayColor="#042417"
      >
        <View style={Styles.btnContainer}>
          <Image source={{ uri: iconURI }} style={Styles.btnIcon} />
          <View style={Styles.content}>
            <Text style={Styles.btnText}>{props.title}</Text>
            {props.subtitle ? <Text style={Styles.btnText}>{props.subtitle}</Text> : <View />}
          </View>
        </View>
      </TouchableHighlight>
    );
  };

  export default PaymentMethodButton;