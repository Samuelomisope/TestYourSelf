# AppTour — TestYourSelf Onboarding Tour

## Files
- `AppTour.jsx` — the tour component
- `AppTour.css` — all styles

---

## 1. Drop the files into your project

Copy both files into your components folder, e.g.:
  src/components/AppTour/AppTour.jsx
  src/components/AppTour/AppTour.css

---

## 2. Mark your UI elements with data-tour attributes

The tour targets elements using `data-tour="<name>"` attributes.
Add these to the matching elements in your layout:

```jsx
// Sidebar wrapper
<aside data-tour="sidebar">...</aside>

// Global search input or its wrapper
<div data-tour="global-search">...</div>

// Individual nav links
<NavLink data-tour="nav-study" to="/study">Study Materials</NavLink>
<NavLink data-tour="nav-ai" to="/ai">AI Tools</NavLink>
<NavLink data-tour="nav-market" to="/marketplace">Marketplace</NavLink>
<NavLink data-tour="nav-chat" to="/chat">ChatSnap</NavLink>

// User avatar / profile button
<button data-tour="user-avatar">...</button>
```

---

## 3. Add AppTour to your layout or dashboard

```jsx
import AppTour from "@/components/AppTour/AppTour";

export default function DashboardLayout() {
  return (
    <>
      {/* your existing layout here */}
      <Sidebar />
      <main>...</main>

      {/* Tour — auto-starts once for new users */}
      <AppTour
        autoStart={true}
        onComplete={() => console.log("Tour done")}
      />
    </>
  );
}
```

---

## 4. Props

| Prop        | Type       | Default | Description                                      |
|-------------|------------|---------|--------------------------------------------------|
| autoStart   | boolean    | true    | Show tour automatically for first-time visitors  |
| onComplete  | () => void | —       | Called when the user finishes or skips the tour  |

---

## 5. Let users restart the tour manually

A "Take the tour" button in your settings or help menu:

```jsx
<button onClick={() => window.__startTour?.()}>
  Take the tour
</button>
```

To also clear the localStorage flag so the tour shows again:

```jsx
<button onClick={() => {
  localStorage.removeItem("testyourself_tour_seen");
  window.__startTour?.();
}}>
  Restart tour
</button>
```

---

## 6. Adding or editing steps

Open `AppTour.jsx` and edit the `TOUR_STEPS` array at the top:

```js
const TOUR_STEPS = [
  {
    target: "sidebar",      // must match a data-tour="sidebar" in your DOM
    title: "Navigation sidebar",
    desc: "...",
    tipPos: "right",        // "right" | "left" | "bottom" | "top" | "bottom-left"
  },
  // add more steps here
];
```

---

## 7. How first-time detection works

The component checks `localStorage.getItem("testyourself_tour_seen")`.
- Not set → tour starts automatically.
- Set to "true" → tour is skipped (user has seen it before).
- Cleared → tour shows again (useful for testing).

The flag is written when the user clicks "Get started" or skips the tour.



1st Semester (100 Level)

Code	Course Title
GNS 101	Use of English I
MTS 101	Introductory Mathematics I
CHE 101	Basic General Chemistry I
CHE 103	General Practical Chemistry I
PHY 103	General Physics (Properties of Matter)
PHY 107	Experimental Physics I
MEE 101	Engineering Drawing
CVE 105	History and Philosophy of Science and Technology

2nd Semester (100 Level)

Code	Course Title
GNS 102	Use of English II
GNS 106	Logic and Philosophy
MTS 102	Introductory Mathematics II
MTS 104	Introductory Applied Mathematics II
CHE 102	General Chemistry II
CHE 104	Experimental Chemistry II
PHY 102	General Physics II (Electricity and Magnetism)
PHY 108	General Practical Physics II
MEE 102	Workshop Practice

200 Level, 1st Semester (Engineering Faculty-wide common courses)

Code	Course Title	Units
CHE 205	Physical Chemistry I	2
CSC 201	Introduction to Fortran Programming	3
CSP 201	General Agriculture (Theory)	1
MEE 201	Manufacturing Technology I	2
MNE 201	Engineer-in-Society	1
MME 201	Science of Materials	3
MEE 207	Applied Mechanics	3