# 🔥 Firebase Setup for Real-time Messaging

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `proximsg` (or your preferred name)
4. **Disable Google Analytics** (not needed for this app)
5. Click "Create project"

## Step 2: Enable Realtime Database

1. In your Firebase project, go to **Build → Realtime Database**
2. Click "Create Database"
3. **Choose location**: Select closest to your users
4. **Security rules**: Start in **test mode** (we'll secure it later)
5. Click "Enable"

## Step 3: Get Your Config

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click **Web app** icon `</>`
4. **App nickname**: `proximsg-web`
5. **Don't check** "Firebase Hosting" 
6. Click "Register app"
7. **Copy the config object** that looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 4: Update Your App

1. **Open** `assets/js/firebase-messaging.js`
2. **Replace the config** around line 20:

```javascript
// Replace this default config with YOUR Firebase config
this.config = config || {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com", 
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 5: Set Security Rules

1. In Firebase Console → **Realtime Database → Rules**
2. Replace with these **proximity-based rules**:

```json
{
  "rules": {
    "messages": {
      "$locationKey": {
        ".read": true,
        ".write": true,
        "$messageId": {
          ".validate": "newData.hasChildren(['content', 'userId', 'username', 'location', 'timestamp']) && newData.child('content').isString() && newData.child('content').val().length <= 280"
        }
      }
    }
  }
}
```

## Step 6: Test Your App

1. **Commit and push** your changes to GitHub
2. **Wait 2-3 minutes** for GitHub Pages to update
3. **Open your app** on two different devices
4. **Grant location permission** on both devices
5. **Send a message** from one device
6. **Should appear instantly** on the other device! 🎉

## 🎯 Free Tier Limits

- ✅ **1GB storage** - Perfect for text messages
- ✅ **10GB/month transfer** - Handles thousands of messages
- ✅ **100 concurrent users** - Great for local communities
- ✅ **No credit card required**

## 🔧 Troubleshooting

### "Firebase not initialized"
- Check your config keys match exactly
- Ensure databaseURL includes your project name

### "Permission denied"
- Verify your database rules allow read/write
- Check the database location key format

### Messages not appearing
- Check browser console for errors
- Verify both devices have location permission
- Ensure you're within the broadcast range

## 🚀 Your App Will Now Support:

- ✅ **Real-time messaging** between different devices
- ✅ **Location-based** message grouping  
- ✅ **Automatic cleanup** of old messages
- ✅ **Cross-platform** (iOS, Android, Web)
- ✅ **Offline support** (messages sync when back online)