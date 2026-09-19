const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

/**
 * iOS 27 asserts at launch unless the app adopts the UIScene life cycle, and the SDK 57
 * prebuild template still starts React Native from the app delegate. Expo ships the scene
 * delegate (`EXExpoAppSceneDelegate`); this plugin points the scene manifest at it and hands
 * window creation over, which is what that class expects the app delegate to do.
 *
 * Drop this plugin once the Expo template wires the scene delegate itself.
 */
const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
      },
    ],
  },
};

/** The template's window setup, which the scene delegate now owns. */
const WINDOW_SETUP = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

`;

function withSceneManifest(config) {
  return withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = SCENE_MANIFEST;
    return mod;
  });
}

function withSceneAwareAppDelegate(config) {
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error(`withSceneLifecycle expects a Swift AppDelegate, got ${mod.modResults.language}`);
    }

    let contents = mod.modResults.contents;

    if (!contents.includes('ExpoReactNativeFactoryProvider')) {
      contents = contents.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      );
    }

    if (contents.includes(WINDOW_SETUP)) {
      contents = contents.replace(WINDOW_SETUP, '');
    } else if (contents.includes('factory.startReactNative(')) {
      throw new Error(
        'withSceneLifecycle could not remove the template window setup from AppDelegate.swift — ' +
          'the template changed, so re-check whether this plugin is still needed.',
      );
    }

    mod.modResults.contents = contents;
    return mod;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneAwareAppDelegate(withSceneManifest(config));
};
