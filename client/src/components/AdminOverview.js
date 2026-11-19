import React from "react";
import { Row, Col, Card } from "react-bootstrap";
import StarRating from "./StarRating";

// One stat card used in the Overview tab
const StatCard = ({ label, value }) => (
  <Col xs={6} md={4} lg={3} className="mb-3">
    <Card className="hover-card h-100 text-center">
      <Card.Body>
        <h2 className="fw-bold">{value}</h2>
        <Card.Subtitle>{label}</Card.Subtitle>
      </Card.Body>
    </Card>
  </Col>
);

// Content of the Overview tab: the numbers + the two top-3 lists (they come from /api/admin/stats)
const AdminOverview = ({ stats }) => {
  return (
    <>
    {stats && (
      <Row className="mt-3">
        <StatCard label="Total Users" value={stats.users} />
        <StatCard label="Total Gears" value={stats.gears} />
        <StatCard label="Total Rentals" value={stats.rentals.total} />
        <StatCard label="Pending" value={stats.rentals.pending} />
        <StatCard label="Active (Accepted)" value={stats.rentals.accepted} />
        <StatCard label="Returned" value={stats.rentals.returned} />
      </Row>
    )}

    {/* Top 3 lists (come from /api/admin/stats) */}
    {stats && (
      <Row className="mt-2">
        <Col md={6} className="mb-3">
          <Card className="hover-card h-100">
            <Card.Body>
              <Card.Title>Most rented gear (top 3)</Card.Title>
              {(stats.mostRentedGears || []).length === 0 ? (
                <p className="mb-0">No rentals yet.</p>
              ) : (
                <ol className="mb-0">
                  {stats.mostRentedGears.map((g) => (
                    <li key={g._id}>
                      {g.title} — <strong>{g.rentCount}</strong> {g.rentCount === 1 ? "rental" : "rentals"}
                    </li>
                  ))}
                </ol>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-3">
          <Card className="hover-card h-100">
            <Card.Body>
              <Card.Title>Top rated gear (top 3)</Card.Title>
              {(stats.topRatedGears || []).length === 0 ? (
                <p className="mb-0">No reviews yet.</p>
              ) : (
                <ol className="mb-0">
                  {stats.topRatedGears.map((g) => (
                    <li key={g._id}>
                      {g.title} — <StarRating rating={g.avgRating} count={g.ratingCount} />
                    </li>
                  ))}
                </ol>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    )}
    </>
  );
};

export default AdminOverview;
