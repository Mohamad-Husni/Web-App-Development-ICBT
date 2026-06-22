/**
 * GlobeTrek Adventures — Global JS Engine
 * Supabase backend (no mock data). Config comes from env.js (window.GLOBETREK_CONFIG).
 */

// ==========================================================
// SUPABASE CLIENT
// ==========================================================
const GT_CONFIG = window.GLOBETREK_CONFIG || {};
const SUPABASE_URL = GT_CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = GT_CONFIG.SUPABASE_ANON_KEY;

// Reuse a client a page guard may have already created; otherwise create one.
let supabaseInstance = window.supabaseClient || null;
if (!supabaseInstance) {
    if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
        supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('GlobeTrek: Supabase client ready.');
    } else {
        console.error('GlobeTrek: Supabase config missing. Create env.js (see env.example.js) with your project URL and anon key.');
    }
}
window.supabaseClient = supabaseInstance;

// ==========================================================
// TOAST NOTIFICATION
// ==========================================================
function showToast(message, type = 'success') {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'toast-msg';
        document.body.appendChild(toast);
    }

    toast.className = `toast-msg ${type} show`;
    const icon = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;

    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==========================================================
// SESSION & PROFILE HELPERS
// ==========================================================
async function getSession() {
    if (!supabaseInstance) return null;
    const { data } = await supabaseInstance.auth.getSession();
    return data.session;
}

async function getCurrentProfile() {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await supabaseInstance
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
    if (error) {
        console.warn('Profile lookup failed:', error.message);
        return null;
    }
    return data;
}

async function isAdmin() {
    const profile = await getCurrentProfile();
    return !!profile && profile.role === 'admin';
}

// Create the signed-in user's profile row if it doesn't exist yet.
// This replaces the old PL/pgSQL signup trigger — done in plain JS.
async function ensureProfile() {
    if (!supabaseInstance) return;
    const session = await getSession();
    if (!session) return;
    const user = session.user;
    try {
        const { data: existing } = await supabaseInstance
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();
        if (existing) return; // already there — nothing to do

        await supabaseInstance.from('profiles').insert({
            id: user.id,
            full_name: (user.user_metadata && user.user_metadata.full_name) ||
                       (user.email ? user.email.split('@')[0] : 'Traveler'),
            email: user.email,
            role: 'user'
        });
    } catch (e) {
        console.warn('ensureProfile failed:', e.message || e);
    }
}

async function redirectAfterAuth(fallback = 'dashboard.html') {
    const profile = await getCurrentProfile();
    const target = (profile && profile.role === 'admin') ? 'admin.html' : fallback;
    window.location.replace(target);
    return target;
}

// ==========================================================
// PACKAGES (read)
// ==========================================================
async function fetchPackages() {
    if (!supabaseInstance) return [];
    const { data, error } = await supabaseInstance
        .from('packages')
        .select('*')
        .order('id', { ascending: true });
    if (error) {
        console.error('Failed to load packages:', error.message);
        throw error;
    }
    return data || [];
}

// Single package (for the details page)
async function fetchPackageById(id) {
    if (!supabaseInstance) return null;
    const { data, error } = await supabaseInstance
        .from('packages')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error('Failed to load package:', error.message);
        throw error;
    }
    return data;
}

// ==========================================================
// PACKAGES (admin write)
// ==========================================================
async function savePackage(destination, description, price, duration, imageUrl, editId = null, extra = {}) {
    if (!supabaseInstance) return { success: false, error: 'Not connected to Supabase.' };
    const payload = {
        destination,
        description,
        price: parseFloat(price),
        duration,
        image_url: imageUrl
    };
    // Optional detail fields (gallery / route / hotels) — only sent when non-empty
    // so existing saves keep working even before the columns are added.
    ['gallery', 'route', 'hotels'].forEach(key => {
        if (extra[key]) payload[key] = extra[key];
    });
    try {
        if (editId) {
            const { error } = await supabaseInstance.from('packages').update(payload).eq('id', editId);
            if (error) throw error;
        } else {
            const { error } = await supabaseInstance.from('packages').insert([payload]);
            if (error) throw error;
        }
        return { success: true };
    } catch (err) {
        console.error('Save package failed:', err.message);
        return { success: false, error: err.message };
    }
}

