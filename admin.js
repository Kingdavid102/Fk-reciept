document.addEventListener("DOMContentLoaded", () => {
  const tokenModal = document.getElementById("tokenModal")
  const adminDashboard = document.getElementById("adminDashboard")
  const tokenForm = document.getElementById("tokenForm")
  const tokenInput = document.getElementById("tokenInput")
  const tokenError = document.getElementById("tokenError")

  // Check if admin is already authenticated
  const isAdminAuthenticated = localStorage.getItem("adminAuthenticated")
  if (isAdminAuthenticated === "true") {
    showAdminDashboard()
  } else {
    showTokenModal()
  }

  // Token form submission
  tokenForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    const token = tokenInput.value.trim()

    try {
      const response = await fetch("/api/auth/admin-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        localStorage.setItem("adminAuthenticated", "true")
        tokenError.classList.remove("show")
        showAdminDashboard()
        showNotification("Admin access granted!", "success")
      } else {
        tokenError.classList.add("show")
        tokenInput.value = ""
        tokenInput.focus()
      }
    } catch (error) {
      console.error("Token verification error:", error)
      tokenError.textContent = "Network error. Please try again."
      tokenError.classList.add("show")
    }
  })

  function showTokenModal() {
    tokenModal.classList.remove("hidden")
    adminDashboard.classList.remove("show")
    tokenInput.focus()
  }

  function showAdminDashboard() {
    tokenModal.classList.add("hidden")
    adminDashboard.classList.add("show")
    initializeAdminDashboard()
  }

  function initializeAdminDashboard() {
    // Load initial data
    loadUsers()
    loadStats()

    // Event listeners
    document.getElementById("logoutBtn").addEventListener("click", logout)
    document.getElementById("refreshBtn").addEventListener("click", () => {
      loadUsers()
      loadStats()
    })
    document.getElementById("searchUsers").addEventListener("input", filterUsers)

    // Modal handlers
    const premiumTimerModal = document.getElementById("premiumTimerModal")
    const deleteModal = document.getElementById("deleteModal")
    const banModal = document.getElementById("banModal")
    const modalCloses = document.querySelectorAll(".modal-close")

    modalCloses.forEach((btn) => {
      btn.addEventListener("click", () => {
        premiumTimerModal.classList.add("hidden")
        deleteModal.classList.add("hidden")
        banModal.classList.add("hidden")
      })
    })

    // Close modals when clicking outside
    premiumTimerModal.addEventListener("click", (e) => {
      if (e.target === premiumTimerModal) {
        premiumTimerModal.classList.add("hidden")
      }
    })

    deleteModal.addEventListener("click", (e) => {
      if (e.target === deleteModal) {
        deleteModal.classList.add("hidden")
      }
    })

    banModal.addEventListener("click", (e) => {
      if (e.target === banModal) {
        banModal.classList.add("hidden")
      }
    })

    // Form handlers
    document.getElementById("premiumTimerForm").addEventListener("submit", handlePremiumTimer)
    document.getElementById("confirmDeleteBtn").addEventListener("click", handleDeleteUser)
    document.getElementById("confirmBanBtn").addEventListener("click", handleBanUser)

    // Premium duration change handler
    document.getElementById("premiumDuration").addEventListener("change", (e) => {
      const customDateGroup = document.getElementById("customDateGroup")
      if (e.target.value === "custom") {
        customDateGroup.classList.remove("hidden")
      } else {
        customDateGroup.classList.add("hidden")
      }
    })
  }

  let currentUserId = null
  let currentAction = null

  async function loadUsers() {
    try {
      const response = await fetch("/api/admin/users")
      const result = await response.json()

      if (response.ok) {
        displayUsers(result.users)
      } else {
        showNotification(result.error || "Failed to load users", "error")
      }
    } catch (error) {
      console.error("Load users error:", error)
      showNotification("Network error. Please try again.", "error")
    }
  }

  async function loadStats() {
    try {
      const response = await fetch("/api/admin/users")
      const result = await response.json()

      if (response.ok) {
        const users = result.users.filter((u) => !u.isAdmin) // Exclude admin from stats
        const totalUsers = users.length
        const premiumUsers = users.filter((u) => u.isPremium).length
        const activeUsers = users.filter((u) => u.isActive !== false).length
        const totalReceipts = users.reduce((sum, u) => sum + (u.receiptsGenerated || 0), 0)

        document.getElementById("totalUsers").textContent = totalUsers
        document.getElementById("premiumUsers").textContent = premiumUsers
        document.getElementById("activeUsers").textContent = activeUsers
        document.getElementById("totalReceipts").textContent = totalReceipts
      }
    } catch (error) {
      console.error("Load stats error:", error)
    }
  }

  function displayUsers(users) {
    const tbody = document.getElementById("usersTableBody")
    tbody.innerHTML = ""

    // Filter out admin users from display
    const regularUsers = users.filter((user) => !user.isAdmin)

    regularUsers.forEach((user) => {
      const row = document.createElement("tr")
      const isActive = user.isActive !== false
      const premiumExpiry = user.premiumExpiry ? new Date(user.premiumExpiry).toLocaleDateString() : "N/A"

      row.innerHTML = `
        <td>
          <div class="user-cell">
            <div class="user-cell-avatar">
              ${
                user.profilePhoto
                  ? `<img src="/${user.profilePhoto}" alt="${user.username}">`
                  : user.username.charAt(0).toUpperCase()
              }
            </div>
            <div class="user-cell-info">
              <div class="user-cell-name">${user.username}</div>
              <div class="user-cell-id">${user.id}</div>
            </div>
          </div>
        </td>
        <td>${user.email}</td>
        <td>
          <span class="status-badge ${user.isPremium ? "premium" : "free"}">
            ${user.isPremium ? "Premium" : "Free"}
          </span>
        </td>
        <td>${premiumExpiry}</td>
        <td>${user.receiptsGenerated || 0}</td>
        <td>
          <span class="status-badge ${isActive ? "active" : "banned"}">
            ${isActive ? "Active" : "Banned"}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            ${
              user.isPremium
                ? `<button class="action-btn downgrade" onclick="downgradePremium('${user.id}')">Downgrade</button>`
                : `<button class="action-btn upgrade" onclick="showPremiumModal('${user.id}')">Upgrade</button>`
            }
            <button class="action-btn timer" onclick="showPremiumModal('${user.id}')">Set Timer</button>
            <button class="action-btn ${isActive ? "ban" : "unban"}" onclick="showBanModal('${user.id}', ${isActive})">${isActive ? "Ban" : "Unban"}</button>
            <button class="action-btn delete" onclick="showDeleteModal('${user.id}')">Delete</button>
          </div>
        </td>
      `
      tbody.appendChild(row)
    })
  }

  function filterUsers() {
    const searchTerm = document.getElementById("searchUsers").value.toLowerCase()
    const rows = document.querySelectorAll("#usersTableBody tr")

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase()
      row.style.display = text.includes(searchTerm) ? "" : "none"
    })
  }

  window.showPremiumModal = (userId) => {
    currentUserId = userId
    currentAction = "premium"
    document.getElementById("premiumTimerModal").classList.remove("hidden")
  }

  window.showDeleteModal = (userId) => {
    currentUserId = userId
    currentAction = "delete"
    document.getElementById("deleteModal").classList.remove("hidden")
  }

  window.showBanModal = (userId, isActive) => {
    currentUserId = userId
    currentAction = isActive ? "ban" : "unban"
    const banModalText = document.getElementById("banModalText")
    const confirmBanBtn = document.getElementById("confirmBanBtn")

    if (isActive) {
      banModalText.textContent =
        "Are you sure you want to ban this user? They will not be able to access their account."
      confirmBanBtn.textContent = "Ban User"
      confirmBanBtn.className = "btn btn-warning"
    } else {
      banModalText.textContent = "Are you sure you want to unban this user? They will regain access to their account."
      confirmBanBtn.textContent = "Unban User"
      confirmBanBtn.className = "btn btn-primary"
    }

    document.getElementById("banModal").classList.remove("hidden")
  }

  async function handlePremiumTimer(e) {
    e.preventDefault()
    const formData = new FormData(e.target)
    const duration = formData.get("duration")
    const customDate = formData.get("customDate")

    try {
      const response = await fetch(`/api/admin/users/${currentUserId}/premium`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ duration, customDate }),
      })

      const result = await response.json()

      if (response.ok) {
        showNotification("Premium timer set successfully!", "success")
        document.getElementById("premiumTimerModal").classList.add("hidden")
        loadUsers()
        loadStats()
        // Reset form
        e.target.reset()
        document.getElementById("customDateGroup").classList.add("hidden")
      } else {
        showNotification(result.error || "Failed to set premium timer", "error")
      }
    } catch (error) {
      console.error("Premium timer error:", error)
      showNotification("Network error. Please try again.", "error")
    }
  }

  async function handleDeleteUser() {
    try {
      const response = await fetch(`/api/admin/users/${currentUserId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (response.ok) {
        showNotification("User deleted successfully!", "success")
        document.getElementById("deleteModal").classList.add("hidden")
        loadUsers()
        loadStats()
      } else {
        showNotification(result.error || "Failed to delete user", "error")
      }
    } catch (error) {
      console.error("Delete user error:", error)
      showNotification("Network error. Please try again.", "error")
    }
  }

  async function handleBanUser() {
    try {
      const response = await fetch(`/api/admin/users/${currentUserId}/ban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: currentAction }),
      })

      const result = await response.json()

      if (response.ok) {
        const actionText = currentAction === "ban" ? "banned" : "unbanned"
        showNotification(`User ${actionText} successfully!`, "success")
        document.getElementById("banModal").classList.add("hidden")
        loadUsers()
        loadStats()
      } else {
        showNotification(result.error || `Failed to ${currentAction} user`, "error")
      }
    } catch (error) {
      console.error(`${currentAction} user error:`, error)
      showNotification("Network error. Please try again.", "error")
    }
  }

  window.downgradePremium = async (userId) => {
    if (!confirm("Are you sure you want to downgrade this user?")) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/premium`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (response.ok) {
        showNotification("User downgraded successfully!", "success")
        loadUsers()
        loadStats()
      } else {
        showNotification(result.error || "Failed to downgrade user", "error")
      }
    } catch (error) {
      console.error("Downgrade error:", error)
      showNotification("Network error. Please try again.", "error")
    }
  }

  function logout() {
    localStorage.removeItem("adminAuthenticated")
    window.location.reload()
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
