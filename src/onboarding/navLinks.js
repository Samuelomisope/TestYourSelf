import { faHouse, faBook, faRobot, faBookOpen, faComments, faLayerGroup, faChalkboard, faCrown, faCommentDots, faStore, faCalendarCheck } from "@fortawesome/free-solid-svg-icons";

// One source for the top tabs and the side menu, used by Navbar and Home. `id` becomes data-tour="tab-<id>" /
// "side-<id>", which the tour points at. `feature` links an item to a FEATURES entry for the NEW badge.
export const TAB_LINKS = [
  { id: "home", href: "/home", label: "Home", icon: faHouse },
  { id: "library", href: "/study-material", label: "Library", icon: faBook },
  { id: "ai", href: "/ai", label: "AI", icon: faRobot },
  { id: "classroom", href: "/classroom", label: "Classroom", icon: faChalkboard, feature: "feature:classroom" },
  { id: "novels", href: "/novels", label: "Novels", icon: faBookOpen },
  { id: "chat", href: "/chat", label: "Chat", icon: faComments },
];

export const SIDEBAR_LINKS = [
  { id: "home", name: "Home", href: "/home", icon: faHouse },
  { id: "library", name: "Library", href: "/study-material", icon: faBook },
  { id: "flashcards", name: "Flashcards", href: "/flashcards", icon: faLayerGroup },
  { id: "ai", name: "AI Assistant", href: "/ai", icon: faRobot },
  { id: "classroom", name: "AI Classroom", href: "/classroom", icon: faChalkboard, feature: "feature:classroom" },
  { id: "planner", name: "Study Planner", href: "/study-plan", icon: faCalendarCheck },
  { id: "premium", name: "Premium", href: "/premium", icon: faCrown },
  { id: "chat", name: "Chat", href: "/chat", icon: faComments },
  { id: "marketplace", name: "Marketplace", href: "/marketplace", icon: faStore },
  { id: "feedback", name: "Feedback", href: "/feedback", icon: faCommentDots },
];
