const { withAppDelegate } = require('@expo/config-plugins');

/**
 * Expo Config Plugin: Fix iOS autofill yellow background on TextInput
 *
 * iOS applies a yellow/golden background to autofilled UITextField instances
 * (e.g. Apple Passwords fill). This disrupts the app's dark theme by making
 * white text illegible against the yellow highlight.
 *
 * Fix: inject a UITextField appearance proxy override into AppDelegate so the
 * autofill background colour is replaced with the app's dark card colour (#1A1A1A).
 */
module.exports = function withAutofillColorFix(config) {
  return withAppDelegate(config, (config) => {
    let { contents } = config.modResults;

    // Guard against double-injection on repeated prebuild runs
    if (contents.includes('withAutofillColorFix')) {
      return config;
    }

    // Injected before the super call so the override is registered at launch
    const injection = [
      '',
      '  // withAutofillColorFix: replace iOS autofill yellow with dark theme background (#1A1A1A)',
      '  [UITextField appearance].backgroundColor = [UIColor colorWithRed:0.102 green:0.102 blue:0.102 alpha:1.0];',
      '',
    ].join('\n');

    // Match the return statement present in all standard Expo AppDelegate.mm files
    const returnStatement =
      /(\s*return \[super application:application didFinishLaunchingWithOptions:launchOptions\];)/;

    if (returnStatement.test(contents)) {
      contents = contents.replace(returnStatement, `${injection}$1`);
    } else {
      console.warn(
        '[withAutofillColorFix] Injection point not found in AppDelegate.mm. ' +
          'The autofill fix was NOT applied. Check that didFinishLaunchingWithOptions ' +
          'contains the expected return statement.'
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
