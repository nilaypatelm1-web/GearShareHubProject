import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Container, Row, Col, Card, Spinner, Alert } from "react-bootstrap";
import api, { getErrorMessage } from "../api/axios";
import StarRating from "../components/StarRating";
import GearCard from "../components/GearCard";

// Copy of a gear with the owner id added
const withOwnerId = (gear, ownerId) => {
  const copy = Object.assign({}, gear);
  copy.owner = ownerId;
  return copy;
};

// Public page (no login): /owner/:id. The server only sends safe fields (never email / phone).
const OwnerProfile = () => {
  const { id } = useParams();
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOwner = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/users/${id}/public`);
        setOwner(res.data);
      } catch (err) {
        setOwner(null);
        if (err.response) {
          setError("This owner could not be found.");
        } else {
          setError(getErrorMessage(err)); // the server could not be reached
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOwner();
  }, [id]);

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error || !owner) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error || "This owner could not be found."}</Alert>
      </Container>
    );
  }

  const memberSince = new Date(owner.memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  let cityText = "";
  if (owner.city) cityText = `📍 ${owner.city} · `;

  let gearsEnding = "s";
  if (owner.gearsCount === 1) gearsEnding = "";

  return (
    <Container className="py-4">
      {/* header card */}
      <Card className="hover-card mb-4">
        <Card.Body className="d-flex flex-wrap align-items-center gap-4">
          <div className="owner-avatar">{owner.name.trim().charAt(0).toUpperCase()}</div>
          <div>
            <h2 className="fw-bold mb-1">{owner.name}</h2>
            <p className="mb-1 text-muted">
              {cityText}Member since {memberSince}
            </p>
            <div className="mb-1">
              <StarRating rating={owner.avgRating} count={owner.ratingCount} />
            </div>
            <p className="mb-0 small">
              {owner.gearsCount} gear{gearsEnding} listed
            </p>
          </div>
        </Card.Body>
      </Card>

      <h4 className="fw-bold mb-3">Gear by {owner.name}</h4>
      {owner.gears.length === 0 ? (
        <Alert variant="info">This owner has no gear listed right now.</Alert>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {/* the server does not send the owner id inside each gear, so add it (the heart is hidden on your own gear) */}
          {owner.gears.map((gear) => (
            <Col key={gear._id}>
              <GearCard gear={withOwnerId(gear, id)} />
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default OwnerProfile;
