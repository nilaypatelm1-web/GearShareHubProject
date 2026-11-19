import React from "react";
import { Container, Button } from "react-bootstrap";
import { Link } from "react-router-dom";

// Shown for any URL that does not match a route
const NotFound = () => (
  <Container className="text-center py-5">
    <h1 className="display-1 fw-bold">404</h1>
    <h3 className="mb-3">Page not found</h3>
    <p className="text-muted mb-4">The page you are looking for does not exist or may have been moved.</p>
    <Button as={Link} to="/" className="btn-accent me-2">
      Go to Home
    </Button>
    <Button as={Link} to="/gears" variant="outline-secondary">
      Browse Gears
    </Button>
  </Container>
);

export default NotFound;
