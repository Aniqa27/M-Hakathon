import { supabase } from "./config.js";

const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const messageDiv = document.getElementById("message");

// SIGNUP
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const name = document.getElementById("signup-name").value || email.split('@')[0];

  const { error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      data: {
        name: name
      }
    }
  });

  if (error) {
    alert(error.message);
  } else {
    alert("Signup successful! Check your email.");
    // Clear form and close popup after signup
    signupForm.reset();
    document.getElementById("popup").style.display = "none";
  }
});

// LOGIN + Redirect
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    messageDiv.textContent = error.message;
    messageDiv.style.color = "red";
  } else {
    messageDiv.textContent = "Login Successful!";
    messageDiv.style.color = "green";
    
    // Wait 1 second then redirect to home page
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 1000);
  }
});