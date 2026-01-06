import { supabase } from "./config.js";

const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const messageDiv = document.getElementById("message");

// SIGNUP
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const name = document.getElementById("signup-name").value;

  // Basic validation
  if (!email || !password || !name) {
    alert("Please fill in all fields.");
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters long.");
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          name: name
        }
      }
    });

    if (error) {
      alert("Signup Error: " + error.message);
    } else {
      alert("Signup successful! You can now login.");
      // Clear form and close popup after signup
      signupForm.reset();
      document.getElementById("popup").style.display = "none";
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    alert("An unexpected error occurred. Please try again.");
  }
});

// LOGIN + Redirect
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  // Basic validation
  if (!email || !password) {
    messageDiv.textContent = "Please fill in both fields.";
    messageDiv.style.color = "red";
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) {
      messageDiv.textContent = "Login Error: " + error.message;
      messageDiv.style.color = "red";
    } else {
      messageDiv.textContent = "Login Successful!";
      messageDiv.style.color = "green";
      
      // Wait 1 second then redirect to home page
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 1000);
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    messageDiv.textContent = "An unexpected error occurred.";
    messageDiv.style.color = "red";
  }
});

// Optional: Press Enter to submit forms
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    if (document.getElementById("popup").style.display === "flex") {
      // If signup popup is open, submit signup form
      signupForm.dispatchEvent(new Event('submit'));
    } else {
      // Otherwise submit login form
      loginForm.dispatchEvent(new Event('submit'));
    }
  }
});