import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Register from './pages/auth/Register.jsx';
import Login from './pages/auth/Login.jsx';
import WorkerDashboard from './pages/worker/WorkerDashboard.jsx';
import WorkerSetup from './pages/worker/WorkerSetup.jsx';
import QRDisplay from './pages/worker/QRDisplay.jsx';
import WorkerReviews from './pages/worker/WorkerReviews.jsx';
import ScanQR from './pages/client/ScanQR.jsx';
import SendTip from './pages/client/SendTip.jsx';
import History from './pages/History.jsx';
import Profile from './pages/Profile.jsx';
import Contacts from './pages/Contacts.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import BottomNav from './components/BottomNav.jsx';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/worker/setup"
          element={
            <ProtectedRoute>
              <WorkerSetup />
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

        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <ScanQR />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tip/:username"
          element={
            <ProtectedRoute>
              <SendTip />
            </ProtectedRoute>
          }
        />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </>
  );
}
