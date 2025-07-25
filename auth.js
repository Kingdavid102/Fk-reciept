// Auth page functionality
document.addEventListener("DOMContentLoaded", () => {
  const tabBtns = document.querySelectorAll(".tab-btn")
  const authForms = document.querySelectorAll(".auth-form")
  const loginForm = document.getElementById("loginForm")
  const signupForm = document.getElementById("signupForm")
  const adminModal = document.getElementById("adminModal")
  const adminLoginBtn = document.getElementById("adminLoginBtn")
  const adminForm = document.getElementById("adminForm")
  const modalCloses = document.querySelectorAll(".modal-close")

  // Check URL parameters for mode
  const urlParams = new URLSearchParams(window.location.search)
  const mode = urlParams.get("mode")
  if (mode === "signup") {
    switchTab("signup")
  }

  // Tab switching
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab
      switchTab(tab)
    })
  })

  function switchTab(tab) {
    tabBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab)
    })
    authForms.forEach((form) => {
      form.classList.toggle("active", form.id === `${tab}-form`)
    })
  }

  // Login form
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(loginForm)
    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
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
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(signupForm)
    const password = formData.get("password")
    const confirmPassword = formData.get("confirmPassword")

    if (password !== confirmPassword) {
      showNotification("Passwords do not match", "error")
      return
    }

    const data = {
      username: formData.get("username"),
      email: formData.get("email"),
      password: password,
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
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

  // Admin login
  adminLoginBtn.addEventListener("click", () => {
    adminModal.classList.remove("hidden")
  })

  adminForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(adminForm)
    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
    }

    try {
      const response = await fetch("/api/auth/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        localStorage.setItem("isAdmin", "true")
        showNotification("Admin access granted!", "success")
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

  // Modal close handlers
  modalCloses.forEach((btn) => {
    btn.addEventListener("click", () => {
      adminModal.classList.add("hidden")
    })
  })

  adminModal.addEventListener("click", (e) => {
    if (e.target === adminModal) {
      adminModal.classList.add("hidden")
    }
  })

  // Notification system
  function showNotification(message, type = "info") {
    const notification = document.getElementById("notification")
    notification.textContent = message
    notification.className = `notification ${type} show`

    setTimeout(() => {
      notification.classList.remove("show")
    }, 3000)
  }
})
