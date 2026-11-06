# Android release signing key

This folder holds the key that signs the AgricDrone Hub APK. Everything here except this README is gitignored.

- `agricdrone-release.keystore`: the signing key
- `keystore.properties`: its alias and passwords, read by the Gradle build (`plugins/withReleaseSigning.js`)

**Back up both files somewhere safe** (for example, a password manager or a private cloud drive). Android only installs an update if it is signed with the same key. If this key is lost, people have to uninstall the app and install a new one.

Never commit these files or share the passwords in chat.
