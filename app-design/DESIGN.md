# Design System Strategy: The Human-Centric Editorial

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Concierge."** 

Unlike traditional "job boards" that feel like transactional spreadsheets, this system adopts an editorial, high-end hospitality aesthetic. We are designing for a 20-30s demographic that values both professional stability and modern efficiency. The interface moves away from the rigid, "boxed-in" feeling of standard mobile apps, instead utilizing **intentional asymmetry, overlapping image elements, and a deep tonal hierarchy.** 

By treating the UI as a series of curated layers rather than a flat grid, we convey a sense of "premium reliability"—positioning the platform as a high-trust partner in the service industry.

---

## 2. Colors: Depth Over Definition
Our palette is anchored by a sophisticated `primary` Deep Red (#830020), balanced by a multi-tiered neutral system.

### The "No-Line" Rule
Explicitly prohibit the use of 1px solid borders for sectioning or containment. Boundaries must be defined solely through background color shifts.
*   **Contextual Separation:** Use a `surface-container-low` (#f3f4f5) section sitting directly on a `surface` (#f8f9fa) background to define the edge of a content area.
*   **The Layering Principle:** Treat the UI as physical sheets of fine paper. An inner job card should use `surface-container-lowest` (#ffffff) to "pop" against a `surface-container` (#edeeef) background.

### Glass & Gradient Accents
To avoid a "flat" corporate look:
*   **Glassmorphism:** Floating elements, such as the persistent KakaoTalk button or top navigation bars during scroll, should use semi-transparent `surface` colors with a 20px backdrop-blur.
*   **Signature Gradients:** For primary CTAs and high-impact Job Badges, use a subtle linear gradient from `primary` (#830020) to `primary_container` (#a61d33). This provides a tactile, "clickable" soul that flat color lacks.

---

## 3. Typography: Authority Meets Modernity
The typeface system pairs **Plus Jakarta Sans** for high-impact display moments with **Inter** (or Pretendard) for functional clarity.

*   **Display & Headlines (Plus Jakarta Sans):** Used for "Total Wage" callouts or "Hero Titles." We use aggressive scale (e.g., `display-md` at 2.75rem) with tight letter-spacing (-0.02em) to create an editorial, high-fashion impact.
*   **Body & Titles (Inter/Pretendard):** Used for job descriptions and locations. `title-md` (1.125rem) is our workhorse for job card titles, providing a clear, high-trust anchor for the eyes.
*   **The Information Hierarchy:** In job cards, the Hourly Wage is always treated with `headline-sm` in the `primary` red, ensuring the most vital data point is the first thing a user sees.

---

## 4. Elevation & Tonal Layering
Traditional shadows are often a sign of "default" design. We use **Tonal Layering** to define space.

*   **Ambient Shadows:** Where a "floating" effect is mandatory (e.g., the mobile bottom-nav), shadows must be extra-diffused. Use a 24px blur with 6% opacity, tinted with the `on-surface` (#191c1d) tone to mimic natural light.
*   **The Ghost Border Fallback:** If a border is required for accessibility in input fields, use the `outline_variant` (#e1bebe) at **15% opacity**. High-contrast, 100% opaque borders are strictly forbidden as they clutter the visual field.
*   **Surface Hierarchy:**
    *   **Level 0 (Base):** `surface` (#f8f9fa)
    *   **Level 1 (Sections):** `surface-container-low` (#f3f4f5)
    *   **Level 2 (Cards/Inputs):** `surface-container-lowest` (#ffffff)

---

## 5. Components: Precision & Speed

### Job Cards & Lists
*   **The "No-Divider" Rule:** Never use horizontal lines to separate job listings. Use `spacing-8` (2rem) of vertical white space or a subtle background toggle between cards.
*   **Layout:** Use a 2:3 image aspect ratio for service industry photography (catering/hotels), with text content nested in a `surface-container-lowest` card that slightly overlaps the bottom edge of the image to create depth.

### Buttons (CTA Strategy)
*   **Primary:** Deep Red gradient (`primary` to `primary_container`) with `rounded-md` (0.75rem) corners. Text: `label-md` in `on_primary` (#ffffff).
*   **Secondary (Speed/Action):** Use `secondary` (#003ec6) for "Apply Now" or "Urgent" buttons to provide a vibrant, energetic contrast to the deep red branding.
*   **Tertiary:** Ghost buttons with no background; text-only with a `primary` color and 700 weight.

### Trust Indicator Badges
*   Small, `rounded-full` capsules using `surface-container-highest` backgrounds with `primary` text. These should house icons like "Verified Host" or "Instant Pay."

### Floating Action Button (KakaoTalk)
*   A persistent, semi-transparent glass circle (`surface` color, 80% opacity, 16px blur) with the Kakao logo. Positioned at the bottom right with a `spacing-6` (1.5rem) offset.

---

## 6. Do’s and Don'ts

### Do
*   **DO** use high-quality, editorial photography of luxury hotel lobbies or professional catering setups to elevate the platform's perceived value.
*   **DO** utilize the `spacing-12` (3rem) and `spacing-16` (4rem) tokens for top/bottom section padding to let the design breathe.
*   **DO** use `secondary_container` (#0052fe) for subtle "New Job" or "Closing Soon" indicators to signal urgency without using red "error" tones.

### Don't
*   **DON'T** use black (#000000) for text. Always use `on_surface` (#191c1d) to maintain a soft, premium feel.
*   **DON'T** use the `DEFAULT` (0.5rem) corner radius for large cards; use `xl` (1.5rem) to make the mobile experience feel more tactile and modern.
*   **DON'T** stack more than three pieces of metadata in a single row. Use vertical hierarchy (Wage > Location > Date) to maintain speed of reading.