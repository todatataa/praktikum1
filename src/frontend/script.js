// ============================================================
//  White Orchid Events — shared script
//  Used by: register.html, login.html, forgot-password.html
// ============================================================

// --- Hash password using Web Crypto API (SHA-256) ---
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

// --- Generate a random token ---
function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// --- Show / clear inline error message ---
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

// ============================================================
//  NAV — prikaži avatar ali Login/Register glede na sejo
// ============================================================

function handleLogout() {
  localStorage.removeItem("wo_session");
  window.location.href = "index.html";
}

function updateNav() {
  const navAuth = document.getElementById("nav-auth");
  if (!navAuth) return;

  const session = JSON.parse(localStorage.getItem("wo_session") || "null");

  if (session && session.token) {
    const initials =
      (session.firstName ? session.firstName[0] : "") +
      (session.lastName ? session.lastName[0] : "");

    const profileUrl =
      session.userType === "organizer" && session.organizerId
        ? `profile-detail.html?id=${session.organizerId}`
        : "profile-detail.html";

    navAuth.style.position = "relative";
    navAuth.innerHTML = `
      <div style="position:relative;">
        <button id="nav-avatar-btn"
          title="${session.firstName} ${session.lastName}"
          style="width:40px;height:40px;border-radius:50%;background:var(--gold);color:var(--navy);display:flex;align-items:center;justify-content:center;font-family:'Jost',sans-serif;font-weight:600;font-size:0.85rem;letter-spacing:0.05em;border:2px solid var(--gold);cursor:pointer;transition:background 0.3s;"
          onmouseover="this.style.background='var(--gold-dark)'"
          onmouseout="this.style.background='var(--gold)'">
          ${initials.toUpperCase()}
        </button>
        <div id="nav-dropdown"
          style="display:none;position:absolute;right:0;top:48px;background:white;border:1px solid rgba(13,27,42,0.1);box-shadow:0 8px 24px rgba(13,27,42,0.12);min-width:160px;z-index:100;">
          ${
            session.userType === "organizer" && session.organizerId
              ? `
          <a href="${profileUrl}"
            style="display:block;padding:0.75rem 1rem;font-family:'Jost',sans-serif;font-size:0.82rem;color:var(--navy);text-decoration:none;border-bottom:1px solid rgba(13,27,42,0.07);"
            onmouseover="this.style.background='#FAFAF7'"
            onmouseout="this.style.background='white'">
            My Profile
          </a>`
              : ""
          }
          <button onclick="handleLogout()"
            style="display:block;width:100%;text-align:left;padding:0.75rem 1rem;font-family:'Jost',sans-serif;font-size:0.82rem;color:var(--navy);background:none;border:none;cursor:pointer;"
            onmouseover="this.style.background='#FAFAF7'"
            onmouseout="this.style.background='white'">
            Log Out
          </button>
        </div>
      </div>
    `;

    document.getElementById("nav-avatar-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const dropdown = document.getElementById("nav-dropdown");
      dropdown.style.display =
        dropdown.style.display === "none" ? "block" : "none";
    });

    document.addEventListener("click", () => {
      const dropdown = document.getElementById("nav-dropdown");
      if (dropdown) dropdown.style.display = "none";
    });
  }
}

// ============================================================
//  SEED — obstoječi organizatorji iz initPostgre.sql
// ============================================================

const SEED_ORGANIZERS = [
  { id_organizator: 1, email: "info@elegantevents.si", geslo: "orgpw1", ime: "Maja", priimek: "Kovač" },
  { id_organizator: 2, email: "kontakt@zabave.si", geslo: "orgpw2", ime: "Luka", priimek: "Zupan" },
  { id_organizator: 3, email: "sara@konference.si", geslo: "orgpw3", ime: "Sara", priimek: "Benko" },
  { id_organizator: 4, email: "rok@soundstage.si", geslo: "orgpw4", ime: "Rok", priimek: "Petrovič" },
  { id_organizator: 5, email: "nina@festivali.si", geslo: "orgpw5", ime: "Nina", priimek: "Leban" },
  { id_organizator: 6, email: "tadej@teamup.si", geslo: "orgpw6", ime: "Tadej", priimek: "Zorko" },
  { id_organizator: 7, email: "eva@galaveceri.si", geslo: "orgpw7", ime: "Eva", priimek: "Mohorič" },
  { id_organizator: 8, email: "gregor@corporate.si", geslo: "orgpw8", ime: "Gregor", priimek: "Šuštar" },
  { id_organizator: 9, email: "katja@weddings.si", geslo: "orgpw9", ime: "Katja", priimek: "Fišer" },
  { id_organizator: 10, email: "blaz@openair.si", geslo: "orgpw10", ime: "Blaž", priimek: "Medved" },
  { id_organizator: 11, email: "urska@sladkisvet.si", geslo: "orgpw11", ime: "Urška", priimek: "Tomažič" },
  { id_organizator: 12, email: "andrej@poslovni.si", geslo: "orgpw12", ime: "Andrej", priimek: "Pregl" },
];