async function deletePackage(id) {
    if (!supabaseInstance) return { success: false, error: 'Not connected to Supabase.' };
    try {
        const { error } = await supabaseInstance.from('packages').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Delete package failed:', err.message);
        return { success: false, error: err.message };
    }
}

// ==========================================================
// BOOKINGS
// ==========================================================
async function createBooking({ packageId = null, title, price, image }) {
    const session = await getSession();
    if (!session) {
        showToast('Please login to book this adventure!', 'error');
        setTimeout(() => (window.location.href = 'login.html'), 1200);
        return { success: false, needsAuth: true };
    }
    try {
        const { error } = await supabaseInstance.from('bookings').insert([{
            user_id: session.user.id,
            package_id: packageId,
            title,
            price: parseFloat(price),
            image,
            status: 'pending'
        }]);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Create booking failed:', err.message);
        return { success: false, error: err.message };
    }
}

// Card "Book Now" handler — books then sends the user to their dashboard.
async function bookTour(packageId, destination, price, imageUrl) {
    const result = await createBooking({ packageId, title: destination, price, image: imageUrl });
    if (result.success) {
        showToast(`Successfully booked ${destination}! Redirecting...`, 'success');
        setTimeout(() => (window.location.href = 'dashboard.html'), 1200);
    } else if (result.error) {
        showToast('Booking failed: ' + result.error, 'error');
    }
}

async function fetchMyBookings() {
    const session = await getSession();
    if (!session) return [];
    const { data, error } = await supabaseInstance
        .from('bookings')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Failed to load bookings:', error.message);
        throw error;
    }
    return data || [];
}

