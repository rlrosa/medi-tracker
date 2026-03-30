#!/bin/bash

# Ensure the out directory exists
if [ ! -d "out" ]; then
  mkdir out
  echo '<!DOCTYPE html><html><head><title>MediTracker</title></head><body></body></html>' > out/index.html
fi

# Sync Capacitor configuration and web assets to the Android project
echo "Syncing Capacitor..."
npx cap sync android

# Run the app on a connected device or emulator
echo "Deploying to Android device..."
npx cap run android
