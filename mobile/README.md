# AgriDrone mobile

Native Expo app using React Native, TypeScript, Expo Router and NativeWind.
The current route is a temporary scaffold message; product screens must follow
the reviewed Figma prototype.

## Requirements

- Node.js 22.13+, 24.3+, or 26.0+
- npm 11
- Expo Go or an Android development environment for device testing

## Setup and commands

```powershell
npm ci
npm run dev
npm run start
npm run lint
npm run typecheck
npm run export:android
```

Press `a` in the Expo CLI to open an Android emulator, or scan the development
QR code with Expo Go. A physical device cannot reach a server using
`localhost`; use the development computer's LAN IP or a configured HTTPS API
URL when the API is added.

Do not put secrets in `EXPO_PUBLIC_*` variables. They are embedded in the
client bundle.
