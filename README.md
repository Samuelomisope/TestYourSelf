# UNILIB

**UNILIB — Study Smarter, Learn Together** is a web platform for university students. It brings academic resources, AI-assisted study, peer communication, and a campus marketplace into one place. Students can find materials for their university and courses, prepare with study tools, ask questions, connect with other learners, and discover or trade academic resources.

> This repository contains the UNILIB web client. It is a React single-page application. It relies on Firebase for authentication and client-side data services, and on a separately deployed API for many application features. Configure both services for a complete local environment.

## What students can do

- **Find study materials:** browse and search academic resources, open material details, and use downloads for offline reading where available.
- **Study with AI:** use AI study tools and the Ask UniLib assistant to get help with questions and learning tasks. AI behavior depends on the configured API and available providers.
- **Build revision aids:** create and use flashcards.
- **Plan study:** access study planning tools and study-plan coaching features.
- **Chat and connect:** use in-app chat and notifications to communicate and stay up to date.
- **Use the campus marketplace:** browse listings, view listing details and seller profiles, create listings, manage personal listings, and complete seller onboarding.
- **Read and publish novels:** explore novels, read episodes, apply to become a writer, and use the writer dashboard when approved.
- **Personalize an account:** manage a profile and theme, and send feedback.
- **Read university information:** view university-specific pages and news when available.

The app also includes administrative pages and moderation/review interfaces for authorized accounts. Access is controlled by the API and account role; seeing a route in the code does not grant a user permission to use it.

## Application routes

All routes except the sign-in page require authentication through `ProtectedRoute`. Writer tools also have an additional writer-access check. Routes are defined in `src/App.jsx`.

| Route | Purpose |
| --- | --- |
| `/` | Sign in |
| `/home` | Student home/dashboard |
| `/study-material` | Study material library |
| `/ai` | AI study tools |
| `/chat` | Chat |
| `/search` | Search |
| `/flashcards` | Flashcards |
| `/study-plan` | Study planning |
| `/marketplace` | Browse marketplace listings |
| `/marketplace/:id` | Listing details |
| `/marketplace/create` | Create a listing |
| `/marketplace/my-listings` | Manage your listings |
| `/marketplace/onboarding` | Seller onboarding |
| `/marketplace/seller/:userId` | Seller profile |
| `/novels` | Browse novels |
| `/novels/:id` | Novel details |
| `/episodes/:id` | Read an episode |
| `/novels/become-writer` | Writer application/onboarding |
| `/writer/dashboard` | Writer dashboard (writer access required) |
| `/schools/:universitySlug` | University information and news |
| `/profile` | Account profile |
| `/premium` | Premium plan page |
| `/feedback` | Send feedback |
| `/privacy` | Privacy information |
| `/terms` | Terms |
| `/admin` | Administration (authorized accounts only) |

Some pages require data or services from the API, and the available content depends on the connected deployment.

## Technology

- React 19 and React Router
- Vite 8 for development and production builds
- Tailwind CSS 4
- Firebase Authentication, Firestore, Storage, and Analytics
- A separate NestJS API for application data and server-side features
- Socket.IO client for real-time chat features
- Cloudinary and S3-compatible storage integrations for media and file workflows
- KaTeX and Markdown rendering for formatted study content

## Requirements

- Node.js 24 is used by the Firebase Functions package; use a current Node.js release compatible with the installed Vite toolchain for the web client.
- npm
- A Firebase project configured for the application
- The UNILIB API running locally or reachable at a deployment URL

The backend is maintained separately in the `testyourself-api-fresh` project. Its README documents API installation, database migrations, runtime settings, and deployment. The web client alone does not start or provision the API, Firebase project, database, or object storage.

## Run the web app locally

From the web app directory:

```bash
npm install
npm run dev
```

Vite prints the local development URL in the terminal. To create and preview a production build:

```bash
npm run build
npm run preview
```

To run the configured linter:

```bash
npm run lint
```

## Environment configuration

Create a local `.env` file in the project root. Do not commit real credentials or private keys. The client reads these Vite variables:

```dotenv
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Set `VITE_API_URL` to the base URL of the running UNILIB API. For local development, the API project may use port `3000`; use the port actually configured for your backend. Firebase values come from the Firebase project settings for the web app. Firebase web configuration is client-side configuration; keep server credentials, signing secrets, AI provider keys, and storage secrets on the server and never put them in `VITE_*` variables.

Google sign-in also requires the relevant provider and authorized domains to be configured in Firebase/Google Identity Services. Some features depend on server-side environment configuration and may not work until the API is set up.

## Architecture and data flow

The app is a Vite-powered React single-page application. `src/main.jsx` mounts the app and its providers; `src/App.jsx` defines page routes. Firebase is initialized in `src/firebase.js`. API calls are centralized in `src/api.js`; the API base URL is selected in `src/config.js` from `VITE_API_URL` with a local development fallback.

Authenticated API requests include the current access token and credentials. The client attempts to refresh an expired session through the API refresh endpoint. Realtime messaging uses the Socket.IO client. Uploaded files use server upload endpoints and configured object-storage services; some media uploads also use Cloudinary. Offline study downloads are stored by the browser through the app's offline storage utilities.

## Deployment

The repository includes `vercel.json` with a single-page-app rewrite to `index.html`, so client-side routes can load directly on Vercel. Configure the same `VITE_*` values in the hosting provider's build environment. Deploy the API separately and point `VITE_API_URL` to its public base URL. The API, Firebase authentication settings, storage access, and allowed origins must agree with the deployed web domain.

`functions/` contains a separate Firebase Cloud Functions package. Deploy it only if the functions in that package are part of the deployment you intend to operate; it is not the Vite web app itself.

## Project layout

```text
src/                 React pages, shared components, contexts, and client utilities
src/components/      Reusable UI components
src/assets/          Local visual assets
public/              Static public assets
functions/           Firebase Cloud Functions package
firestore.rules      Firestore security rules
firestore.indexes.json Firestore composite indexes
vercel.json          Vercel SPA routing and response headers
```

## Security and operational notes

- Never commit `.env` files, private keys, service-account files, or production secrets.
- Keep privileged operations, role checks, payment verification, and provider secrets on the API/server side. Client-side route guards are for navigation and are not a replacement for backend authorization.
- Review Firestore rules and API authorization before deploying changes that affect access to student data, uploads, listings, chat, or admin functions.
- Use HTTPS for deployed web and API services and configure the API's allowed web origins for the deployed domain.
- The application contains student-submitted materials and marketplace content; operators should apply the platform's content, copyright, privacy, and moderation policies.

## License

No open-source license is declared in this repository. Contact the project owner before redistributing or reusing the application.