async function initSeedUsers() {
  if (localStorage.getItem("wo_seed_done")) return;
  const existing = JSON.parse(localStorage.getItem("wo_users") || "[]");
  for (const org of SEED_ORGANIZERS) {
    const alreadyExists = existing.some((u) => u.email === org.email);
    if (!alreadyExists) {
      const hashedPassword = await hashPassword(org.geslo);
      existing.push({
        id: String(org.id_organizator),
        organizerId: org.id_organizator,
        firstName: org.ime,
        lastName: org.priimek,
        email: org.email,
        passwordHash: hashedPassword,
        userType: "organizer",
        createdAt: new Date().toISOString(),
      });
    }
  }
  localStorage.setItem("wo_users", JSON.stringify(existing));
  localStorage.setItem("wo_seed_done", "true");
}

// ============================================================
//  REGISTER
// ============================================================

function toggleOrganizerFields() {
  const isOrganizer = document.getElementById("type-organizer")?.checked;
  const fields = document.getElementById("organizer-fields");
  if (fields) {
    fields.style.display = isOrganizer ? "block" : "none";
  }
}

async function handleRegister() {
  clearError();

  const firstName = document.getElementById("first-name").value.trim();
  const lastName = document.getElementById("last-name").value.trim();
  const email = document.getElementById("email-address").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const userType = document.querySelector('input[name="user-type"]:checked').value;

  if (!firstName || !lastName) {
    showError("Please enter your first and last name.");
    return;
  }
  if (!email) {
    showError("Please enter your email address.");
    return;
  }
  if (password.length < 8) {
    showError("Password must be at least 8 characters long.");
    return;
  }
  if (password !== confirmPassword) {
    showError("Passwords do not match. Please try again.");
    return;
  }

  const existingUsers = JSON.parse(localStorage.getItem("wo_users") || "[]");
  if (existingUsers.some((u) => u.email === email)) {
    showError("An account with this email address already exists.");
    return;
  }

  let location = "";
  let telephone = "";
  let eventTypes = [];

  if (userType === "organizer") {
    location = document.getElementById("location").value.trim();
    telephone = document.getElementById("telephone").value.trim();
    const checkedBoxes = document.querySelectorAll('input[name="event-types"]:checked');
    eventTypes = Array.from(checkedBoxes).map((cb) => cb.value);
    if (!location) {
      showError("Please enter your location.");
      return;
    }
    if (eventTypes.length === 0) {
      showError("Please select at least one event type.");
      return;
    }
  }

  const hashedPassword = await hashPassword(password);
  const tipEventa = eventTypes.join(", ");

  if (userType === "organizer") {
    try {
      const response = await fetch("/api/organizers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ime: firstName,
          priimek: lastName,
          email: email,
          geslo: hashedPassword,
          city: location,
          telefon: telephone || null,
          tip_eventa: tipEventa,
        }),
      });

      if (response.status === 409) {
        showError("An account with this email address already exists.");
        return;
      }
      if (!response.ok) {
        const err = await response.json();
        showError("Registration failed: " + (err.error || "Unknown error"));
        return;
      }

      const data = await response.json();
      const newOrganizerId = data.id_organizator;

      existingUsers.push({
        id: String(newOrganizerId),
        organizerId: newOrganizerId,
        firstName,
        lastName,
        email,
        passwordHash: hashedPassword,
        userType: "organizer",
        location,
        telephone,
        eventType: tipEventa,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("wo_users", JSON.stringify(existingUsers));
    } catch (err) {
      showError("Could not connect to server. Please try again.");
      return;
    }
  } else {
    // CLIENT - Popravljen endpoint: /api/client (ne /api/clients)
    let clientDbId = null;
    try {
      const response = await fetch("/api/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ime: firstName,
          priimek: lastName,
          email: email,
          geslo: hashedPassword,
        }),
      });

      if (response.status === 409) {
        showError("An account with this email address already exists.");
        return;
      }
      if (!response.ok) {
        const err = await response.json();
        showError("Registration failed: " + (err.error || "Unknown error"));
        return;
      }

      const data = await response.json();
      clientDbId = data.id_client;

      existingUsers.push({
        id: generateToken(),
        organizerId: null,
        clientDbId: clientDbId,
        firstName,
        lastName,
        email,
        passwordHash: hashedPassword,
        userType: "client",
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("wo_users", JSON.stringify(existingUsers));
    } catch (err) {
      showError("Could not connect to server. Please try again.");
      return;
    }
  }

  alert("Account successfully created! You can now log in.");
  window.location.href = "login.html";
}

