import React from "react";
import { Link } from "react-router-dom";
import { Col, Card, Badge, Button, Alert } from "react-bootstrap";
import { getImageUrl } from "../api/axios";
import { getGearImages } from "../utils/gearImages";
import { formatServerDate } from "../utils/dateUtils";
import { isOverdue, isUpcoming } from "../utils/rentalStatus";
import AvailabilityBadge from "./AvailabilityBadge";
import CardImage from "./CardImage";
import ContactLines from "./ContactLines";

// Card for a gear I own (with edit/delete + info about its accepted rentals: current and upcoming)
const MyGearCard = ({ gear, activeRentals, onDelete, onTogglePause, onConfirmReturn, busyId }) => (
  <Col md={4} className="mb-4">
    <Card className="h-100 hover-card">
      <CardImage src={getImageUrl(getGearImages(gear)[0])} alt={gear.title} />
      <Card.Body className="d-flex flex-column">
        <Card.Title>{gear.title}</Card.Title>
        <div className="mb-2 d-flex align-items-start gap-2 flex-wrap">
          {/* "Rented now" or "Available from <date>" */}
          <AvailabilityBadge gear={gear} />
          {/* red badge when a current rental's due date has passed */}
          {activeRentals.some(isOverdue) && <Badge bg="danger">Overdue</Badge>}
          {gear.isPaused && <Badge bg="warning" text="dark">Paused</Badge>}
        </div>
        <p className="mb-1">₹{gear.pricePerDay} / day</p>
        <p className="mb-2 small section-description">
          📍 {gear.location || "Location not added"}
          {gear.deposit > 0 && <> &middot; Deposit ₹{gear.deposit}</>}
        </p>

        {activeRentals.map((r) => (
          <Alert
            key={r._id}
            variant={r.returnRequested ? "light" : "info"}
            className={`py-2 px-2 mb-2 small ${r.returnRequested ? "return-request-box" : ""}`}
          >
            {isUpcoming(r) && (
              <Badge bg="primary" className="mb-1">Upcoming &middot; starts {formatServerDate(r.startDate)}</Badge>
            )}
            <div>
              Rented to <strong>{r.renter?.name}</strong> for {r.days} days
            </div>
            Return by: {formatServerDate(r.dueDate)}
            <br />
            <ContactLines person={r.renter} />
            {r.lateFee > 0 && (
              <div className="late-fee mt-1">
                Late fee so far: ₹{r.lateFee} ({r.lateDays} day{r.lateDays > 1 ? "s" : ""})
              </div>
            )}
            {/* renter pressed "I returned it": highlighted, owner confirms */}
            {r.returnRequested && (
              <div className="mt-2">
                <strong>Renter says returned</strong>
                <br />
                <Button
                  size="sm"
                  className="btn-accent mt-1"
                  disabled={busyId === r._id}
                  onClick={() => onConfirmReturn(r._id)}
                >
                  Confirm return
                </Button>
              </div>
            )}
            {/* owner can also close a started rental when the renter never pressed the button */}
            {!r.returnRequested && !isUpcoming(r) && (
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline-secondary"
                  disabled={busyId === r._id}
                  onClick={() => onConfirmReturn(r._id)}
                >
                  Mark as returned
                </Button>
              </div>
            )}
          </Alert>
        ))}

        <div className="mt-auto d-flex gap-2 flex-wrap">
          <Button as={Link} to={`/gears/${gear._id}`} className="btn-accent" size="sm">View</Button>
          <Button as={Link} to={`/edit-gear/${gear._id}`} variant="outline-secondary" size="sm">Edit</Button>
          <Button
            variant={gear.isPaused ? "outline-success" : "outline-warning"}
            size="sm"
            onClick={() => onTogglePause(gear._id)}
          >
            {gear.isPaused ? "Resume" : "Pause"}
          </Button>
          <Button variant="outline-danger" size="sm" onClick={() => onDelete(gear._id)}>Delete</Button>
        </div>
      </Card.Body>
    </Card>
  </Col>
);

export default MyGearCard;
