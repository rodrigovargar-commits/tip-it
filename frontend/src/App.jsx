import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import Landing from './pages/Landing.jsx';
import Home from './pages/Home.jsx';
const JoinInterest = lazy(() => import('./pages/JoinInterest.jsx'));
const Register = lazy(() => import('./pages/auth/Register.jsx'));
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const WorkerDashboard = lazy(() => import('./pages/worker/WorkerDashboard.jsx'));
const WorkerSetup = lazy(() => import('./pages/worker/WorkerSetup.jsx'));
const WorkerOnboarding = lazy(() => import('./pages/worker/WorkerOnboarding.jsx'));
const QRDisplay = lazy(() => import('./pages/worker/QRDisplay.jsx'));
const WorkerReviews = lazy(() => import('./pages/worker/WorkerReviews.jsx'));
const ScanQR = lazy(() => import('./pages/client/ScanQR.jsx'));
const SendTip = lazy(() => import('./pages/client/SendTip.jsx'));
const History = lazy(() => import('./pages/History.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Contacts = lazy(() => import('./pages/Contacts.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const Terms = lazy(() => import('./pages/Terms.jsx'));
const HowItWorks = lazy(() => import('./pages/HowItWorks.jsx'));
import ProtectedRoute from './components/ProtectedRoute.jsx';
import BottomNav from './components/BottomNav.jsx';
import CookieBanner from './components/CookieBanner.jsx';
import RouteMeta from './components/RouteMeta.jsx';
import NotFound from './pages/NotFound.jsx';
import Spinner from './components/Spinner.jsx';
import TopBar from './components/TopBar.jsx';

export default function App() {
  return (
    <>
      <RouteMeta />
      <TopBar />
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner />
          </div>
        }
      >
      <Routes>
        {/* Web visitors get the public marketing page; the installed iOS/Android app
            opens straight into the in-app home. */}
        <Route path="/" element={Capacitor.isNativePlatform() ? <Landing /> : <Home />} />
        <Route path="/unete" element={<JoinInterest />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacidad" element={<PrivacyPolicy />} />
        <Route path="/terminos" element={<Terms />} />
        <Route path="/como-funciona" element={<HowItWorks />} />

        <Route
          path="/worker/setup"
          element={
            <ProtectedRoute>
              <WorkerSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/onboarding"
          element={
            <ProtectedRoute requireWorker>
              <WorkerOnboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/dashboard"
          element={
            <ProtectedRoute requireWorker>
              <WorkerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/qr"
          element={
            <ProtectedRoute requireWorker>
              <QRDisplay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/reviews"
          element={
            <ProtectedRoute requireWorker>
              <WorkerReviews />
            </ProtectedRoute>
          }
        />
        <Route path="/worker/stripe/return" element={<Navigate to="/worker/dashboard" replace />} />
        <Route path="/worker/stripe/refresh" element={<Navigate to="/worker/dashboard" replace />} />

        {/* No ProtectedRoute on /scan or /tip/:username: sending a payment never
            requires an account upfront — only receiving one does. */}
        <Route path="/scan" element={<ScanQR />} />
        <Route path="/tip/:username" element={<SendTip />} />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <Contacts />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      <BottomNav />
      <CookieBanner />
    </>
  );
}