async function cancelBookingById(id) {
    if (!supabaseInstance) return { success: false, error: 'Not connected to Supabase.' };
    try {
        const { error } = await supabaseInstance.from('bookings').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ---- Admin booking management ----
async function fetchAllBookings() {
    if (!supabaseInstance) return [];
    const { data, error } = await supabaseInstance
        .from('bookings')
        .select('*, profiles ( email, full_name )')
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Failed to load all bookings:', error.message);
        throw error;
    }
    return data || [];
}

async function updateBookingStatus(id, status) {
    if (!supabaseInstance) return { success: false, error: 'Not connected to Supabase.' };
    try {
        const { error } = await supabaseInstance.from('bookings').update({ status }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function deleteBookingById(id) {
    return cancelBookingById(id);
}

// ==========================================================
// PROFILES (admin: customers list, self: update name)
// ==========================================================
async function fetchAllProfiles() {
    if (!supabaseInstance) return [];
    const { data, error } = await supabaseInstance
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) {
        console.error('Failed to load profiles:', error.message);
        throw error;
    }
    return data || [];
}

async function updateMyProfile(fullName) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Not signed in.' };
    try {
        const { error } = await supabaseInstance
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', session.user.id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Update profile failed:', err.message);
        return { success: false, error: err.message };
    }
}

// ==========================================================
// AUTH NAVIGATION UI (shared header on public pages)
// ==========================================================
function initAuth() {
    const loginBtnContainer = document.getElementById('nav-auth-container');
    const mobileLoginBtnContainer = document.getElementById('mobile-nav-auth-container');

    const updateUIForUser = (user) => {
        if (user) {
            const desktopHTML = `
                <a href="dashboard.html" class="btn btn-secondary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">
                    <i data-lucide="layout-dashboard" style="width: 16px; height: 16px;"></i> Dashboard
                </a>
                <button id="logout-btn" class="btn btn-primary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">
                    <i data-lucide="log-out" style="width: 16px; height: 16px;"></i> Logout
                </button>
            `;
            const mobileHTML = `
                <li><a href="dashboard.html"><i data-lucide="layout-dashboard"></i> Dashboard</a></li>
                <li><a href="#" id="mobile-logout-btn"><i data-lucide="log-out"></i> Logout</a></li>
            `;
            if (loginBtnContainer) loginBtnContainer.innerHTML = desktopHTML;
            if (mobileLoginBtnContainer) mobileLoginBtnContainer.innerHTML = mobileHTML;
        } else {
            const desktopHTML = `
                <a href="packages.html" class="nav-guest-link" style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); display: inline-flex; align-items: center; gap: 0.4rem; margin-right: 0.5rem;">
                    <i data-lucide="compass" style="width: 16px; height: 16px;"></i> Browse as Guest
                </a>
                <a href="login.html" class="btn btn-secondary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">Login</a>
                <a href="login.html?signup=true" class="btn btn-primary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">Sign Up</a>
            `;
            const mobileHTML = `
                <li><a href="packages.html"><i data-lucide="compass"></i> Browse as Guest</a></li>
                <li><a href="login.html"><i data-lucide="log-in"></i> Login</a></li>
                <li><a href="login.html?signup=true"><i data-lucide="user-plus"></i> Sign Up</a></li>
            `;
            if (loginBtnContainer) loginBtnContainer.innerHTML = desktopHTML;
            if (mobileLoginBtnContainer) mobileLoginBtnContainer.innerHTML = mobileHTML;
        }

        if (window.lucide) window.lucide.createIcons();
        bindLogoutButtons();
    };

    if (supabaseInstance) {
        supabaseInstance.auth.getSession().then(({ data: { session } }) => {
            if (session) ensureProfile();
            updateUIForUser(session ? session.user : null);
        });
        supabaseInstance.auth.onAuthStateChange((_event, session) => {
            if (session) ensureProfile();
            updateUIForUser(session ? session.user : null);
        });
    } else {
        updateUIForUser(null);
    }
}

function bindLogoutButtons() {
    const logoutBtn = document.getElementById('logout-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

    const handleLogout = async (e) => {
        e.preventDefault();
        if (!supabaseInstance) return;
        const { error } = await supabaseInstance.auth.signOut();
        if (error) {
            showToast('Logout failed: ' + error.message, 'error');
        } else {
            showToast('Logged out successfully!', 'success');
            setTimeout(() => (window.location.href = 'index.html'), 1000);
        }
    };

    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);
}

// ==========================================================
// GLOBAL EXPORTS
// ==========================================================
window.showToast = showToast;
window.getSession = getSession;
window.getCurrentProfile = getCurrentProfile;
window.isAdmin = isAdmin;
window.ensureProfile = ensureProfile;
window.redirectAfterAuth = redirectAfterAuth;
window.fetchPackages = fetchPackages;
window.fetchPackageById = fetchPackageById;
window.savePackage = savePackage;
window.deletePackage = deletePackage;
window.createBooking = createBooking;
window.bookTour = bookTour;
window.fetchMyBookings = fetchMyBookings;
window.cancelBookingById = cancelBookingById;
window.fetchAllBookings = fetchAllBookings;
window.updateBookingStatus = updateBookingStatus;
window.deleteBookingById = deleteBookingById;
window.fetchAllProfiles = fetchAllProfiles;
window.updateMyProfile = updateMyProfile;
window.initAuth = initAuth;

// ==========================================================
// BOOTSTRAP
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    initAuth();

    // Hamburger drawer (public pages)
    const hamburger = document.getElementById('hamburger-toggle');
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('mobile-overlay');

    if (hamburger && drawer && overlay) {
        const toggleMenu = () => {
            hamburger.classList.toggle('open');
            drawer.classList.toggle('open');
            overlay.classList.toggle('active');
            document.body.style.overflow = drawer.classList.contains('open') ? 'hidden' : '';
        };
        hamburger.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
        drawer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (drawer.classList.contains('open')) toggleMenu();
            });
        });
    }

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });
    }
});
