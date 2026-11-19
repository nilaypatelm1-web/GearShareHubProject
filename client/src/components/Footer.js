import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="app-footer">
      <Container>
        <Row className="align-items-center">
          <Col md={6} className="mb-3 mb-md-0">
            <h5 className="text-white mb-1">
              🏔️ GearShare<span className="brand-accent">Hub</span>
            </h5>
            <small>Rent · Share · Explore</small>
          </Col>
          <Col md={6} className="text-md-end">
            <Link to="/">Home</Link>
            <Link to="/gears">Browse Gear</Link>
            <Link to="/add-gear">Add Gear</Link>
          </Col>
        </Row>
        <hr className="border-secondary mt-3 mb-2" />
        <small>&copy; {new Date().getFullYear()} GearShareHub. </small>
      </Container>
    </footer>
  );
};

export default Footer;
