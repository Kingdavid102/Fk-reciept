// Dashboard functionality
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"))

  if (!user) {
    window.location.href = "/auth"
    return
  }

  // Initialize dashboard
  initializeDashboard()
  loadReceiptTypes()
  setupNavigation()
  setupMobileMenu()

  // Event listeners
  document.getElementById("logoutBtn").addEventListener("click", logout)
  document.getElementById("createReceiptBtn").addEventListener("click", () => {
    if (!user.isPremium) {
      showUpgradeModal()
    } else {
      // Show receipt types for selection
      showPage("dashboard")
      document.querySelector(".receipt-types-section").scrollIntoView({ behavior: "smooth" })
    }
  })
  document.getElementById("upgradeBtn").addEventListener("click", showUpgradeModal)

  // Profile page functionality
  document.getElementById("uploadPhotoBtn").addEventListener("click", () => {
    document.getElementById("profilePhotoInput").click()
  })

  document.getElementById("profilePhotoInput").addEventListener("change", handleProfilePhotoUpload)
  document.getElementById("deletePhotoBtn").addEventListener("click", deleteProfilePhoto)

  // Modal handlers
  const upgradeModal = document.getElementById("upgradeModal")
  const modalCloses = document.querySelectorAll(".modal-close")

  modalCloses.forEach((btn) => {
    btn.addEventListener("click", () => {
      upgradeModal.classList.add("hidden")
    })
  })

  upgradeModal.addEventListener("click", (e) => {
    if (e.target === upgradeModal) {
      upgradeModal.classList.add("hidden")
    }
  })

  async function initializeDashboard() {
    try {
      // Update user info in case premium status changed
      const response = await fetch(`/api/user/${user.id}`)
      if (response.ok) {
        const result = await response.json()
        const updatedUser = result.user
        localStorage.setItem("user", JSON.stringify(updatedUser))

        // Update UI
        updateUserInterface(updatedUser)
        updateProfilePage(updatedUser)
        updateSubscriptionPage(updatedUser)
      }
    } catch (error) {
      console.error("Error updating user info:", error)
    }
  }

  function updateUserInterface(user) {
    // Update user info in sidebar
    document.getElementById("userName").textContent = user.username
    document.getElementById("userStatus").textContent = user.isPremium ? "Premium Plan" : "Free Plan"

    // Update profile avatars
    updateProfileAvatars(user)

    // Update stats
    document.getElementById("receiptsGenerated").textContent = user.receiptsGenerated || 0

    // Calculate account age
    const createdDate = new Date(user.createdAt)
    const now = new Date()
    const daysDiff = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24))
    document.getElementById("accountAge").textContent = daysDiff

    // Update upgrade button visibility
    const upgradeBtn = document.getElementById("upgradeBtn")
    if (user.isPremium) {
      upgradeBtn.style.display = "none"
    } else {
      upgradeBtn.style.display = "flex"
    }
  }

  function updateProfileAvatars(user) {
    const avatarElements = [
      { img: "headerProfileImg", initial: "headerProfileInitial", badge: "headerPremiumBadge" },
      { img: "sidebarProfileImg", initial: "sidebarProfileInitial", badge: "sidebarPremiumBadge" },
    ]

    avatarElements.forEach(({ img, initial, badge }) => {
      const imgElement = document.getElementById(img)
      const initialElement = document.getElementById(initial)
      const badgeElement = document.getElementById(badge)

      if (user.profilePhoto) {
        imgElement.src = `/${user.profilePhoto}`
        imgElement.classList.remove("hidden")
        initialElement.classList.add("hidden")
      } else {
        imgElement.classList.add("hidden")
        initialElement.classList.remove("hidden")
        initialElement.textContent = user.username.charAt(0).toUpperCase()
      }

      if (user.isPremium) {
        badgeElement.classList.remove("hidden")
      } else {
        badgeElement.classList.add("hidden")
      }
    })
  }

  function updateProfilePage(user) {
    // Update profile photo preview
    const profilePhotoPreview = document.getElementById("profilePhotoPreview")
    const profilePhotoPlaceholder = document.getElementById("profilePhotoPlaceholder")
    const profilePremiumBadge = document.getElementById("profilePremiumBadge")

    if (user.profilePhoto) {
      profilePhotoPreview.src = `/${user.profilePhoto}`
      profilePhotoPreview.classList.remove("hidden")
      profilePhotoPlaceholder.classList.add("hidden")
    } else {
      profilePhotoPreview.classList.add("hidden")
      profilePhotoPlaceholder.classList.remove("hidden")
    }

    if (user.isPremium) {
      profilePremiumBadge.classList.remove("hidden")
    } else {
      profilePremiumBadge.classList.add("hidden")
    }

    // Update profile form
    document.getElementById("profileUsername").value = user.username
    document.getElementById("profileEmail").value = user.email
    document.getElementById("profileMemberSince").value = new Date(user.createdAt).toLocaleDateString()

    const profileStatus = document.getElementById("profileStatus")
    profileStatus.textContent = user.isPremium ? "Premium" : "Free"
    profileStatus.className = `status-badge ${user.isPremium ? "premium" : "free"}`
  }

  function updateSubscriptionPage(user) {
    const currentPlanBadge = document.getElementById("currentPlanBadge")
    const subscriptionStatus = document.getElementById("subscriptionStatus")
    const daysLeft = document.getElementById("daysLeft")
    const daysLeftItem = document.getElementById("daysLeftItem")
    const subscriptionReceipts = document.getElementById("subscriptionReceipts")

    if (user.isPremium) {
      currentPlanBadge.textContent = "Premium Plan"
      currentPlanBadge.className = "plan-badge premium"
      subscriptionStatus.textContent = "Premium"
      daysLeft.textContent = user.subscriptionDaysLeft || 0
      daysLeftItem.style.display = "flex"
    } else {
      currentPlanBadge.textContent = "Free Plan"
      currentPlanBadge.className = "plan-badge free"
      subscriptionStatus.textContent = "Free"
      daysLeftItem.style.display = "none"
    }

    subscriptionReceipts.textContent = user.receiptsGenerated || 0
  }

  async function handleProfilePhotoUpload(event) {
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append("profilePhoto", file)

    try {
      const response = await fetch(`/api/user/${user.id}/profile-photo`, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        // Update local user data
        const updatedUser = result.user
        localStorage.setItem("user", JSON.stringify(updatedUser))

        // Update UI
        updateUserInterface(updatedUser)
        updateProfilePage(updatedUser)

        showNotification("Profile photo updated successfully!", "success")
      } else {
        showNotification(result.error || "Failed to upload photo", "error")
      }
    } catch (error) {
      console.error("Profile photo upload error:", error)
      showNotification("Network error. Please try again.", "error")
    }
  }

  async function deleteProfilePhoto() {
    try {
      const response = await fetch(`/api/user/${user.id}/profile-photo`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (response.ok) {
        // Update local user data
        const updatedUser = result.user
        localStorage.setItem("user", JSON.stringify(updatedUser))

        // Update UI
        updateUserInterface(updatedUser)
        updateProfilePage(updatedUser)

        showNotification("Profile photo deleted successfully!", "success")
      } else {
        showNotification(result.error || "Failed to delete photo", "error")
      }
    } catch (error) {
      console.error("Delete profile photo error:", error)
      showNotification("Network error. Please try again.", "error")
    }
  }

  function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item")

    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault()
        const page = item.dataset.page

        if (page === "create" && !user.isPremium) {
          showUpgradeModal()
          return
        }

        showPage(page)

        // Update active nav item
        navItems.forEach((nav) => nav.classList.remove("active"))
        item.classList.add("active")

        // Close mobile menu if open
        closeMobileMenu()
      })
    })
  }

  function showPage(pageId) {
    const pages = document.querySelectorAll(".page-content")
    pages.forEach((page) => page.classList.remove("active"))

    const targetPage = document.getElementById(`${pageId}Page`)
    if (targetPage) {
      targetPage.classList.add("active")
    }
  }

  function setupMobileMenu() {
    const hamburgerBtn = document.getElementById("hamburgerBtn")
    const sidebar = document.getElementById("sidebar")
    const sidebarOverlay = document.getElementById("sidebarOverlay")

    hamburgerBtn.addEventListener("click", () => {
      sidebar.classList.toggle("active")
      sidebarOverlay.classList.toggle("active")
      hamburgerBtn.classList.toggle("active")
    })

    sidebarOverlay.addEventListener("click", closeMobileMenu)
  }

  function closeMobileMenu() {
    const sidebar = document.getElementById("sidebar")
    const sidebarOverlay = document.getElementById("sidebarOverlay")
    const hamburgerBtn = document.getElementById("hamburgerBtn")

    sidebar.classList.remove("active")
    sidebarOverlay.classList.remove("active")
    hamburgerBtn.classList.remove("active")
  }

  function loadReceiptTypes() {
    const receiptGrid = document.getElementById("receiptGrid")

    receiptTypes.forEach((receipt) => {
      const card = document.createElement("div")
      card.className = "receipt-card"
      card.innerHTML = `
        <div class="receipt-card-header">
          <div class="receipt-icon">
            ${receipt.icon}
          </div>
          <div>
            <h3>${receipt.name}</h3>
            <p>${receipt.description}</p>
          </div>
        </div>
      `

      card.addEventListener("click", () => {
        if (!user.isPremium) {
          showUpgradeModal()
          return
        }

        // Special handling for bank transfer - direct redirect
        if (receipt.id === "bank-transfer") {
          window.open("https://paste-aza.vercel.app/form", "_blank")
          return
        }

        localStorage.setItem("selectedReceiptType", JSON.stringify(receipt))
        window.location.href = "/create-receipt"
      })

      receiptGrid.appendChild(card)
    })
  }

  function showUpgradeModal() {
    upgradeModal.classList.remove("hidden")
  }

  function logout() {
    localStorage.removeItem("user")
    localStorage.removeItem("isAdmin")
    window.location.href = "/auth"
  }

  function showNotification(message, type = "info") {
    const notification = document.getElementById("notification")
    notification.textContent = message
    notification.className = `notification ${type} show`

    setTimeout(() => {
      notification.classList.remove("show")
    }, 3000)
  }
})

