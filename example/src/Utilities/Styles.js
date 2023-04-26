import { StyleSheet } from 'react-native';

const Styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
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
});

export default Styles;
