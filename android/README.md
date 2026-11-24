# MAX GAINS Watch — Android companion preview

This is source code, not a compiled APK. The Android SDK and Gradle dependencies were unavailable in the authoring environment; compilation and real-device testing are outstanding. This package is designed to coexist with the existing Workout-tracer website on its main branch. The Android project lives in android/; the workflow lives in .github/workflows/. No Supabase credentials or server access are used by the companion.

## Build with GitHub (no PC development environment required)
1. Extract the repository-ready ZIP. Open the existing mspicer199-svg/Workout-tracer repository on its main branch. Do not replace or delete any website files.
2. Upload the extracted android/ folder to the repository root, preserving its paths. Create `.github/workflows/build-apk.yml` separately at the repository root if GitHub omits hidden folders. The workflow file is also provided separately for this purpose.
3. The workflow starts automatically on a main-branch push touching android/ or the workflow. Alternatively go to Actions → Build MAX GAINS Watch APK → Run workflow → main. If Actions is disabled, enable it first.
4. Open the finished run; download the artifact `MAX-GAINS-Watch-debug`, extract the ZIP, and install `app-debug.apk` on your Samsung phone. Android may require permission to install apps from the browser or Files app; only install an APK you built from the reviewed code. Turn that installation permission off again after use.
5. Debug APK signing keys on ephemeral GitHub runners can change between builds. If a later APK cannot update the previous one, uninstall the old companion (not MAX GAINS or Samsung Health) and reinstall. Export any needed data first.

## Local build instead
Open the android/ project in Android Studio, install Android SDK 36, use JDK 17, sync Gradle, and build a debug APK. No Gradle wrapper binary is bundled; use an installed Gradle 8.11.1 or generate the wrapper using `gradle wrapper --gradle-version 8.11.1`.

## Pairing and transfer
1. Keep the watch paired with Samsung Health. On your phone, Samsung Health → Settings → Health Connect; allow Samsung Health to write steps, sleep and heart-rate data. Enable Samsung Health cloud sync if required. Reopen Samsung Health after granting permissions.
2. Back up your current MAX GAINS app in Settings. Deploy the accompanying `MAX-GAINS-v6.5.html` by renaming it `index.html` and replacing only the existing website file. Keep all other assets and the URL unchanged. Refresh and verify V6.5.
3. Open the installed MAX GAINS Watch app on the phone. Tap Connect and grant the read permissions you want. Refresh. Review the data, tap Export for MAX GAINS and choose a file location.
4. In your existing MAX GAINS website, open Health → Watch & Health Connect → Import watch JSON and choose the saved file. Repeat as needed. The companion automatically tries reading on launch once permission exists, but transfer to the website is manual.
5. To preserve watch history, use Export watch history in the website Health tab. The existing full app backup does not contain this separate watch store. Keep exports private.

## Data and limitations
- Reads Health Connect daily aggregate steps, sleep-session minutes, average recorded heart rate and resting heart rate if supplied. Data may include multiple Health Connect sources; it is not guaranteed to be watch-only. Resting HR may be absent. Sleep sessions are allocated to local calendar days, not wake-date overnight totals. Today's values may be incomplete. HRV, calories, oxygen, and BP are not imported in this preview.
- Read-only permissions, no internet permission, no background health reads, no cloud upload, no direct smartwatch app. The website import does not modify manual measurements, workouts, or the programme. Missing values do not become zero. Day records merge by date; new exports replace available metrics, older exports do not replace newer recorded values.
- Verify on a real device against Samsung Health. Some data may sync late or differ by source aggregation and time-zone boundaries. Do not use this as a medical device.

Official references:
https://developer.samsung.com/health/health-connect-faq.html
https://developer.android.com/health-and-fitness/health-connect/get-started
https://developer.android.com/health-and-fitness/health-connect/data-types