// Receipt types configuration
const receiptTypes = [
  {
    id: "bank-transfer",
    name: "Bank Transfer",
    description: "Generate a bank transfer receipt",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    requiresAccountNumber: true,
    requiresWalletAddress: false,
  },
  {
    id: "credit-card",
    name: "Credit Card",
    description: "Generate a credit card payment receipt",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`,
    requiresAccountNumber: true,
    requiresWalletAddress: false,
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Generate a PayPal transfer receipt",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16.2 7.8l-2 8-2-8"></path><path d="M13.5 12h-3"></path><path d="M9.8 7.8l-2 8-2-8"></path></svg>`,
    requiresAccountNumber: false,
    requiresWalletAddress: false,
  },
  {
    id: "cash-app",
    name: "Cash App",
    description: "Generate a Cash App payment receipt",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>`,
    requiresAccountNumber: false,
    requiresWalletAddress: false,
  },
  {
    id: "bitcoin",
    name: "Bitcoin",
    description: "Generate a Bitcoin transaction receipt",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11.767 19.089c4.924.868 9.593-2.535 10.461-7.471.872-4.933-2.538-9.61-7.455-10.477-4.93-.867-9.598 2.535-10.466 7.472-.867 4.941 2.537 9.608 7.46 10.476z"></path><path d="M15.5 9.5c.828 0 1.5-.672 1.5-1.5 0-.829-.672-1.5-1.5-1.5s-1.5.671-1.5 1.5c0 .828.672 1.5 1.5 1.5z"></path></svg>`,
    requiresAccountNumber: false,
    requiresWalletAddress: true,
    currency: "BTC",
  },
  {
    id: "bank-of-america",
    name: "Bank of America",
    description: "Generate a Bank of America transfer receipt",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    requiresAccountNumber: true,
    requiresWalletAddress: false,
  },
  {
    id: "wells-fargo",
    name: "Wells Fargo",
    description: "Generate a Wells Fargo transfer receipt",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    requiresAccountNumber: true,
    requiresWalletAddress: false,
  },
  {
    id: "moneygram",
    name: "MoneyGram",
    description: "Generate a MoneyGram transfer receipt",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
    requiresAccountNumber: true,
    requiresWalletAddress: false,
  },
  {
    id: "gcash",
    name: "GCash",
    description: "Generate a GCash transfer receipt",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M12 12h.01"></path><path d="M17 12h.01"></path><path d="M7 12h.01"></path></svg>`,
    requiresAccountNumber: false,
    requiresWalletAddress: false,
    currency: "PHP",
  },
  {
    id: "coinbase",
    name: "Coinbase",
    description: "Generate a Coinbase transaction receipt",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16 12a4 4 0 0 1-8 0"></path></svg>`,
    requiresAccountNumber: false,
    requiresWalletAddress: true,
  },
  {
    id: "zelle",
    name: "Zelle",
    description: "Generate a Zelle payment receipt",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>`,
    requiresAccountNumber: false,
    requiresWalletAddress: false,
  },
  {
    id: "citi",
    name: "Citi Bank",
    description: "Generate a Citi Bank transfer receipt",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
    requiresAccountNumber: true,
    requiresWalletAddress: false,
  },
]
