// Create receipt page functionality
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"))
  const selectedReceipt = JSON.parse(localStorage.getItem("selectedReceiptType"))

  if (!user) {
    window.location.href = "/auth"
    return
  }

  if (!selectedReceipt) {
    window.location.href = "/dashboard"
    return
  }

  // Check if user is premium
  if (!user.isPremium) {
    showNotification("Premium subscription required to generate receipts", "error")
    setTimeout(() => {
      window.location.href = "/dashboard"
    }, 2000)
    return
  }

  // Initialize page
  initializePage()
  setupEventListeners()

  function initializePage() {
    // Update page title and form title
    document.getElementById("receiptTitle").textContent = `Create ${selectedReceipt.name} Receipt`
    document.getElementById("formTitle").textContent = `${selectedReceipt.name} Details`
    document.getElementById("receiptTypeBadge").textContent = selectedReceipt.name

    // Show/hide fields based on receipt type
    const accountNumberRow = document.getElementById("accountNumberRow")
    const walletAddressRow = document.getElementById("walletAddressRow")

    if (selectedReceipt.requiresAccountNumber) {
      accountNumberRow.style.display = "block"
    } else {
      accountNumberRow.style.display = "none"
    }

    if (selectedReceipt.requiresWalletAddress) {
      walletAddressRow.style.display = "block"
    } else {
      walletAddressRow.style.display = "none"
    }

    // Update currency symbol if needed
    const currencySymbol = document.querySelector(".currency-symbol")
    if (selectedReceipt.currency === "BTC") {
      currencySymbol.textContent = "₿"
    } else if (selectedReceipt.currency === "PHP") {
      currencySymbol.textContent = "₱"
    } else {
      currencySymbol.textContent = "$"
    }
  }

  function setupEventListeners() {
    document.getElementById("backBtn").addEventListener("click", () => {
      window.location.href = "/dashboard"
    })

    document.getElementById("previewBtn").addEventListener("click", togglePreview)
    document.getElementById("receiptForm").addEventListener("submit", generateReceipt)
    document.getElementById("downloadBtn").addEventListener("click", downloadReceipt)

    // Real-time preview updates
    const formInputs = document.querySelectorAll("#receiptForm input, #receiptForm select, #receiptForm textarea")
    formInputs.forEach((input) => {
      input.addEventListener("input", updatePreview)
    })
  }

  function togglePreview() {
    const previewSection = document.getElementById("previewSection")
    const isVisible = previewSection.style.display !== "none"

    if (isVisible) {
      previewSection.style.display = "none"
    } else {
      previewSection.style.display = "block"
      updatePreview()
    }
  }

  function updatePreview() {
    const formData = getFormData()
    const receiptHTML = generateReceiptHTML(formData)
    document.getElementById("actualReceipt").innerHTML = receiptHTML
  }

  async function generateReceipt(e) {
    e.preventDefault()

    const formData = getFormData()
    const receiptHTML = generateReceiptHTML(formData)

    try {
      // Call API to save receipt and increment count
      const response = await fetch("/api/receipts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          receiptData: formData,
          receiptHtml: receiptHTML,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        showNotification("Receipt generated successfully!", "success")

        // Update local user data
        user.receiptsGenerated = result.receiptsGenerated
        localStorage.setItem("user", JSON.stringify(user))

        // Show preview with download link
        document.getElementById("previewSection").style.display = "block"
        document.getElementById("actualReceipt").innerHTML = receiptHTML

        // Add download link section
        const downloadSection = document.createElement("div")
        downloadSection.className = "download-section"
        downloadSection.innerHTML = `
          <h3>Share Your Receipt</h3>
          <div class="download-link-container">
            <input type="text" id="receipt-link" value="${window.location.origin}${result.receiptLink}" readonly>
            <button id="copy-link" class="btn-primary">Copy Link</button>
          </div>
          <a href="${result.receiptLink}" target="_blank" class="btn-primary">View Receipt</a>
        `

        document.getElementById("actualReceipt").appendChild(downloadSection)

        // Add copy functionality
        document.getElementById("copy-link").addEventListener("click", function () {
          const linkInput = document.getElementById("receipt-link")
          linkInput.select()
          document.execCommand("copy")
          this.textContent = "Copied!"
          setTimeout(() => {
            this.textContent = "Copy Link"
          }, 2000)
        })
      } else {
        const result = await response.json()
        showNotification(result.error || "Failed to generate receipt", "error")

        if (response.status === 403) {
          setTimeout(() => {
            window.location.href = "/dashboard"
          }, 2000)
        }
      }
    } catch (error) {
      console.error("Generate receipt error:", error)
      showNotification("Network error. Please try again.", "error")
    }
  }

  function getFormData() {
    return {
      recipientName: document.getElementById("recipientName").value || "Emmy",
      accountNumber: document.getElementById("accountNumber").value || "7777",
      walletAddress: document.getElementById("walletAddress").value || "",
      amount: document.getElementById("amount").value || "5000",
      status: document.getElementById("status").value || "failed",
      note: document.getElementById("note").value || "",
      receiptType: selectedReceipt,
    }
  }

  function generateReceiptHTML(formData) {
    const { receiptType, status } = formData
    const confirmationNumber = generateConfirmationNumber()
    const currentDate = new Date().toLocaleDateString()

    // Generate receipt based on type
    switch (receiptType.id) {
      case "credit-card":
        return generateCreditCardReceipt(formData, confirmationNumber)
      case "paypal":
        return generatePayPalReceipt(formData, confirmationNumber)
      case "zelle":
        return generateZelleReceipt(formData, confirmationNumber)
      case "bank-of-america":
        return generateBankOfAmericaReceipt(formData, confirmationNumber)
      case "citi":
        return generateCitiReceipt(formData, confirmationNumber)
      case "cash-app":
        return generateCashAppReceipt(formData, confirmationNumber)
      case "bitcoin":
        return generateBitcoinReceipt(formData, confirmationNumber)
      case "coinbase":
        return generateCoinbaseReceipt(formData, confirmationNumber)
      case "gcash":
        return generateGCashReceipt(formData, confirmationNumber)
      case "moneygram":
        return generateMoneygramReceipt(formData, confirmationNumber, currentDate)
      case "wells-fargo":
        return generateWellsFargoReceipt(formData, confirmationNumber, currentDate)
      default:
        return generateGenericReceipt(formData, confirmationNumber, currentDate)
    }
  }

  function generateCreditCardReceipt(formData, confirmationNumber) {
    const statusText =
      formData.status === "successful"
        ? "Payment Successful"
        : formData.status === "pending"
          ? "Payment Pending"
          : "Payment Failed"

    return `
      <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
        <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">${statusText}</h3>
        <div style="font-size: 1.5rem; font-weight: bold; margin: 15px 0; color: #1a1a1a;">
          $${formData.amount}
        </div>
        <div style="text-align: left; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">To:</span>
            <span style="font-weight: 600;">${formData.recipientName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Transaction ID:</span>
            <span style="font-weight: 600;">${confirmationNumber}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Card:</span>
            <span style="font-weight: 600;">****${formData.accountNumber.slice(-4)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Merchant:</span>
            <span style="font-weight: 600;">${formData.recipientName}</span>
          </div>
        </div>
        ${formData.note ? `<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; color: #666;">${formData.note}</div>` : ""}
      </div>
    `
  }

  function generatePayPalReceipt(formData, confirmationNumber) {
    return `
      <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
        <div style="margin-bottom: 20px;">
          <svg viewBox="0 0 124 33" width="100" style="fill: #003087;">
            <path d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.97-1.142-2.694-1.746-4.985-1.746z"/>
          </svg>
        </div>
        <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">You sent $${formData.amount} to ${formData.recipientName}</h3>
        <div style="text-align: left; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">sent from account ending in ${formData.accountNumber ? formData.accountNumber.slice(-4) : "5789"}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">to ${formData.recipientName.split("@")[0] || formData.recipientName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Confirmation:</span>
            <span style="font-weight: 600;">${confirmationNumber.toLowerCase()}</span>
          </div>
        </div>
        <div style="margin: 20px 0;">
          <button style="background: #f0f0f0; border: 1px solid #ccc; padding: 8px 16px; border-radius: 4px; margin-right: 10px;">View balance</button>
          <button style="background: #f0f0f0; border: 1px solid #ccc; padding: 8px 16px; border-radius: 4px; margin-right: 10px;">Back</button>
          <button style="background: #f0f0f0; border: 1px solid #ccc; padding: 8px 16px; border-radius: 4px;">Done</button>
        </div>
        ${formData.note ? `<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; color: #666;">${formData.note}</div>` : ""}
      </div>
    `
  }

  function generateZelleReceipt(formData, confirmationNumber) {
    let statusMessage = ""
    if (formData.status === "successful") {
      statusMessage = `Your payment of $${formData.amount} to ${formData.recipientName} was sent.`
    } else if (formData.status === "pending") {
      statusMessage = `We haven't processed your payment yet. Please check back later to confirm when ${formData.recipientName} will receive your money.`
    } else {
      statusMessage = `Your payment of $${formData.amount} to ${formData.recipientName} was rejected.`
    }

    return `
      <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
        <div style="width: 60px; height: 60px; background: ${formData.status === "successful" ? "#dcfce7" : formData.status === "pending" ? "#fef3c7" : "#fef2f2"}; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; color: ${formData.status === "successful" ? "#16a34a" : formData.status === "pending" ? "#d97706" : "#dc2626"};">
          ${formData.status === "successful" ? "✓" : formData.status === "pending" ? "⏱" : "✗"}
        </div>
        <h3 style="margin: 15px 0; font-size: 1.1rem; color: #1a1a1a;">
          ${statusMessage}
        </h3>
        <div style="font-size: 2rem; font-weight: bold; margin: 15px 0; color: #1a1a1a;">$${formData.amount}</div>
        <div style="margin: 20px 0;">
          <div style="width: 60px; height: 60px; background: #f0f0f0; border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; color: #666;">
            ${formData.recipientName.charAt(0).toUpperCase()}
          </div>
          <div style="font-weight: 500; color: #1a1a1a;">${formData.recipientName}</div>
        </div>
        ${formData.note ? `<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; color: #666;">${formData.note}</div>` : ""}
      </div>
    `
  }

  function generateBankOfAmericaReceipt(formData, confirmationNumber) {
    return `
      <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
        <div style="margin-bottom: 20px;">
          <img src="emmy.png" alt="Bank of America" style="max-width: 150px; height: auto;">
        </div>
        <div style="margin: 20px 0;">
          <div style="width: 80px; height: 80px; background: #e8f5e8; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
            <img src="thumb.png" alt="Success" style="width: 40px; height: 40px;">
          </div>
        </div>
        <h3 style="margin: 15px 0; color: #1a1a1a;">
          You sent $${formData.amount} to ${formData.recipientName}
        </h3>
        <div style="text-align: left; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">From Account:</span>
            <span style="font-weight: 600;">****${formData.accountNumber ? formData.accountNumber.slice(-4) : "5789"}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Confirmation:</span>
            <span style="font-weight: 600;">${confirmationNumber.toLowerCase()}</span>
          </div>
        </div>
        ${formData.note ? `<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; color: #666;">${formData.note}</div>` : ""}
      </div>
    `
  }

  function generateCitiReceipt(formData, confirmationNumber) {
    return `
      <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
        <div style="width: 60px; height: 60px; background: #dcfce7; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; color: #16a34a;">
          ✓
        </div>
        <h2 style="margin: 15px 0; color: #056dae; font-size: 1.5rem;">Success!</h2>
        <p style="color: #666; margin-bottom: 10px;">You're sending</p>
        <div style="font-size: 2rem; font-weight: bold; margin: 15px 0; color: #056dae;">$${formData.amount}</div>
        <div style="text-align: left; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Reference Number:</span>
            <span style="font-weight: 600;">${confirmationNumber}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Recipient:</span>
            <span style="font-weight: 600;">${formData.recipientName}</span>
          </div>
        </div>
        <div style="margin: 20px 0;">
          <img src="citi.png" alt="Citi" style="max-width: 100px; height: auto;">
        </div>
        <p style="font-size: 0.875rem; color: #666; margin-top: 15px;">
          Your transaction is in progress and will be reviewed for processing.
        </p>
        ${formData.note ? `<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; color: #666;">${formData.note}</div>` : ""}
      </div>
    `
  }

  function generateCashAppReceipt(formData, confirmationNumber) {
    return `
      <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
        <div style="width: 60px; height: 60px; background: #dcfce7; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; color: #16a34a;">
          ✓
        </div>
        <h3 style="margin: 15px 0; color: #1a1a1a;">
          You sent $${formData.amount}
        </h3>
        <p style="color: #666; margin-bottom: 20px;">
          to ${formData.recipientName}
        </p>
        ${formData.note ? `<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; color: #666;">${formData.note}</div>` : ""}
      </div>
    `
  }

  function generateBitcoinReceipt(formData, confirmationNumber) {
    return `
      <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
        <div style="margin-bottom: 20px;">
          <svg viewBox="0 0 24 24" fill="#F7931A" width="48" height="48">
            <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002z"/>
          </svg>
        </div>
        <h3 style="margin: 15px 0; color: #1a1a1a;">
          ${formData.amount} BTC Sent
        </h3>
        <p style="color: #666; margin-bottom: 20px;">
          Your Bitcoin has been successfully sent.
        </p>
        ${
          formData.walletAddress
            ? `
        <div style="text-align: left; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Wallet Address:</span>
            <span style="font-weight: 600; word-break: break-all; font-size: 0.75rem;">${formData.walletAddress}</span>
          </div>
        </div>
        `
            : ""
        }
        ${formData.note ? `<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; color: #666;">${formData.note}</div>` : ""}
      </div>
    `
  }

  function generateCoinbaseReceipt(formData, confirmationNumber) {
    return `
      <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
        <div style="margin-bottom: 20px;">
          <svg viewBox="0 0 24 24" width="32" height="32">
            <circle cx="12" cy="12" r="10" fill="#0052FF"/>
            <path d="M12 17.5c-3.04 0-5.5-2.46-5.5-5.5s2.46-5.5 5.5-5.5 5.5 2.46 5.5 5.5-2.46 5.5-5.5 5.5z" fill="white"/>
          </svg>
        </div>
        <h3 style="margin: 15px 0; color: #1a1a1a; text-transform: capitalize;">
          ${formData.status}!
        </h3>
        <p style="color: #666; margin-bottom: 10px;">You're sending</p>
        <div style="font-size: 2rem; font-weight: bold; margin: 15px 0; color: #1a1a1a;">$${formData.amount}</div>
        <div style="text-align: left; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Reference Number:</span>
            <span style="font-weight: 600;">${confirmationNumber}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Recipient:</span>
            <span style="font-weight: 600;">${formData.recipientName}</span>
          </div>
        </div>
        ${formData.note ? `<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; color: #666;">${formData.note}</div>` : ""}
      </div>
    `
  }

  function generateGCashReceipt(formData, confirmationNumber) {
    return `
      <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
        <div style="width: 60px; height: 60px; background: #dcfce7; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; color: #16a34a;">
          ✓
        </div>
        <div style="margin: 20px 0;">
          <div style="font-size: 1.25rem; font-weight: bold; color: #1a1a1a; margin-bottom: 5px;">
            ${confirmationNumber}
          </div>
          <div style="color: #666; font-size: 0.875rem;">Sent via GCash</div>
        </div>
        <div style="text-align: left; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Amount:</span>
            <span style="font-weight: 600;">₱${formData.amount}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Sender:</span>
            <span style="font-weight: 600;">${formData.recipientName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Ref No.:</span>
            <span style="font-weight: 600;">${confirmationNumber}</span>
          </div>
        </div>
        ${formData.note ? `<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; color: #666;">${formData.note}</div>` : ""}
      </div>
    `
  }

  function generateMoneygramReceipt(formData, confirmationNumber, currentDate) {
    return `
      <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
        <h3 style="margin: 15px 0; color: #1a1a1a;">
          Money from ${formData.recipientName} is on the way!
        </h3>
        <div style="text-align: left; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">REFERENCE NO.:</span>
            <span style="font-weight: 600;">${confirmationNumber}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">SENT TO:</span>
            <span style="font-weight: 600;">${formData.recipientName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">AMOUNT:</span>
            <span style="font-weight: 600;">$${formData.amount}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">DATE:</span>
            <span style="font-weight: 600;">${currentDate}</span>
          </div>
        </div>
        ${formData.note ? `<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; color: #666;">${formData.note}</div>` : ""}
      </div>
    `
  }

  function generateWellsFargoReceipt(formData, confirmationNumber, currentDate) {
    const statusText =
      formData.status === "successful"
        ? "Your transaction has been made"
        : formData.status === "pending"
          ? "Your transaction is pending"
          : "Your transaction failed"

    return `
      <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="margin: 15px 0; color: #d71e2b; font-size: 1.25rem;">WELLS FARGO</h2>
        <h3 style="margin: 15px 0; color: #1a1a1a;">Confirmation</h3>
        <div style="width: 60px; height: 60px; background: #dcfce7; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; color: #16a34a;">
          ✓
        </div>
        <p style="color: #666; margin: 15px 0;">
          ${statusText} on ${currentDate}
        </p>
        <div style="text-align: left; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">From:</span>
            <span style="font-weight: 600;">****${formData.accountNumber ? formData.accountNumber.slice(-4) : "4954"}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">To:</span>
            <span style="font-weight: 600;">${formData.recipientName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Amount:</span>
            <span style="font-weight: 600;">$${formData.amount}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Confirmation:</span>
            <span style="font-weight: 600;">${confirmationNumber}</span>
          </div>
        </div>
        ${formData.note ? `<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; color: #666;">${formData.note}</div>` : ""}
      </div>
    `
  }

  function generateGenericReceipt(formData, confirmationNumber, currentDate) {
    const statusText =
      formData.status === "successful" ? "Successfully sent" : formData.status === "pending" ? "Pending" : "Failed"

    return `
      <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
        <div style="width: 60px; height: 60px; background: ${formData.status === "successful" ? "#dcfce7" : formData.status === "pending" ? "#fef3c7" : "#fef2f2"}; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; color: ${formData.status === "successful" ? "#16a34a" : formData.status === "pending" ? "#d97706" : "#dc2626"};">
          ${formData.status === "successful" ? "✓" : formData.status === "pending" ? "⏱" : "✗"}
        </div>
        <h3 style="margin: 15px 0; color: #1a1a1a; text-transform: capitalize;">
          ${statusText}
        </h3>
        <div style="font-size: 2rem; font-weight: bold; margin: 15px 0; color: #1a1a1a;">$${formData.amount}</div>
        <div style="text-align: left; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">To:</span>
            <span style="font-weight: 600;">${formData.recipientName}</span>
          </div>
          ${
            formData.accountNumber
              ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Account:</span>
            <span style="font-weight: 600;">•••• ${formData.accountNumber.slice(-4)}</span>
          </div>
          `
              : ""
          }
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Date:</span>
            <span style="font-weight: 600;">${currentDate}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666;">Confirmation #:</span>
            <span style="font-weight: 600;">${confirmationNumber}</span>
          </div>
        </div>
        ${formData.note ? `<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 0.875rem; color: #666;">${formData.note}</div>` : ""}
      </div>
    `
  }

  function generateConfirmationNumber() {
    return Math.random().toString(36).substring(2, 10).toUpperCase()
  }

  function downloadReceipt() {
    // Create a new window with the receipt content
    const receiptContent = document.getElementById("actualReceipt").innerHTML
    const printWindow = window.open("", "_blank")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${selectedReceipt.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
          }
          .receipt-content {
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
            border: 2px solid #4f46e5;
            border-radius: 8px;
            background: white;
          }
          @media print {
            body { margin: 0; }
            .receipt-content { border: none; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-content">
          ${receiptContent}
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }
        </script>
      </body>
      </html>
    `)

    printWindow.document.close()
  }

  function showNotification(message, type = "info") {
    const notification = document.getElementById("notification")
    notification.textContent = message
    notification.className = `notification ${type} show`

    setTimeout(() => {
      notification.classList.remove("show")
    }, 3000)
  }

  // Add this CSS to the existing styles
  const additionalStyles = `
  .download-section {
    margin-top: 2rem;
    padding: 1.5rem;
    background: #f8fafc;
    border-radius: 8px;
    text-align: center;
    border-top: 1px solid #e5e7eb;
  }
  
  .download-section h3 {
    margin-bottom: 1rem;
    color: #374151;
    font-size: 1.125rem;
    font-weight: 600;
  }
  
  .download-link-container {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    align-items: center;
  }
  
  .download-link-container input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    background: white;
  }
  
  .download-link-container button {
    white-space: nowrap;
    padding: 0.5rem 1rem;
  }
  
  @media (max-width: 480px) {
    .download-link-container {
      flex-direction: column;
    }
    
    .download-link-container input {
      margin-bottom: 0.5rem;
    }
  }
`

  // Create and append style element
  const styleElement = document.createElement("style")
  styleElement.textContent = additionalStyles
  document.head.appendChild(styleElement)
})
