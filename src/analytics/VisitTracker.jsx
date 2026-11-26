import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiPost } from "../api";
import { useAuth } from "../useAuth";
import { createVisitReporter } from "./featureVisits.js";

/** Reports which section a signed-in person opens (the section name only). Renders nothing; failures are ignored. */
export default function VisitTracker() {
  const { pathname } = useLocation();
  const auth = useAuth();
  const signedIn = Boolean(auth?.user);
  const [reporter] = useState(() => createVisitReporter({ send: (feature) => { apiPost("/activity/visit", { feature }).catch(() => {}); } }));

  useEffect(() => { if (!signedIn) reporter.reset(); }, [signedIn, reporter]);
  useEffect(() => { if (signedIn) reporter.visit(pathname); }, [pathname, signedIn, reporter]);
  return null;
}
