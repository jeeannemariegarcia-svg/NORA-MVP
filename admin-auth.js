
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// STEP 1: Copy the exact firebaseConfig object
// from your working auth.js file.
const firebaseConfig = {
  // Replace this entire object with your existing configuration.
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const dashboard = document.getElementById("admin-dashboard");
const loading = document.getElementById("auth-loading");
const logoutButton = document.getElementById("logout-button");

let dashboardInitialized = false;

// STEP 2: Verify the Firebase login session.
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    dashboard.hidden = true;
    logoutButton.hidden = true;
    window.location.replace("login.html");
    return;
  }

  // STEP 3: Load inventory code only after login.
  if (!dashboardInitialized) {
    try {
      await import("./admin.js?v=6");
      dashboardInitialized = true;
    } catch (error) {
      console.error("Dashboard failed to load:", error);
      loading.textContent = "Unable to load the dashboard.";
      return;
    }
  }

  dashboard.hidden = false;
  logoutButton.hidden = false;
  loading.hidden = true;

}, (error) => {
  console.error("Authentication failed:", error);
  loading.textContent = "Unable to verify administrator access.";
});

// STEP 4: Handle logout.
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error("Logout failed:", error);
    logoutButton.disabled = false;
    alert("Unable to log out. Please try again.");
  }
});
