import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import AppNavbar from "./components/Navbar";
import Footer from "./components/Footer";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import OwnerProfile from "./pages/OwnerProfile";
import GearList from "./pages/GearList";
import GearDetail from "./pages/GearDetail";
import AddGear from "./pages/AddGear";
import EditGear from "./pages/EditGear";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

function App() {
  return (
    // AuthProvider wraps everything so any page can access login state
    <AuthProvider>
      {/* WishlistProvider sits inside AuthProvider because it needs the logged-in user */}
      <WishlistProvider>
      <BrowserRouter>
        <AppNavbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/gears" element={<GearList />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/gears/:id" element={<GearDetail />} />
          <Route path="/owner/:id" element={<OwnerProfile />} />

          {/* Protected routes — redirect to /login if not logged in */}
          <Route
            path="/add-gear"
            element={
              <PrivateRoute>
                <AddGear />
              </PrivateRoute>
            }
          />
          <Route
            path="/edit-gear/:id"
            element={
              <PrivateRoute>
                <EditGear />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* Admin-only route — non-admins are redirected */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* Any other URL */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </BrowserRouter>
      </WishlistProvider>
    </AuthProvider>
  );
}

export default App;
