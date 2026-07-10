// ═══════════ GLOBALS ═══════════
function resolveApiBase() {
    if (window.SITE_AUTH_API_BASE) {
        return window.SITE_AUTH_API_BASE.replace(/\/$/, "");
    }

    if (
        window.location &&
        window.location.hostname &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ) {
        return "http://127.0.0.1:8000";
    }

    return "https://web-production-cec3d.up.railway.app";
}

const SITE_AUTH_API_URL = `${resolveApiBase()}/api/auth`;

document.addEventListener("DOMContentLoaded", () => {
    
    // Check if we are on a protected page and not logged in
    const path = window.location.pathname;
    const isProtected = path.endsWith("wallet.html") || path.endsWith("history.html") || path.endsWith("referrals.html");
    const token = localStorage.getItem("token");

    if (isProtected && !token) {
        window.location.href = "login.html";
        return;
    }

    if ((path.endsWith("login.html") || path.endsWith("signup.html")) && token) {
        window.location.href = "wallet.html";
        return;
    }

    // --- Signup Flow ---
    const signupForm = document.getElementById("signup-form");
    const otpForm = document.getElementById("otp-form");
    const signupError = document.getElementById("signup-error");
    let userEmail = "";

    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = document.getElementById("btn-signup");
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            const referredByCode = document.getElementById("referred_by_code")?.value || null;

            btn.innerHTML = "Creating...";
            btn.disabled = true;
            if (signupError) {
                signupError.classList.add("hidden");
                signupError.textContent = "";
            }

            try {
                const res = await fetch(`${SITE_AUTH_API_URL}/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password, referred_by_code: referredByCode })
                });
                
                const data = await res.json();
                
                if (res.ok || (res.status === 400 && data.detail === "OTP resent to email")) {
                    userEmail = email;
                    signupForm.classList.add("hidden");
                    otpForm.classList.remove("hidden");
                } else {
                    if (signupError) {
                        signupError.textContent = data.detail || "An error occurred";
                        signupError.classList.remove("hidden");
                    }
                }
            } catch (err) {
                if (signupError) {
                    signupError.textContent = "Network error";
                    signupError.classList.remove("hidden");
                }
            } finally {
                btn.innerHTML = "Sign Up";
                btn.disabled = false;
            }
        });
    }

    if (otpForm) {
        otpForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = document.getElementById("btn-verify");
            const otp = document.getElementById("otp").value;

            btn.innerHTML = "Verifying...";
            btn.disabled = true;

            try {
                const res = await fetch(`${SITE_AUTH_API_URL}/verify-otp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: userEmail, otp })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    localStorage.setItem("token", data.access_token);
                    window.location.href = "wallet.html";
                } else {
                    alert(data.detail || "Invalid OTP");
                }
            } catch (err) {
                alert("Network error");
            } finally {
                btn.innerHTML = "Verify Email";
                btn.disabled = false;
            }
        });

        document.getElementById("btn-back").addEventListener("click", () => {
            otpForm.classList.add("hidden");
            signupForm.classList.remove("hidden");
        });
    }

    // --- Login Flow ---
    const loginForm = document.getElementById("login-form");
    const loginError = document.getElementById("login-error");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = document.getElementById("btn-login");
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            btn.innerHTML = "Logging In...";
            btn.disabled = true;
            loginError.classList.add("hidden");

            try {
                const res = await fetch(`${SITE_AUTH_API_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    localStorage.setItem("token", data.access_token);
                    if (data.referral_code) {
                        localStorage.setItem("referral_code", data.referral_code);
                    }
                    window.location.href = "wallet.html";
                } else {
                    loginError.textContent = data.detail || "Login failed";
                    loginError.classList.remove("hidden");
                }
            } catch (err) {
                loginError.textContent = "Network error";
                loginError.classList.remove("hidden");
            } finally {
                btn.innerHTML = "Log In";
                btn.disabled = false;
            }
        });
    }

    // --- Forgot Password Flow ---
    const forgotLink = document.getElementById("forgot-link");
    const backToLogin = document.getElementById("back-to-login");
    const resetToLogin = document.getElementById("reset-to-login");
    
    const forgotForm = document.getElementById("forgot-password-form");
    const resetForm = document.getElementById("reset-password-form");
    
    let resetEmail = "";

    if (forgotLink) {
        forgotLink.addEventListener("click", (e) => {
            e.preventDefault();
            loginForm.classList.add("hidden");
            forgotForm.classList.remove("hidden");
        });
    }

    if (backToLogin) {
        backToLogin.addEventListener("click", (e) => {
            e.preventDefault();
            forgotForm.classList.add("hidden");
            loginForm.classList.remove("hidden");
        });
    }
    
    if (resetToLogin) {
        resetToLogin.addEventListener("click", (e) => {
            e.preventDefault();
            resetForm.classList.add("hidden");
            loginForm.classList.remove("hidden");
        });
    }

    if (forgotForm) {
        forgotForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = document.getElementById("btn-forgot");
            const email = document.getElementById("forgot-email").value;
            const errorDiv = document.getElementById("forgot-error");

            btn.innerHTML = "Sending...";
            btn.disabled = true;
            errorDiv.classList.add("hidden");

            try {
                const res = await fetch(`${SITE_AUTH_API_URL}/forgot-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    resetEmail = email;
                    forgotForm.classList.add("hidden");
                    resetForm.classList.remove("hidden");
                } else {
                    errorDiv.textContent = data.detail || "Error sending reset code";
                    errorDiv.classList.remove("hidden");
                }
            } catch (err) {
                errorDiv.textContent = "Network error";
                errorDiv.classList.remove("hidden");
            } finally {
                btn.innerHTML = "Send Reset Code";
                btn.disabled = false;
            }
        });
    }

    if (resetForm) {
        resetForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = document.getElementById("btn-reset");
            const otp = document.getElementById("reset-otp").value;
            const newPassword = document.getElementById("reset-password-input").value;
            const errorDiv = document.getElementById("reset-error");
            const successDiv = document.getElementById("reset-success");

            btn.innerHTML = "Resetting...";
            btn.disabled = true;
            errorDiv.classList.add("hidden");
            successDiv.classList.add("hidden");

            let res;
            try {
                res = await fetch(`${SITE_AUTH_API_URL}/reset-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: resetEmail, otp: otp, new_password: newPassword })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    successDiv.classList.remove("hidden");
                    // Optionally hide the form fields
                    document.getElementById("reset-otp").disabled = true;
                    document.getElementById("reset-password-input").disabled = true;
                    btn.classList.add("hidden");
                } else {
                    errorDiv.textContent = data.detail || "Error resetting password";
                    errorDiv.classList.remove("hidden");
                }
            } catch (err) {
                errorDiv.textContent = "Network error or server down";
                errorDiv.classList.remove("hidden");
            } finally {
                if(!res || !res.ok) {
                    btn.innerHTML = "Set New Password";
                    btn.disabled = false;
                }
            }
        });
    }
});

// Logout Helper
function siteLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("referral_code");
    localStorage.removeItem("cached_profit");
    window.location.href = "login.html";
}
