// Expo config plugin for the local release build (survives `expo prebuild --clean`):
// - signs release APKs with the key in ../sleutel (keystore.properties + .jks, never in git)
// - builds only for arm64 phones (every modern Android/Samsung) → smaller APK, faster build
const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const MARKER = '// brainscroll-release-signing';
const SIGNING = `
${MARKER}
def bsKeyFile = rootProject.file('../sleutel/keystore.properties')
if (bsKeyFile.exists()) {
    def bsKey = new Properties()
    bsKeyFile.withInputStream { bsKey.load(it) }
    android.signingConfigs.create('brainscrollRelease') {
        storeFile rootProject.file('../sleutel/' + bsKey['storeFile'])
        storePassword bsKey['storePassword']
        keyAlias bsKey['keyAlias']
        keyPassword bsKey['keyPassword']
    }
    android.buildTypes.release.signingConfig android.signingConfigs.brainscrollRelease
} else {
    throw new GradleException('Signing key missing: expected ../sleutel/keystore.properties')
}
`;

module.exports = function withReleaseBuild(config) {
  config = withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes(MARKER)) c.modResults.contents += SIGNING;
    return c;
  });
  config = withGradleProperties(config, (c) => {
    const props = c.modResults.filter((p) => !(p.type === 'property' && p.key === 'reactNativeArchitectures'));
    props.push({ type: 'property', key: 'reactNativeArchitectures', value: 'arm64-v8a' });
    c.modResults = props;
    return c;
  });
  return config;
};
