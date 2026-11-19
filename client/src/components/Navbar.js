import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const AppNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <Navbar expand="lg" className="app-navbar py-3" variant="dark">
      <Container>
        <Navbar.Brand as={Link} to="/">
          🏔️ GearShare<span className="brand-accent">Hub</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" className={isActive("/") ? "active" : ""}>
              Home
            </Nav.Link>
            <Nav.Link as={Link} to="/gears" className={isActive("/gears") ? "active" : ""}>
              Browse Gear
            </Nav.Link>
            {user && (
              <Nav.Link as={Link} to="/add-gear" className={isActive("/add-gear") ? "active" : ""}>
                Add Gear
              </Nav.Link>
            )}
            {user && (
              <Nav.Link as={Link} to="/dashboard" className={isActive("/dashboard") ? "active" : ""}>
                Dashboard
              </Nav.Link>
            )}
            {/* Admin link — only shown to admins */}
            {user && user.role === "admin" && (
              <Nav.Link as={Link} to="/admin" className={isActive("/admin") ? "active" : ""}>
                Admin
              </Nav.Link>
            )}
          </Nav>
          <Nav className="align-items-lg-center gap-2">
            {user ? (
              <>
                <NotificationBell />
                <span className="text-light small d-none d-lg-inline">Hi, {user.name}</span>
                <Button size="sm" className="btn-accent" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login">Login</Nav.Link>
                <Button as={Link} to="/register" size="sm" className="btn-accent">
                  Register
                </Button>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
