document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm")
  const signupForm = document.getElementById("signupForm")
  const adminForm = document.getElementById("adminForm")
  const showSignupBtn = document.getElementById("showSignup")
  const showLoginBtn = document.getElementById("showLogin")
  const showAdminBtn = document.getElementById("showAdmin")
  const backToLoginBtn = document.getElementById("backToLogin")

  // Form switching
  showSignupBtn?.addEventListener("click", (e) => {
    e.preventDefault()
    document.getElementById("loginSection").classList.add("hidden")
    document.getElementById("signupSection").classList.remove("hidden")
  })

  showLoginBtn?.addEventListener("click", (e) => {
    e.preventDefault()
    document.getElementById("signupSection").classList.add("hidden")
    document.getElementById("loginSection").classList.remove("hidden")
  })

  showAdminBtn?.addEventListener("click", (e) => {
    e.preventDefault()
    document.getElementById("loginSection").classList.add("hidden")
    document.getElementById("adminSection").classList.remove("hidden")
  })

  backToLoginBtn?.addEventListener("click", (e) => {
    e.preventDefault()
    document.getElementById("adminSection").classList.add("hidden")
    document.getElementById("loginSection").classList.remove("hidden")
  })

  // Login form
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const email = formData.get("email")
    const password = formData.get("password")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(result.user))
        showNotification("Login successful!", "success")
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 1000)
      } else {
        showNotification(result.error || "Login failed", "error")
      }
    } catch (error) {
      console.error("Login error:", error)
      showNotification("Network error. Please try again.", "error")
    }
  })

  // Signup form
  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const username = formData.get("username")
    const email = formData.get("email")
    const password = formData.get("password")
    const confirmPassword = formData.get("confirmPassword")

    if (password !== confirmPassword) {
      showNotification("Passwords do not match", "error")
      return
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      })

      const result = await response.json()

      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(result.user))
        showNotification("Account created successfully!", "success")
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 1000)
      } else {
        showNotification(result.error || "Signup failed", "error")
      }
    } catch (error) {
      console.error("Signup error:", error)
      showNotification("Network error. Please try again.", "error")
    }
  })

  // Admin form
  adminForm?.addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const email = formData.get("email")
    const password = formData.get("password")

    try {
      const response = await fetch("/api/auth/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (response.ok && result.isAdmin) {
        localStorage.setItem("isAdmin", "true")
        showNotification("Admin login successful!", "success")
        setTimeout(() => {
          window.location.href = "/admin"
        }, 1000)
      } else {
        showNotification(result.error || "Invalid admin credentials", "error")
      }
    } catch (error) {
      console.error("Admin login error:", error)
      showNotification("Network error. Please try again.", "error")
    }
  })

  function showNotification(message, type = "info") {
    const notification = document.getElementById("notification")
    if (notification) {
      notification.textContent = message
      notification.className = `notification ${type} show`

      setTimeout(() => {
        notification.classList.remove("show")
      }, 3000)
    }
  }
})
