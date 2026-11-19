import React, { useState } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";

const CATEGORIES = [
  { name: "Camping", icon: "⛺" },
  { name: "Camera", icon: "📷" },
  { name: "Sports", icon: "⚽" },
  { name: "Tools", icon: "🛠️" },
  { name: "Electronics", icon: "💻" },
  { name: "Other", icon: "📦" },
];

const STEPS = [
  { title: "Find Gear", desc: "Search or browse the gear you need for your next adventure." },
  { title: "Rent It", desc: "Log in and rent it directly — no waiting, no hassle." },
  { title: "Enjoy", desc: "Get your gear and make the most of it. Return it when you're done." },
];

const Home = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search) {
      navigate(`/gears?search=${encodeURIComponent(search)}`);
    } else {
      navigate("/gears");
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="hero-section">
        <Container>
          <Row className="align-items-center">
            <Col lg={8} className="mx-auto text-center">
              <div className="hero-eyebrow mb-2">Rent &bull; Share &bull; Explore</div>
              <h1>
                Find Gear. <span className="brand-accent">Share</span> Gear.
              </h1>
              <p className="lead mb-4">
                Rent the gear you need for your next adventure, or list what you already own
                and let others rent it from you.
              </p>
              <Form onSubmit={handleSearch} className="hero-search d-flex mx-auto" style={{ maxWidth: "480px" }}>
                <Form.Control
                  type="text"
                  placeholder="Search for tents, cameras, gaming gear..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button type="submit" className="btn-accent">Search</Button>
              </Form>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Categories */}
      <section className="py-5">
        <Container>
          <Row className="mb-4">
            <Col>
              <h2 className="h3 fw-bold mb-1">Browse Categories</h2>
              <p className="text-muted mb-0">Find the perfect gear for your needs.</p>
            </Col>
          </Row>
          <Row className="g-3">
            {CATEGORIES.map((cat) => (
              <Col key={cat.name} xs={6} md={4} lg={2}>
                <Link to={`/gears?category=${encodeURIComponent(cat.name)}`} className="category-card">
                  <div className="category-icon">{cat.icon}</div>
                  <div className="fw-semibold">{cat.name}</div>
                </Link>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* How it works */}
      <section className="how-it-works">
        <Container>
          <h2 className="h3 fw-bold mb-1">How GearShareHub Works</h2>
          <p className="section-description mb-5">Get your gear in just a few easy steps.</p>
          <Row className="g-4 text-center">
            {STEPS.map((step, i) => (
              <Col key={step.title} md={4}>
                <div className="step-circle">{i + 1}</div>
                <h5>{step.title}</h5>
                <p className="section-description mb-0">{step.desc}</p>
              </Col>
            ))}
          </Row>
          <div className="text-center mt-5">
            <Button as={Link} to="/add-gear" size="lg" className="btn-accent">
              List Your Gear
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
};

export default Home;
