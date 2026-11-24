plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "com.maxgains.watch"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.maxgains.watch"
        minSdk = 28
        targetSdk = 35
        versionCode = 1
        versionName = "1.0-preview"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.0")
    implementation("androidx.health.connect:connect-client:1.1.0")
}
