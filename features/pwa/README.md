# PWA & Native Platform Module

Implements Progressive Web App (PWA) capabilities, offline caching of schedules, install prompts, and native app bridges (Capacitor & Universal Links) as outlined in the BooKanto Web System Development Plan.

## Features

### 1. Web App Manifest (`app/manifest.ts`)

- Standalone display configuration with fallback overrides
- Philippine localized metadata (`en-PH`, `Asia/Manila`)
- App shortcuts for Explore, Today's Schedule, and My Bookings
- High-resolution standard and maskable icons (192px, 512px)
- Desktop and mobile screenshot metadata for rich installation dialogs

### 2. Service Worker (`public/sw.js`)

- Pre-caches core offline shell: `/offline`, icons, and favicon
- **Navigation requests**: Network-first strategy with automatic fallback to `/offline` shell
- **Schedule data**: Network-first caching strategy for `/api/dashboard/today` with offline fallback
- **Static assets**: Cache-first / stale-while-revalidate for Next.js static bundles and icons
- **Web Push**: Complete push notification delivery with vibration and click navigation
- **Lifecycle management**: Cache version rotation on activate and instant skip-waiting triggers

### 3. Install Prompt System (`features/pwa/`)

- `usePwaInstall`: Hook capturing `beforeinstallprompt`, detecting iOS Safari, and handling dismiss states
- `PwaInstallBanner`: Non-intrusive floating banner for mobile and desktop
- `PwaInstallModal`: Explains benefits (offline schedule, 1-tap launch, data saving) and iOS 3-step walkthrough
- `PwaInstallButton`: Reusable component displaying install status across headers and dashboards
- `ConnectivityBanner`: Real-time online/offline network indicator

### 4. Offline Schedule Cache (`features/pwa/offline-bookings-cache.ts`)

- Automatically saves today's schedule and appointments to persistent local storage on dashboard load
- Displays cached schedule on `/offline` and in `TodayView` during network interruptions
- Allows shop owners to call clients directly using the phone's native cellular dialer without mobile data

### 5. Native Apps (Phase 3)

- `capacitor.config.ts`: Cross-platform configuration for Android (Google Play) and iOS (Apple App Store)
- Digital Asset Links: `app/.well-known/assetlinks.json/route.ts` for verified Android App Links
- Apple App Site Association: `app/.well-known/apple-app-site-association/route.ts` for iOS Universal Links
- `features/pwa/native-bridge.ts`: Haptic feedback, native share, app badge manipulation, and platform detection
- Public App Hub: `app/(public)/app/page.tsx` for guided user downloads and pilot announcements