// ============================================================
//  FORGOT PASSWORD
// ============================================================

async function handleResetPassword() {
  const errorEl = document.getElementById("form-error");
  const successEl = document.getElementById("form-success");

  errorEl.style.display = "none";
  errorEl.textContent = "";
  successEl.style.display = "none";
  successEl.textContent = "";

  const email = document.getElementById("email-address").value.trim().toLowerCase();
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!email) {
    errorEl.textContent = "Please enter your email address.";
    errorEl.style.display = "block";
    return;
  }
  if (newPassword.length < 8) {
    errorEl.textContent = "New password must be at least 8 characters long.";
    errorEl.style.display = "block";
    return;
  }
  if (newPassword !== confirmPassword) {
    errorEl.textContent = "Passwords do not match. Please try again.";
    errorEl.style.display = "block";
    return;
  }

  const existingUsers = JSON.parse(localStorage.getItem("wo_users") || "[]");
  const userIndex = existingUsers.findIndex((u) => u.email === email);

  if (userIndex === -1) {
    errorEl.textContent = "No account found with this email address.";
    errorEl.style.display = "block";
    return;
  }

  const newHashedPassword = await hashPassword(newPassword);
  if (newHashedPassword === existingUsers[userIndex].passwordHash) {
    errorEl.textContent = "New password cannot be the same as your current password.";
    errorEl.style.display = "block";
    return;
  }

  existingUsers[userIndex].passwordHash = newHashedPassword;
  localStorage.setItem("wo_users", JSON.stringify(existingUsers));

  successEl.textContent = "Password successfully updated! Redirecting to log in...";
  successEl.style.display = "block";
  setTimeout(() => {
    window.location.href = "login.html";
  }, 2000);
}

// ============================================================
//  LOGIN
// ============================================================

async function handleLogin(event) {
  if (event) event.preventDefault();
  clearError();

  const email = document.getElementById("email-address").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("remember-me")?.checked || false;

  if (!email) {
    showError("Please enter your email address.");
    return;
  }
  if (!password) {
    showError("Please enter your password.");
    return;
  }

  const hashedInput = await hashPassword(password);

  let userFromDb = null;
  try {
    const resp = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        passwordHash: hashedInput,
        plainPassword: password,
      }),
    });

    if (resp.ok) {
      userFromDb = await resp.json();
    } else if (resp.status === 401) {
      showError("Incorrect password. Please try again.");
      return;
    } else if (resp.status === 404) {
      userFromDb = null;
    } else {
      showError("Server error. Please try again.");
      return;
    }
  } catch {
    userFromDb = null;
  }

  if (!userFromDb) {
    const existingUsers = JSON.parse(localStorage.getItem("wo_users") || "[]");
    const user = existingUsers.find((u) => u.email === email);
    if (!user) {
      showError("No account found with this email address.");
      return;
    }
    if (hashedInput !== user.passwordHash) {
      showError("Incorrect password. Please try again.");
      return;
    }
    userFromDb = {
      userType: user.userType,
      id: user.id,
      organizerId: user.organizerId || null,
      clientDbId: user.clientDbId || null,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  }

  if (rememberMe) {
    localStorage.setItem("wo_remember_email", email);
  } else {
    localStorage.removeItem("wo_remember_email");
  }

  const session = {
    token: generateToken(),
    userId: userFromDb.id,
    organizerId: userFromDb.organizerId || null,
    clientDbId: userFromDb.clientDbId || null,
    email: userFromDb.email,
    firstName: userFromDb.firstName,
    lastName: userFromDb.lastName,
    userType: userFromDb.userType,
    loggedInAt: new Date().toISOString(),
  };
  localStorage.setItem("wo_session", JSON.stringify(session));
  window.location.href = "index.html";
}

// ============================================================
//  DOMContentLoaded
// ============================================================

