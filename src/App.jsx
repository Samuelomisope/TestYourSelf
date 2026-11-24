import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Home from "./Home";
import StudyMaterial from "./StudyMaterial";
import AI from "./AI";
import Chat from "./Chat";
import Marketplace from "./Marketplace";
import MarketplaceDetail from "./MarketplaceDetail";
import CreateListing from "./CreateListing";
import MyListings from "./MyListings";
import SellerProfile from "./SellerProfile";
import MarketplaceOnboarding from "./MarketplaceOnboarding";
import ProtectedRoute from "./ProtectedRoute";
import Search from "./Search";
import Admin from "./Admin";
import Profile from "./Profile";
import Feedback from "./Feedback";
import Privacy from "./Privacy";
import Terms from "./Terms";
import Flashcards from "./Flashcards";
import Novels from "./Novels";
import BecomeWriter from "./BecomeWriter";
import WriterDashboard from "./WriterDashboard";
import NovelDetail from "./NovelDetail";
import EpisodeReader from "./EpisodeReader";
import WriterRoute from "./WriterRoute";
import UniversityWelcomePage from "./UniversityWelcomePage";
import StudyPlan from "./StudyPlan";
import Premium from "./Premium";
import { OnboardingProvider } from "./onboarding/OnboardingContext";
import OnboardingLayer from "./onboarding/OnboardingLayer";
import PastQuestions from "./PastQuestions";
import Unsubscribe from "./Unsubscribe";
import Settings from "./Settings";

// The Classroom pages are large (lesson rendering, voice, tutor) and only some students open them, so they load on demand.
const Classroom = lazy(() => import("./Classroom"));
const MyLearning = lazy(() => import("./MyLearning"));
const pageLoading = (
  <p role="status" className="px-4 pt-36 text-center text-sm text-ink/50">
    Loading…
  </p>
);
function App() {
  return (
    <BrowserRouter>
      <OnboardingProvider>
      <Suspense fallback={pageLoading}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/study-material" element={<ProtectedRoute><StudyMaterial /></ProtectedRoute>} />        
        <Route path="/ai" element={<ProtectedRoute><AI /></ProtectedRoute>} />
        <Route path="/classroom" element={<ProtectedRoute><Classroom /></ProtectedRoute>} />
        <Route path="/classroom/learning" element={<ProtectedRoute><MyLearning /></ProtectedRoute>} />
        <Route path="/classroom/:sessionId" element={<ProtectedRoute><Classroom /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
        <Route path="/marketplace/create" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
        <Route path="/marketplace/my-listings" element={<ProtectedRoute><MyListings /></ProtectedRoute>} />
        <Route path="/marketplace/onboarding" element={<ProtectedRoute><MarketplaceOnboarding /></ProtectedRoute>} />
        <Route path="/marketplace/seller/:userId" element={<ProtectedRoute><SellerProfile /></ProtectedRoute>} />
        <Route path="/marketplace/:id" element={<ProtectedRoute><MarketplaceDetail /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/schools/:universitySlug" element={<ProtectedRoute><UniversityWelcomePage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
        <Route path="/terms" element={<ProtectedRoute><Terms /></ProtectedRoute>} />
        <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
        <Route path="/novels" element={<ProtectedRoute><Novels /></ProtectedRoute>} />
        <Route path="/novels/become-writer" element={<ProtectedRoute><BecomeWriter /></ProtectedRoute>} />
        <Route path="/novels/:id" element={<ProtectedRoute><NovelDetail /></ProtectedRoute>} />
        <Route path="/episodes/:id" element={<ProtectedRoute><EpisodeReader /></ProtectedRoute>} />
        <Route path="/study-plan" element={<ProtectedRoute><StudyPlan /></ProtectedRoute>} />
        <Route path="/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />
        <Route path="/practice" element={<ProtectedRoute><PastQuestions /></ProtectedRoute>} />
        <Route path="/writer/dashboard" 
        element={
        <ProtectedRoute>
          <WriterRoute>
            <WriterDashboard />
            </WriterRoute>
            </ProtectedRoute>} />
      </Routes>
        <OnboardingLayer />
      </Suspense>
      </OnboardingProvider>
    </BrowserRouter>
  );
}

export default App;
