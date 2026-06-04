
// White Orchid custom messages (replaces browser alert/confirm/prompt)
(function () {
  function ensureWoUiStyles() {
    if (document.getElementById("wo-ui-styles")) return;
    const style = document.createElement("style");
    style.id = "wo-ui-styles";
    style.textContent = `
      .wo-toast-wrap{position:fixed;top:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:12px;max-width:min(420px,calc(100vw - 32px));}
      .wo-toast{display:flex;align-items:flex-start;gap:14px;background:#fff;border:1px solid rgba(13,27,42,.10);border-left:4px solid #C9A84C;box-shadow:0 18px 45px rgba(13,27,42,.16);padding:16px 18px;font-family:'Jost',system-ui,sans-serif;color:#0D1B2A;animation:woSlideIn .25s ease-out;border-radius:2px;}
      .wo-toast-icon{width:30px;height:30px;border-radius:50%;border:1px solid #C9A84C;color:#C9A84C;display:flex;align-items:center;justify-content:center;flex:0 0 auto;font-weight:600;}
      .wo-toast-title{font-weight:600;font-size:.9rem;letter-spacing:.03em;margin-bottom:2px;}
      .wo-toast-text{font-size:.86rem;color:rgba(13,27,42,.68);line-height:1.35;}
      .wo-toast-close{margin-left:auto;background:transparent;border:0;color:#A8883A;font-size:1.25rem;line-height:1;cursor:pointer;padding:0 0 0 10px;}
      .wo-modal-backdrop{position:fixed;inset:0;z-index:99998;background:rgba(8,17,26,.58);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:24px;animation:woFadeIn .18s ease-out;}
      .wo-modal{width:min(520px,100%);background:#fff;border:1px solid rgba(201,168,76,.22);box-shadow:0 28px 80px rgba(8,17,26,.30);padding:34px 34px 28px;text-align:center;font-family:'Jost',system-ui,sans-serif;color:#0D1B2A;position:relative;}
      .wo-modal-x{position:absolute;top:16px;right:18px;background:transparent;border:0;color:rgba(13,27,42,.55);font-size:1.7rem;line-height:1;cursor:pointer;}
      .wo-modal-icon{width:58px;height:58px;border-radius:50%;border:1px solid #C9A84C;color:#C9A84C;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:1.8rem;font-weight:300;}
      .wo-modal-title{font-family:'Playfair Display',Georgia,serif;font-size:2rem;font-weight:600;margin:0 0 10px;color:#0D1B2A;}
      .wo-modal-line{width:48px;height:1px;background:#C9A84C;margin:0 auto 18px;}
      .wo-modal-message{margin:0 0 24px;color:rgba(13,27,42,.65);line-height:1.45;font-size:1rem;}
      .wo-modal-input{width:100%;padding:.85rem 1rem;margin:0 0 22px;border:1px solid rgba(13,27,42,.16);background:#FAFAF7;color:#0D1B2A;outline:none;font-family:'Jost',system-ui,sans-serif;}
      .wo-modal-input:focus{border-color:#C9A84C;box-shadow:0 0 0 3px rgba(201,168,76,.12);}
      .wo-modal-actions{display:flex;gap:14px;justify-content:center;}
      .wo-btn{flex:1;padding:.9rem 1.2rem;border:1px solid #C9A84C;background:#fff;color:#A8883A;letter-spacing:.22em;text-transform:uppercase;font-size:.78rem;font-weight:600;cursor:pointer;transition:.2s;}
      .wo-btn:hover{background:#FAFAF7;}
      .wo-btn-primary{background:#C9A84C;color:#fff;}
      .wo-btn-primary:hover{background:#A8883A;border-color:#A8883A;}
      @keyframes woFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes woSlideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
      @media(max-width:520px){.wo-toast-wrap{left:16px;right:16px;top:16px}.wo-modal{padding:28px 22px}.wo-modal-actions{flex-direction:column}.wo-modal-title{font-size:1.65rem}}
    `;
    document.head.appendChild(style);
  }

  function getToastWrap() {
    ensureWoUiStyles();
    let wrap = document.getElementById("wo-toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "wo-toast-wrap";
      wrap.className = "wo-toast-wrap";
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  window.woAlert = function (message, title = "Notice") {
    return new Promise((resolve) => {
      const toast = document.createElement("div");
      toast.className = "wo-toast";
      toast.innerHTML = `
        <div class="wo-toast-icon">!</div>
        <div style="flex:1">
          <div class="wo-toast-title"></div>
          <div class="wo-toast-text"></div>
        </div>
        <button class="wo-toast-close" type="button" aria-label="Close">×</button>
      `;
      toast.querySelector(".wo-toast-title").textContent = title;
      toast.querySelector(".wo-toast-text").textContent = message;
      const close = () => { toast.remove(); resolve(); };
      toast.querySelector(".wo-toast-close").addEventListener("click", close);
      getToastWrap().appendChild(toast);
      setTimeout(close, 4200);
    });
  };

  window.woConfirm = function (message, title = "Are you sure?", confirmText = "Confirm", cancelText = "Cancel") {
    return new Promise((resolve) => {
      ensureWoUiStyles();
      const backdrop = document.createElement("div");
      backdrop.className = "wo-modal-backdrop";
      backdrop.innerHTML = `
        <div class="wo-modal" role="dialog" aria-modal="true">
          <button class="wo-modal-x" type="button" aria-label="Close">×</button>
          <div class="wo-modal-icon">!</div>
          <h2 class="wo-modal-title"></h2>
          <div class="wo-modal-line"></div>
          <p class="wo-modal-message"></p>
          <div class="wo-modal-actions">
            <button class="wo-btn wo-cancel" type="button"></button>
            <button class="wo-btn wo-btn-primary wo-ok" type="button"></button>
          </div>
        </div>`;
      backdrop.querySelector(".wo-modal-title").textContent = title;
      backdrop.querySelector(".wo-modal-message").textContent = message;
      backdrop.querySelector(".wo-cancel").textContent = cancelText;
      backdrop.querySelector(".wo-ok").textContent = confirmText;
      const done = (value) => { backdrop.remove(); resolve(value); };
      backdrop.querySelector(".wo-ok").addEventListener("click", () => done(true));
      backdrop.querySelector(".wo-cancel").addEventListener("click", () => done(false));
      backdrop.querySelector(".wo-modal-x").addEventListener("click", () => done(false));
      backdrop.addEventListener("click", (e) => { if (e.target === backdrop) done(false); });
      document.body.appendChild(backdrop);
    });
  };

  window.woPrompt = function (message, defaultValue = "", title = "Enter value", confirmText = "Save", cancelText = "Cancel") {
    return new Promise((resolve) => {
      ensureWoUiStyles();
      const backdrop = document.createElement("div");
      backdrop.className = "wo-modal-backdrop";
      backdrop.innerHTML = `
        <div class="wo-modal" role="dialog" aria-modal="true">
          <button class="wo-modal-x" type="button" aria-label="Close">×</button>
          <h2 class="wo-modal-title"></h2>
          <div class="wo-modal-line"></div>
          <p class="wo-modal-message"></p>
          <input class="wo-modal-input" type="text" />
          <div class="wo-modal-actions">
            <button class="wo-btn wo-cancel" type="button"></button>
            <button class="wo-btn wo-btn-primary wo-ok" type="button"></button>
          </div>
        </div>`;
      backdrop.querySelector(".wo-modal-title").textContent = title;
      backdrop.querySelector(".wo-modal-message").textContent = message;
      backdrop.querySelector(".wo-cancel").textContent = cancelText;
      backdrop.querySelector(".wo-ok").textContent = confirmText;
      const input = backdrop.querySelector(".wo-modal-input");
      input.value = defaultValue;
      const done = (value) => { backdrop.remove(); resolve(value); };
      backdrop.querySelector(".wo-ok").addEventListener("click", () => done(input.value));
      backdrop.querySelector(".wo-cancel").addEventListener("click", () => done(null));
      backdrop.querySelector(".wo-modal-x").addEventListener("click", () => done(null));
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") done(input.value); if (e.key === "Escape") done(null); });
      document.body.appendChild(backdrop);
      input.focus();
    });
  };
})();

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

// Show / clear inline error message 
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

//  NAV prikaži avatar ali Login/Register glede na sejo

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

    // Dodaj link za My Requests (client) ali My Orders (organizer)
    let extraLink = "";
    let myProfileLink = "";

    if (session.userType === "client") {
      extraLink = `
        <a href="my-requests.html"
          style="display:block;padding:0.75rem 1rem;font-family:'Jost',sans-serif;font-size:0.82rem;color:var(--navy);text-decoration:none;border-bottom:1px solid rgba(13,27,42,0.07);"
          onmouseover="this.style.background='#FAFAF7'"
          onmouseout="this.style.background='white'">
          My Requests
        </a>`;
      // Client nima My Profile linka
      myProfileLink = "";
    } else if (session.userType === "organizer") {
      extraLink = `
        <a href="my-orders.html"
          style="display:block;padding:0.75rem 1rem;font-family:'Jost',sans-serif;font-size:0.82rem;color:var(--navy);text-decoration:none;border-bottom:1px solid rgba(13,27,42,0.07);"
          onmouseover="this.style.background='#FAFAF7'"
          onmouseout="this.style.background='white'">
          My Orders
        </a>`;
      myProfileLink = `
        <a href="${profileUrl}"
          style="display:block;padding:0.75rem 1rem;font-family:'Jost',sans-serif;font-size:0.82rem;color:var(--navy);text-decoration:none;border-bottom:1px solid rgba(13,27,42,0.07);"
          onmouseover="this.style.background='#FAFAF7'"
          onmouseout="this.style.background='white'">
          My Profile
        </a>`;
    }

    const organizerBell =
      session.userType === "organizer"
        ? `
        <a href="my-orders.html"
          title="Notifications"
          style="position:relative;display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;border:1px solid rgba(13,27,42,0.12);color:var(--navy);text-decoration:none;background:white;">
          <span style="font-size:1rem;line-height:1;">🔔</span>
          <span id="nav-bell-badge"
            style="display:none;position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#C9A84C;color:#0D1B2A;font-family:'Jost',sans-serif;font-size:0.65rem;font-weight:600;align-items:center;justify-content:center;">
            0
          </span>
        </a>`
        : "";

    navAuth.innerHTML = `
      ${organizerBell}
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
          ${extraLink}
          ${myProfileLink}
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

    if (session.userType === "organizer" && session.organizerId) {
      fetch(
        `/api/organizers/${encodeURIComponent(session.organizerId)}/notifications`,
      )
        .then((resp) => resp.json().then((data) => ({ ok: resp.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) return;
          const badge = document.getElementById("nav-bell-badge");
          if (!badge) return;
          const unread = Number(data.unread_count || 0);
          if (unread > 0) {
            badge.textContent = unread > 99 ? "99+" : String(unread);
            badge.style.display = "flex";
          }
        })
        .catch(() => {});
    }
  }
}

//  SEED obstoječi organizatorji iz initPostgre.sql

const SEED_ORGANIZERS = [
  {
    id_organizator: 1,
    email: "info@elegantevents.si",
    geslo: "orgpw1",
    ime: "Maja",
    priimek: "Kovač",
  },
  {
    id_organizator: 2,
    email: "kontakt@zabave.si",
    geslo: "orgpw2",
    ime: "Luka",
    priimek: "Zupan",
  },
  {
    id_organizator: 3,
    email: "sara@konference.si",
    geslo: "orgpw3",
    ime: "Sara",
    priimek: "Benko",
  },
  {
    id_organizator: 4,
    email: "rok@soundstage.si",
    geslo: "orgpw4",
    ime: "Rok",
    priimek: "Petrovič",
  },
  {
    id_organizator: 5,
    email: "nina@festivali.si",
    geslo: "orgpw5",
    ime: "Nina",
    priimek: "Leban",
  },
  {
    id_organizator: 6,
    email: "tadej@teamup.si",
    geslo: "orgpw6",
    ime: "Tadej",
    priimek: "Zorko",
  },
  {
    id_organizator: 7,
    email: "eva@galaveceri.si",
    geslo: "orgpw7",
    ime: "Eva",
    priimek: "Mohorič",
  },
  {
    id_organizator: 8,
    email: "gregor@corporate.si",
    geslo: "orgpw8",
    ime: "Gregor",
    priimek: "Šuštar",
  },
  {
    id_organizator: 9,
    email: "katja@weddings.si",
    geslo: "orgpw9",
    ime: "Katja",
    priimek: "Fišer",
  },
  {
    id_organizator: 10,
    email: "blaz@openair.si",
    geslo: "orgpw10",
    ime: "Blaž",
    priimek: "Medved",
  },
  {
    id_organizator: 11,
    email: "urska@sladkisvet.si",
    geslo: "orgpw11",
    ime: "Urška",
    priimek: "Tomažič",
  },
  {
    id_organizator: 12,
    email: "andrej@poslovni.si",
    geslo: "orgpw12",
    ime: "Andrej",
    priimek: "Pregl",
  },
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

//  REGISTER

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
  const email = document
    .getElementById("email-address")
    .value.trim()
    .toLowerCase();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const userType = document.querySelector(
    'input[name="user-type"]:checked',
  ).value;

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
    const checkedBoxes = document.querySelectorAll(
      'input[name="event-types"]:checked',
    );
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

  woAlert("Account successfully created! You can now log in.", "Success");
  window.location.href = "login.html";
}

//  FORGOT PASSWORD

async function handleResetPassword() {
  const errorEl = document.getElementById("form-error");
  const successEl = document.getElementById("form-success");

  errorEl.style.display = "none";
  errorEl.textContent = "";
  successEl.style.display = "none";
  successEl.textContent = "";

  const email = document
    .getElementById("email-address")
    .value.trim()
    .toLowerCase();
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
    errorEl.textContent =
      "New password cannot be the same as your current password.";
    errorEl.style.display = "block";
    return;
  }

  existingUsers[userIndex].passwordHash = newHashedPassword;
  localStorage.setItem("wo_users", JSON.stringify(existingUsers));

  successEl.textContent =
    "Password successfully updated! Redirecting to log in...";
  successEl.style.display = "block";
  setTimeout(() => {
    window.location.href = "login.html";
  }, 2000);
}

//  LOGIN

async function handleLogin(event) {
  if (event) event.preventDefault();
  clearError();

  const email = document
    .getElementById("email-address")
    .value.trim()
    .toLowerCase();
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

//  DOMContentLoaded

window.addEventListener("DOMContentLoaded", async () => {
  await initSeedUsers();
  updateNav();

  const remembered = localStorage.getItem("wo_remember_email");
  if (remembered && document.getElementById("email-address")) {
    document.getElementById("email-address").value = remembered;
    const rememberCheckbox = document.getElementById("remember-me");
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  const loginForm =
    document.getElementById("loginForm") ||
    document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  const typeOrganizer = document.getElementById("type-organizer");
  const typeClient = document.getElementById("type-client");
  if (typeOrganizer && typeClient) {
    typeOrganizer.addEventListener("change", toggleOrganizerFields);
    typeClient.addEventListener("change", toggleOrganizerFields);
  }

  if (
    window.location.pathname.endsWith("index.html") ||
    window.location.pathname === "/" ||
    window.location.pathname === ""
  ) {
    loadFeaturedOrganizers();
  }

  if (window.location.pathname.includes("profile-detail.html")) {
    await setupReviewActions();
    setupGetInTouchButton();
    loadOrganizerProfile();
  }
});

//  GET IN TOUCH BUTTON za cliente (samo za prijavljene cliente, pošlje na request form)

function setupGetInTouchButton() {
  const getInTouchBtn = document.getElementById("profile-email-btn");
  const session = JSON.parse(localStorage.getItem("wo_session") || "null");
  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get("id");
  const isOwner =
    session &&
    session.userType === "organizer" &&
    String(session.organizerId) === String(profileId);

  if (!getInTouchBtn) return;

  // Če je organizator na svojem profilu spremeni gumb v "See My Orders"
  if (isOwner) {
    getInTouchBtn.textContent = "See My Orders";
    getInTouchBtn.href = "#";
    getInTouchBtn.onclick = (e) => {
      e.preventDefault();
      window.location.href = "my-orders.html";
    };
    return;
  }

  // Ni lastnik normalen Get in Touch (samo za prijavljene cliente)
  if (!session) {
    getInTouchBtn.disabled = true;
    getInTouchBtn.classList.add("opacity-60", "cursor-not-allowed");
    getInTouchBtn.textContent = "Log in to Contact";
    getInTouchBtn.onclick = (e) => {
      e.preventDefault();
      woAlert("Please log in as a client to contact organizers.", "Log in required");
      window.location.href = "login.html";
    };
    return;
  }

  if (session.userType !== "client") {
    getInTouchBtn.disabled = true;
    getInTouchBtn.classList.add("opacity-60", "cursor-not-allowed");
    getInTouchBtn.textContent = "Only clients can contact";
    getInTouchBtn.onclick = (e) => {
      e.preventDefault();
      woAlert("Only logged-in clients can send requests to organizers.", "Client account required");
    };
    return;
  }

  // Client je prijavljen omogoči klik in pošlji na request form
  getInTouchBtn.disabled = false;
  getInTouchBtn.classList.remove("opacity-60", "cursor-not-allowed");
  getInTouchBtn.textContent = "Get in Touch";
  getInTouchBtn.href = "#";
  getInTouchBtn.onclick = (e) => {
    e.preventDefault();
    openRequestForm();
  };
}

function openRequestForm() {
  const session = JSON.parse(localStorage.getItem("wo_session") || "null");
  const urlParams = new URLSearchParams(window.location.search);
  const organizerId = urlParams.get("id");
  const organizerName =
    document.getElementById("profile-name")?.textContent || "Organizer";

  if (!session || session.userType !== "client") {
    woAlert("Please log in as a client to send a request.", "Log in required");
    window.location.href = "login.html";
    return;
  }

  // Preusmeri na request-form.html s parametri
  window.location.href = `request-form.html?org_id=${organizerId}&org_name=${encodeURIComponent(organizerName)}`;
}

//  OSTALE FUNKCIJE (loadFeaturedOrganizers, renderStars, reviews, etc.)

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

function renderStars(rating) {
  const safeRating = Math.max(
    0,
    Math.min(5, Math.round(parseFloat(rating) || 0)),
  );
  return "★".repeat(safeRating) + "☆".repeat(5 - safeRating);
}

function formatReviewDate(dateString) {
  if (!dateString) return "Unknown date";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

window.reviewableEvents = [];

function formatReviewEventLabel(event) {
  if (!event) return "";
  const eventName = event.naziv || event.event_name || "Unnamed event";
  const eventDate = event.datum_eventa
    ? formatReviewDate(event.datum_eventa)
    : null;
  return eventDate ? `${eventName} · ${eventDate}` : eventName;
}

async function loadReviewableEvents(organizerId, clientId) {
  const response = await fetch(
    `/api/organizers/${organizerId}/reviewable-events?client_id=${encodeURIComponent(clientId)}`,
  );

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(raw || "Could not load your booked events.");
  }

  return response.json();
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
    const avgRating = organizerData
      ? parseFloat(organizerData.ocena) || 0
      : reviewCount
        ? reviews.reduce(
            (sum, review) => sum + (parseFloat(review.rating) || 0),
            0,
          ) / reviewCount
        : 0;

    summaryStarsEl.textContent = renderStars(avgRating);
    summaryTextEl.textContent = reviewCount
      ? `(${avgRating.toFixed(1)} / 5.0) based on ${reviewCount} review${reviewCount !== 1 ? "s" : ""}`
      : "No reviews yet";

    if (reviewCount === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }

    listEl.innerHTML = reviews
      .map(
        (review) => `
      <div class="border border-navy/10 rounded-lg p-5 bg-cream/50">
        <div class="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div>
            <p class="text-navy/45 text-xs tracking-widest uppercase">${escapeHtml(formatReviewDate(review.review_date))}</p>
            <p class="font-semibold text-navy">${escapeHtml(review.client_name || "Anonymous Client")}</p>
          </div>
          <div class="text-gold text-sm">${renderStars(review.rating)}</div>
        </div>
        <p class="text-navy/55 text-sm mb-2"><span class="font-medium text-navy">Event:</span> ${escapeHtml(review.event_name || "Event not specified")}</p>
        <p class="text-navy/70 text-base leading-relaxed">"${escapeHtml(review.comment || "No written comment provided.")}"</p>
      </div>
    `,
      )
      .join("");
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

async function setupReviewActions() {
  const btn = document.getElementById("btn-leave-review");
  const hint = document.getElementById("reviews-login-hint");
  const session = JSON.parse(localStorage.getItem("wo_session") || "null");
  const urlParams = new URLSearchParams(window.location.search);
  const organizerId = urlParams.get("id");

  if (!btn || !hint) return;

  window.reviewableEvents = [];
  btn.disabled = true;
  btn.classList.add("opacity-60", "cursor-not-allowed");

  if (!session) {
    hint.textContent = "Log in as a client to leave a review.";
    hint.style.display = "block";
    return;
  }

  if (session.userType !== "client") {
    hint.textContent = "Only logged-in clients can leave reviews.";
    hint.style.display = "block";
    return;
  }

  if (!session.clientDbId || !organizerId) {
    hint.textContent =
      "Your account could not be matched to a reviewable booking.";
    hint.style.display = "block";
    return;
  }

  try {
    const events = await loadReviewableEvents(organizerId, session.clientDbId);
    window.reviewableEvents = Array.isArray(events) ? events : [];

    if (!window.reviewableEvents.length) {
      hint.textContent =
        "You can leave a review only for events you booked with this organizer.";
      hint.style.display = "block";
      return;
    }

    btn.disabled = false;
    btn.classList.remove("opacity-60", "cursor-not-allowed");
    hint.textContent =
      "Logged in as client — choose one of your booked events to leave a review.";
    hint.style.display = "block";
  } catch (err) {
    console.error(err);
    hint.textContent = "Could not verify your booked events right now.";
    hint.style.display = "block";
  }
}

function openReviewModal() {
  const session = JSON.parse(localStorage.getItem("wo_session") || "null");
  if (!session || session.userType !== "client") return;

  const errorEl = document.getElementById("review-error");
  const successEl = document.getElementById("review-success");
  const eventSelect = document.getElementById("review-event");
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }
  if (successEl) {
    successEl.textContent = "";
    successEl.style.display = "none";
  }

  if (eventSelect) {
    const options = (window.reviewableEvents || [])
      .map(
        (event) =>
          `<option value="${escapeHtml(event.id_event)}">${escapeHtml(formatReviewEventLabel(event))}</option>`,
      )
      .join("");

    eventSelect.innerHTML =
      options || '<option value="">No eligible events found</option>';
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
  const reviewEvent = document.getElementById("review-event");
  const urlParams = new URLSearchParams(window.location.search);
  const organizerId = urlParams.get("id");
  const rating = parseInt(
    document.getElementById("review-rating")?.value || "0",
  );
  const eventId = parseInt(reviewEvent?.value || "0");
  const comment = document.getElementById("review-comment")?.value.trim() || "";

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }
  if (successEl) {
    successEl.textContent = "";
    successEl.style.display = "none";
  }

  if (!session || session.userType !== "client" || !session.clientDbId) {
    if (errorEl) {
      errorEl.textContent =
        "You must be logged in as a client to leave a review.";
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

  if (!eventId) {
    if (errorEl) {
      errorEl.textContent = "Please choose the event this review is for.";
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
        client_id: session.clientDbId,
        event_id: eventId,
      }),
    });

    const rawResponse = await response.text();
    let data = null;

    try {
      data = rawResponse ? JSON.parse(rawResponse) : {};
    } catch {
      if (!response.ok) {
        throw new Error(
          rawResponse || "Server returned a non-JSON error response.",
        );
      }
      throw new Error("Server returned an invalid JSON response.");
    }

    if (!response.ok) {
      throw new Error(data.error || rawResponse || "Could not submit review.");
    }

    if (successEl) {
      successEl.textContent = "Review submitted successfully!";
      successEl.style.display = "block";
    }

    const reviewComment = document.getElementById("review-comment");
    if (reviewComment) reviewComment.value = "";
    const reviewRating = document.getElementById("review-rating");
    if (reviewRating) reviewRating.value = "5";

    await setupReviewActions();
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

    const ratingNum = parseFloat(data.ocena) || 0;
    document.getElementById("profile-rating").textContent =
      renderStars(ratingNum);

    document.getElementById("profile-about").innerHTML =
      data.portfolio_description ||
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

    loadOrganizerReviews(organizerId, data);

    // Počakamo, da se profile naloži, potem nastavimo Get in Touch gumb
    setupGetInTouchButton();
  } catch (err) {
    console.error(err);
    document.getElementById("profile-name").textContent =
      "Error loading profile details";
  }
}