window.addEventListener("DOMContentLoaded", async () => {
  await initSeedUsers();
  updateNav();

  const remembered = localStorage.getItem("wo_remember_email");
  if (remembered && document.getElementById("email-address")) {
    document.getElementById("email-address").value = remembered;
    const rememberCheckbox = document.getElementById("remember-me");
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  const loginForm = document.getElementById("loginForm") || document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  const typeOrganizer = document.getElementById("type-organizer");
  const typeClient = document.getElementById("type-client");
  if (typeOrganizer && typeClient) {
    typeOrganizer.addEventListener("change", toggleOrganizerFields);
    typeClient.addEventListener("change", toggleOrganizerFields);
  }

  if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/" || window.location.pathname === "") {
    loadFeaturedOrganizers();
  }

  if (window.location.pathname.includes("profile-detail.html")) {
    setupReviewActions();
    loadOrganizerProfile();
  }
});

// ============================================================
//  OSTALE FUNKCIJE (loadFeaturedOrganizers, renderStars, reviews, etc.)
// ============================================================

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
      const img = org.image_content || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";
      const category = org.tip_eventa ? org.tip_eventa.toUpperCase() : "EVENT";
      const stars = "★".repeat(Math.round(parseFloat(org.ocena) || 5)) + "☆".repeat(5 - Math.round(parseFloat(org.ocena) || 5));

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
    grid.innerHTML = '<p class="text-center text-navy/40 col-span-4">Error loading data.</p>';
  }
}

function renderStars(rating) {
  const safeRating = Math.max(0, Math.min(5, Math.round(parseFloat(rating) || 0)));
  return "★".repeat(safeRating) + "☆".repeat(5 - safeRating);
}

