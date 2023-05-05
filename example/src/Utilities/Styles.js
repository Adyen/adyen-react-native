import { StyleSheet } from 'react-native';

const Styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  centeredContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'stretch',
    flex: 1,
    justifyContent: 'center',
  },
  horizontalContent: {
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-around',
    flexDirection: 'row',
  },
  item: {
    padding: 8,
  },
  itemTitle: {
    paddingLeft: 4,
  },
  textInputDark: {
    color: 'white',
    backgroundColor: 'grey',
    padding: 8,
    borderRadius: 8,
  },
  textInputLight: {
    color: 'black',
    backgroundColor: 'lightgrey',
    padding: 8,
    borderRadius: 8,
  },
  textLight: {
    color: 'black',
  },
  textDark: {
    color: 'white',
  },
  slash: { paddingHorizontal: 4, textAlign: 'center' },
  centeredText: { textAlign: 'center' },
  centeredButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  btnClickContain: {
    backgroundColor: '#009D6E',
    borderRadius: 5,
    padding: 5,
    margin: 5,
  },
  btnContainer: {
    flexDirection: 'row',
  },
  btnIcon: {
    height: 32,
    width: 46,
    borderRadius: 4,
    resizeMode: 'center',
  },
  btnText: {
    fontSize: 18,
    color: '#FAFAFA',
    marginLeft: 10,
    marginTop: 2,
  },
});

export default Styles;
