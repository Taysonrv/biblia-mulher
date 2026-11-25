const { Platform, TurboModuleRegistry } = require('react-native');
if (Platform.OS === 'android' && TurboModuleRegistry.get('AndroidWidget')) {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widgets/word-widget');
  registerWidgetTaskHandler(widgetTaskHandler);
}
require('expo-router/entry');
