# GlobeTrek Adventures — Site Map

This document describes the navigation structure of the **GlobeTrek Adventures** website. It is organized by the tabs and user roles available in the application, not by source-code files.

---

## 1. Public Navigation (available to all visitors)

These tabs appear in the main navigation bar on every public page, and inside the mobile drawer menu.

### 1.1 Home (`index.html`)
**Purpose:** Landing page and entry point for the platform.

Accessible content:
- Hero search widget
  - Destination search
  - Date picker
  - Max budget filter: Any / Under LKR 1,500 / Under LKR 2,000 / Under LKR 2,500
  - "Explore" button (submits search to Packages page)
  - "More filters" toggle for advanced options
- Featured escapes section
  - Bali Getaway card
  - Swiss Alps Adventure card
  - "Explore Details" call-to-action buttons
- Newsletter subscription
  - Email input
  - "Subscribe Now" button

### 1.2 Packages (`packages.html`)
**Purpose:** Browse and filter all available travel packages.

Accessible content:
- Search / filter widget
  - Destination search
  - Date picker
  - Max budget dropdown
  - "More filters" toggle
  - Search submit button
- Available packages catalog
  - Package cards with image, destination, duration, price, description
  - "Book Now" action button
- No-results state with "Clear Filters" option

### 1.3 About Us (`about.html`)
**Purpose:** Learn about the GlobeTrek brand and story.

Accessible content:
- Company narrative / mission section
- Statistics grid
  - 15+ Destinations
  - 100k Happy Travelers
  - 4.9 Average Rating
  - 24/7 Support Hours
- "Explore Packages" call-to-action button

### 1.4 Contact (`contact.html`)
**Purpose:** Reach the GlobeTrek support and sales team.

Accessible content:
- Contact form
  - Full Name input
  - Email Address input
  - Phone Number input
  - Subject dropdown: Booking Inquiry / Customer Support / Partnership / General Question
  - Message textarea
  - "Send Message" submit button
- Contact information panel
  - Phone: +1 (800) 555-TRAV
  - Email: support@globetrek.com
  - Address: 123 Adventure Ave, Suite 500, New York, NY 10001
  - Hours: 24 / 7 Travel Support

### 1.5 Login / Sign Up (`login.html`)
**Purpose:** Authenticate existing users or register new accounts.

Accessible content:
- Toggle between Sign In and Sign Up modes
- Sign Up fields
  - Full Name input
  - Email Address input
  - Password input (min 6 characters)
- Sign In fields
  - Email / Username input
  - Password input
- Primary action button (Sign In / Sign Up)
- "Back to Home" navigation link
- Successful login redirects to the Traveler Dashboard

---

## 2. Authenticated Navigation (available after login)

Once a user is logged in, the navigation adapts to show role-specific options.

### 2.0 OAuth Callback (`auth-callback.html`)
**Purpose:** Intermediate landing page after Google OAuth sign-in. Not directly browsed by users.

Accessible content:
- Extracts the Supabase session from the OAuth callback URL hash.
- Detects the authenticated user's role.
- Redirects normal users to `dashboard.html`.
- Redirects admins to `admin.html`.
- Displays an error message and a "Return to Login" button if authentication fails.

### 2.1 Traveler Dashboard (`dashboard.html`)
**Purpose:** Personal hub for managing bookings and wishlist.

Accessible content:
- Mobile sidebar toggle
- Metrics panel
  - Total Bookings counter
  - Amount Spent counter (LKR)
  - Wishlist Items counter
- Booked Journeys panel
  - Bookings table: Destination, Date, Price (LKR), Status
  - Cancel action button
- Wishlist panel
  - Saved package cards
  - Quick "Book" action buttons
- Sidebar menu
  - Overview (active)
  - Browse Tours (links to packages.html)
  - Admin Console (visible only when user email contains "admin")
  - My Profile
  - Settings
  - Logout (resets session and returns to index.html)

### 2.2 Admin Console (`admin.html`)
**Purpose:** Manage packages and monitor customer bookings.

Accessible content:
- Mobile sidebar toggle
- Sidebar navigation tabs
  - Manage Packages
  - View Bookings
  - Traveler Portal (links to dashboard.html)
  - View Website (links to index.html)
  - Logout

#### Manage Packages tab
- Create / Edit Package form
  - Destination Title input
  - Duration input
  - Price input (LKR)
  - Image URL input
  - Description snippet textarea
  - Save / Update Poster button
  - Cancel Edit button
- Active Posters table
  - Columns: Package Detail, Duration, Price, Actions
  - Edit action button
  - Delete action button

#### View Bookings tab
- Customer Orders table
  - Columns: Customer Email, Destination, Price (LKR), Status, Operations
  - Status toggle action (pending / confirmed)
  - Remove action button

---

## 3. Footer & Support Links

The footer is present on all public pages.

Accessible content:
- Brand description
- Explore links
  - Trending Tours
  - Seasonal Deals
  - Our Story
- Support links
  - Help Center
  - Cancellation Policy
  - Contact Support
- Contact details
  - Phone: +1 (800) 555-TRAV
  - Email: support@globetrek.com
- Legal links
  - Privacy Policy
  - Terms of Service
- Copyright notice

---

## 4. Typical User Flows

| User Goal | Path |
|---|---|
| Browse trips | Home → Packages |
| Search for a destination | Home hero search → Packages (filtered results) |
| Book a package | Packages → Book Now → Login (if needed) → Dashboard |
| Contact support | Home → Contact → Send Message |
| Manage my bookings | Login → Dashboard → Booked Journeys |
| Add / edit packages | Login (admin) → Admin Console → Manage Packages |
| Monitor orders | Login (admin) → Admin Console → View Bookings |

---

*Last updated: June 2026*
