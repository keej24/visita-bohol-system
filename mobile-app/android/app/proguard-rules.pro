## Flutter wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

## Keep flutter_map and related map classes
-keep class net.tlabs.** { *; }
-keep class com.example.visita_mobile.** { *; }

## CRITICAL: Keep HTTP client classes for map tile loading
-keep class org.apache.http.** { *; }
-keep class android.net.http.** { *; }
-dontwarn org.apache.http.**
-dontwarn android.net.http.**

## Keep OkHttp for network requests (used by some plugins)
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

## Geolocator
-keep class com.baseflow.geolocator.** { *; }

## Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

## Prevent obfuscation of model classes
-keep class * extends com.google.gson.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

## Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

## For debugging map issues in release builds
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