function formatReviewDate(dateString) {
  if (!dateString) return "Unknown date";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

async function loadOrganizerReviews(organizerId, organizerData = null) {
  const listEl = document.getElementById("reviews-list");
  const emptyEl = document.getElementById("reviews-empty");
  const errorEl = document.getElementById("reviews-error");
  const summaryStarsEl = document.getElementById("reviews-summary-stars");
  const summaryTextEl = document.getElementById("reviews-summary-text");

  if (!listEl || !summaryStarsEl || !summaryTextEl) return;

  listEl.innerHTML = "";
  if (emptyEl) emptyEl.style.display = "none";
  if (errorEl) errorEl.style.display = "none";

  try {
    const response = await fetch(`/api/organizers/${organizerId}/reviews`);
    if (!response.ok) throw new Error("Failed to fetch reviews");

    const reviews = await response.json();
    const reviewCount = reviews.length;
    const avgRating = organizerData ? parseFloat(organizerData.ocena) || 0 : reviewCount ? reviews.reduce((sum, review) => sum + (parseFloat(review.rating) || 0), 0) / reviewCount : 0;

    summaryStarsEl.textContent = renderStars(avgRating);
    summaryTextEl.textContent = reviewCount ? `(${avgRating.toFixed(1)} / 5.0) based on ${reviewCount} review${reviewCount !== 1 ? "s" : ""}` : "No reviews yet";

    if (reviewCount === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }

    listEl.innerHTML = reviews.map(review => `
      <div>
        <div class="flex items-center mb-2 gap-2 flex-wrap">
          <span class="font-semibold text-navy mr-2">${escapeHtml(review.client_name || "Anonymous Client")}</span>
          <div class="text-gold text-sm">${renderStars(review.rating)}</div>
        </div>
        <p class="text-navy/70 text-base leading-relaxed">"${escapeHtml(review.comment || "No written comment provided.")}"</p>
        <p class="text-navy/50 text-xs mt-2">— Reviewed on ${escapeHtml(formatReviewDate(review.review_date))}</p>
      </div>
    `).join("");
  } catch (err) {
    console.error(err);
    summaryStarsEl.textContent = "☆☆☆☆☆";
    summaryTextEl.textContent = "Could not load reviews";
    if (errorEl) {
      errorEl.textContent = "Could not load reviews. Please try again.";
      errorEl.style.display = "block";
    }
  }
}

function setupReviewActions() {
  const btn = document.getElementById("btn-leave-review");
  const hint = document.getElementById("reviews-login-hint");
  const session = JSON.parse(localStorage.getItem("wo_session") || "null");

  if (!btn || !hint) return;

  if (!session) {
    btn.disabled = true;
    btn.classList.add("opacity-60", "cursor-not-allowed");
    hint.textContent = "Log in as a client to leave a review.";
    hint.style.display = "block";
    return;
  }

  if (session.userType !== "client") {
    btn.disabled = true;
    btn.classList.add("opacity-60", "cursor-not-allowed");
    hint.textContent = "Only logged-in clients can leave reviews.";
    hint.style.display = "block";
    return;
  }

  btn.disabled = false;
  btn.classList.remove("opacity-60", "cursor-not-allowed");
  hint.textContent = "Logged in as client — you can leave a review.";
  hint.style.display = "block";
}

function openReviewModal() {
  const session = JSON.parse(localStorage.getItem("wo_session") || "null");
  if (!session || session.userType !== "client") return;

  const errorEl = document.getElementById("review-error");
  const successEl = document.getElementById("review-success");
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }
  if (successEl) {
    successEl.textContent = "";
    successEl.style.display = "none";
  }

  const modal = document.getElementById("review-modal");
  if (modal) modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeReviewModal() {
  const modal = document.getElementById("review-modal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
}

async function submitReview() {
  const session = JSON.parse(localStorage.getItem("wo_session") || "null");
  const errorEl = document.getElementById("review-error");
  const successEl = document.getElementById("review-success");
  const submitBtn = document.getElementById("review-submit-btn");
  const urlParams = new URLSearchParams(window.location.search);
  const organizerId = urlParams.get("id");
  const rating = parseInt(document.getElementById("review-rating")?.value || "0");
  const comment = document.getElementById("review-comment")?.value.trim() || "";

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }
  if (successEl) {
    successEl.textContent = "";
    successEl.style.display = "none";
  }

  if (!session || session.userType !== "client") {
    if (errorEl) {
      errorEl.textContent = "You must be logged in as a client to leave a review.";
      errorEl.style.display = "block";
    }
    return;
  }

  if (!organizerId) {
    if (errorEl) {
      errorEl.textContent = "Organizer not found.";
      errorEl.style.display = "block";
    }
    return;
  }

  if (!rating || rating < 1 || rating > 5) {
    if (errorEl) {
      errorEl.textContent = "Please select a rating between 1 and 5.";
      errorEl.style.display = "block";
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
  }

  try {
    const response = await fetch(`/api/organizers/${organizerId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating,
        comment,
        client_id: session.clientDbId || null,
        client_email: session.email,
        client_first_name: session.firstName,
        client_last_name: session.lastName,
      }),
    });

    const rawResponse = await response.text();
    let data = null;

    try {
      data = rawResponse ? JSON.parse(rawResponse) : {};
    } catch {
      if (!response.ok) {
        throw new Error(rawResponse || "Server returned a non-JSON error response.");
      }
      throw new Error("Server returned an invalid JSON response.");
    }

    if (!response.ok) {
      throw new Error(data.error || rawResponse || "Could not submit review.");
    }

    if (data.client_id) {
      const updatedSession = { ...session, clientDbId: data.client_id };
      localStorage.setItem("wo_session", JSON.stringify(updatedSession));
    }

    if (successEl) {
      successEl.textContent = "Review submitted successfully!";
      successEl.style.display = "block";
    }

    const reviewComment = document.getElementById("review-comment");
    if (reviewComment) reviewComment.value = "";
    const reviewRating = document.getElementById("review-rating");
    if (reviewRating) reviewRating.value = "5";

    await loadOrganizerProfile();

    setTimeout(() => {
      closeReviewModal();
    }, 1000);
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message || "Could not submit review.";
      errorEl.style.display = "block";
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Review";
    }
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
    window.currentOrganizerProfile = data;

    document.getElementById("profile-name").textContent = `${data.ime} ${data.priimek}`;
    document.getElementById("profile-location").textContent = data.city || "Location not specified";
    document.getElementById("profile-specialty").textContent = data.tip_eventa ? data.tip_eventa.toUpperCase() : "GENERAL";
    document.getElementById("profile-event-count").textContent = data.stevilo_eventov || "0";
    document.getElementById("profile-price").textContent = data.cena_od ? `${data.cena_od} EUR` : "On Request";
    document.getElementById("profile-email-btn").href = `mailto:${data.email}`;

    const ratingNum = parseFloat(data.ocena) || 0;
    document.getElementById("profile-rating").textContent = renderStars(ratingNum);

    document.getElementById("profile-about").innerHTML = data.portfolio_description || `Welcome to the portfolio of ${data.ime} ${data.priimek}. We host high-end ${data.tip_eventa || "events"} across ${data.city || "Slovenia"}, focusing on absolute premium execution and elite customer satisfaction.`;

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

    loadOrganizerReviews(organizerId, data);
  } catch (err) {
    console.error(err);
    document.getElementById("profile-name").textContent = "Error loading profile details";
  }
}