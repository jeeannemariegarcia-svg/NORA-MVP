/* NORA Firebase Administrator Login */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Firebase web app configuration
// (Copy this block from Firebase Console > Project settings > Your apps > Config)
const firebaseConfig = {
  apiKey: "AIzaSyCE92SwUbk3nFXB-fhmabxASdwsAd1OS9M",
  authDomain: "nora-mvp.firebaseapp.com",
  projectId: "nora-mvp",
  storageBucket: "nora-mvp.firebasestorage.app",
  messagingSenderId: "826981118486",
  appId: "1:826981118486:web:5e3cda9f092f4ffb31bb37"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const loginButton = document.getElementById("login-button");

// Turn Firebase error codes into messages a person can understand
function getFriendlyError(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Incorrect email or password. Please try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Network problem. Check your internet connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    default:
      if (code && code.startsWith("auth/api-key-not-valid")) {
        return "Login is not set up correctly (invalid Firebase API key). " +
               "Please contact the site administrator.";
      }
      return "Login failed. Please try again.";
  }
}

// Redirect already signed-in users
onAuthStateChanged(auth, user => {
  if (user) {
    window.location.replace("admin.html");
  }
});

// Handle sign-in
loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value;

  loginMessage.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.replace("admin.html");
  } catch (error) {
    // Full details stay in the browser console for debugging
    console.error("Firebase login error:", error.code, error.message);
    loginMessage.textContent = getFriendlyError(error.code);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Sign In";
  }
});
