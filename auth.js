
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
const firebaseConfig = {
  apiKey: "AIzaSyCE92SwUbk3nFXB-fhmabxASdwsAd10S9M",
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
  console.error("Firebase login error:", error.code, error.message);

  loginMessage.textContent =
    "Login error: " + (error.code || "unknown");
}
 finally {
    loginButton.disabled = false;
    loginButton.textContent = "Sign In";
  }
});
