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
