import { StyleSheet } from 'react-native';
import Colors from './Assets';

const Styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
  },
  horizontalContent: {
    flexDirection: 'row',
  },
  padded: {
    padding: 8,
  },
  topPadded: {
    paddingTop: 16,
  },
  paddedTitle: {
    paddingLeft: 8,
    paddingTop: 8,
  },
  textInput: {
    padding: 8,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'medium',
    width: 'auto',
  },
  btnClickContain: {
    borderRadius: 5,
    padding: 8,
    marginVertical: 4,
    marginLeft: 8,
    marginRight: 8,
  },
  btnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnIcon: {
    height: 32,
    width: 46,
    borderRadius: 4,
    backgroundColor: Colors.textBackgroundDark,
    resizeMode: 'stretch',
    borderWidth: 0.5,
    borderColor: Colors.textBackgroundDark,
  },
  btnText: {
    fontSize: 18,
    marginLeft: 10,
    marginTop: 2,
  },
  btnSubText: {
    fontSize: 14,
    marginLeft: 10,
    marginTop: 2,
  },
  errorText: {
    color: Colors.errorForeground,
    textAlign: 'center',
  },
  scrollBottomPadding: {
    height: 60,
  },
});

export default Styles;
