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
    paddingTop: 32,
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
    paddingLeft: 16,
    paddingTop: 12,
    paddingBottom: 4,
    fontSize: 14,
    color: '#666',
  },
  textInput: {
    marginHorizontal: 16,
    padding: 12,
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
  horizontalSpace: {
    width: 8,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  transparentButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  transparentButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    paddingLeft: 16,
    paddingTop: 20,
    paddingBottom: 4,
    fontWeight: '600',
    fontSize: 16,
  },
  dropdown: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
  },
  formAction: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  dropdownMenu: {
    borderRadius: 12,
    minWidth: 200,
    maxHeight: 300,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  dropdownItemSelectedText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  fullScreenModal: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  fullScreenTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  fullScreenCancel: {
    fontSize: 17,
    color: '#007AFF',
  },
  fullScreenHeaderSpacer: {
    width: 60,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    fontSize: 16,
    paddingVertical: 10,
  },
  fullScreenList: {
    flex: 1,
  },
});

export default Styles;
