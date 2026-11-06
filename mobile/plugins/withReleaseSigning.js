// Signs Android release builds with the project's own key instead of the shared debug key.
// The key and its passwords live in mobile/credentials/ (gitignored); see credentials/README.md.
const { withAppBuildGradle } = require("expo/config-plugins");

const LOAD_PROPERTIES = `
def releaseSigning = new Properties()
def releaseSigningFile = rootProject.file("../credentials/keystore.properties")
if (releaseSigningFile.exists()) {
    releaseSigningFile.withInputStream { releaseSigning.load(it) }
}
`;

const RELEASE_CONFIG = `
        release {
            if (releaseSigning["storeFile"]) {
                storeFile rootProject.file("../credentials/" + releaseSigning["storeFile"])
                storePassword releaseSigning["storePassword"]
                keyAlias releaseSigning["keyAlias"]
                keyPassword releaseSigning["keyPassword"]
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (gradle) => {
    let src = gradle.modResults.contents;
    if (src.includes("releaseSigning")) return gradle;

    src = src.replace(/^android \{/m, `${LOAD_PROPERTIES}\nandroid {`);
    // Add a "release" signing config next to the template's "debug" one...
    src = src.replace(/signingConfigs \{\n(\s*)debug \{/, (match) => match.replace("signingConfigs {", `signingConfigs {${RELEASE_CONFIG}`));
    // ...and point the release build type at it (the template signs release with the debug key).
    src = src.replace(/(release \{[^}]*?)signingConfig signingConfigs\.debug/, "$1signingConfig releaseSigning[\"storeFile\"] ? signingConfigs.release : signingConfigs.debug");
    gradle.modResults.contents = src;
    return gradle;
  });
};
