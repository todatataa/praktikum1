// Hash password using Web Crypto API (SHA-256)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

// Generate a random token
function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Show, clear inline error message
function showError(message) {
  const errorEl = document.getElementById("form-error");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = "block";
  }
}

function clearError() {
  const errorEl = document.getElementById("form-error");
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }
}

// Show/hide organizer-only fields based on selected account type
function toggleOrganizerFields() {
  const isOrganizer = document.getElementById("type-organizer")?.checked;
  const fields = document.getElementById("organizer-fields");
  if (fields) {
    fields.style.display = isOrganizer ? "block" : "none";
  }
}

// Handle login submit
async function handleLogin(event) {
  event.preventDefault();
  clearError();

  const email = document
    .getElementById("email-address")
    .value.trim()
    .toLowerCase();
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("remember-me").checked;

  if (!email) {
    showError("Please enter your email address.");
    return;
  }

  if (!password) {
    showError("Please enter your password.");
    return;
  }

  const existingUsers = JSON.parse(localStorage.getItem("wo_users") || "[]");
  const user = existingUsers.find((u) => u.email === email);

  if (!user) {
    showError("No account found with this email address.");
    return;
  }

  const hashedInput = await hashPassword(password);
  if (hashedInput !== user.passwordHash) {
    showError("Incorrect password. Please try again.");
    return;
  }

  if (rememberMe) {
    localStorage.setItem("wo_remember_email", email);
  } else {
    localStorage.removeItem("wo_remember_email");
  }

  const session = {
    token: generateToken(),
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    userType: user.userType,
    loggedInAt: new Date().toISOString(),
  };
  localStorage.setItem("wo_session", JSON.stringify(session));
  window.location.href = "index.html";
}

window.addEventListener("DOMContentLoaded", () => {
  // Teammate's Auth element triggers
  const typeOrganizer = document.getElementById("type-organizer");
  const typeClient = document.getElementById("type-client");
  if (typeOrganizer && typeClient) {
    typeOrganizer.addEventListener("change", toggleOrganizerFields);
    typeClient.addEventListener("change", toggleOrganizerFields);
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Your Dynamic UI Render triggers
  if (
    window.location.pathname.endsWith("index.html") ||
    window.location.pathname === "/" ||
    window.location.pathname === ""
  ) {
    loadFeaturedOrganizers();
  }

  if (window.location.pathname.includes("profile-detail.html")) {
    loadOrganizerProfile();
  }
});

async function loadFeaturedOrganizers() {
  const grid = document.getElementById("featured-organizers-grid");
  if (!grid) return;

  try {
    const response = await fetch("/api/organizers");
    if (!response.ok) throw new Error("Failed to fetch data");
    const organizers = await response.json();

    const topFour = organizers.slice(0, 4);
    grid.innerHTML = "";

    topFour.forEach((org) => {
      const img =
        org.image_content ||
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";
      const category = org.tip_eventa ? org.tip_eventa.toUpperCase() : "EVENT";
      const stars =
        "★".repeat(Math.round(parseFloat(org.ocena) || 5)) +
        "☆".repeat(5 - Math.round(parseFloat(org.ocena) || 5));

      grid.innerHTML += `
            <article class="organizer-card group">
            <div class="h-52 relative bg-cream-dark overflow-hidden">
            <img src="${img}" class="w-full h-full object-cover" />
            <span class="card-badge">${category}</span>
            </div>
            <div class="p-6">
            <h3 class="font-display text-xl font-semibold text-navy">${org.ime} ${org.priimek}</h3>
            <p class="text-navy/50 text-xs tracking-wide mt-1">From ${org.cena_od || 0} EUR · ${org.city || "Slovenia"}</p>
            <div class="text-gold text-xs tracking-widest mt-2">${stars}</div>
            <a href="profile-detail.html?id=${org.id_organizator}" class="card-btn block mt-5 w-full py-2.5 text-xs tracking-widest uppercase text-center">
            View Profile
            </a>
            </div>
            </article>
            `;
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML =
      '<p class="text-center text-navy/40 col-span-4">Error loading data.</p>';
  }
}

async function loadOrganizerProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const organizerId = urlParams.get("id");

  if (!organizerId) {
    document.getElementById("profile-name").textContent = "Profile Not Found";
    return;
  }

  try {
    const response = await fetch(`/api/organizers/${organizerId}`);
    if (!response.ok) throw new Error("Failed to fetch profile");
    const data = await response.json();

    document.getElementById("profile-name").textContent =
      `${data.ime} ${data.priimek}`;
    document.getElementById("profile-location").textContent =
      data.city || "Location not specified";
    document.getElementById("profile-specialty").textContent = data.tip_eventa
      ? data.tip_eventa.toUpperCase()
      : "GENERAL";
    document.getElementById("profile-event-count").textContent =
      data.stevilo_eventov || "0";
    document.getElementById("profile-price").textContent = data.cena_od
      ? `${data.cena_od} EUR`
      : "On Request";
    document.getElementById("profile-email-btn").href = `mailto:${data.email}`;

    const ratingNum = parseFloat(data.ocena) || 5;
    document.getElementById("profile-rating").textContent =
      "★".repeat(Math.round(ratingNum)) + "☆".repeat(5 - Math.round(ratingNum));

    document.getElementById("profile-about").textContent =
      `Welcome to the portfolio of ${data.ime} ${data.priimek}. We host high-end ${data.tip_eventa || "events"} across ${data.city || "Slovenia"}, focusing on absolute premium execution and elite customer satisfaction.`;

    if (data.image_content) {
      document.getElementById("profile-img").src = data.image_content;
    }

    const portfolioEl = document.getElementById("profile-portfolio");
    if (data.portfolio) {
      portfolioEl.href = data.portfolio;
      portfolioEl.textContent = data.portfolio;
    } else {
      portfolioEl.textContent = "Not available";
      portfolioEl.removeAttribute("href");
    }
  } catch (err) {
    console.error(err);
    document.getElementById("profile-name").textContent =
      "Error loading profile details";
  }
}