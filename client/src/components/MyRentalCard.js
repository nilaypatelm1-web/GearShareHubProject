import React from "react";
import { Link } from "react-router-dom";
import { Col, Card, Badge, Button } from "react-bootstrap";
import { getImageUrl } from "../api/axios";
import { getGearImages } from "../utils/gearImages";
import { formatServerDate } from "../utils/dateUtils";
import { isOverdue, isUpcoming } from "../utils/rentalStatus";
import CardImage from "./CardImage";
import ContactLines from "./ContactLines";

// Red late-fee text. Active rentals show the running fee, returned rentals show the final fee.
const LateFeeText = ({ rental }) => {
  if (!rental.lateFee || rental.lateFee <= 0) return null;
  const when = rental.status === "returned" ? "returned late" : "overdue";
  return (
    <p className="late-fee mb-1 small">
      Late fee: ₹{rental.lateFee} ({rental.lateDays} day{rental.lateDays > 1 ? "s" : ""} {when})
    </p>
  );
};

// Card for something I'm renting (or have requested to rent)
const MyRentalCard = ({ rental, onRequestReturn, onCancel, busy }) => {
  const statusColor = { pending: "warning", accepted: "success", rejected: "danger", returned: "secondary", cancelled: "secondary" };
  return (
    <Col md={4} className="mb-4">
      <Card className="h-100 hover-card">
        <CardImage
          src={getImageUrl(getGearImages(rental.gear)[0])}
          alt={rental.gear?.title}
        />
        <Card.Body className="d-flex flex-column">
          <Card.Title>{rental.gear?.title || "Gear removed"}</Card.Title>
          <div className="mb-2">
            <Badge bg={statusColor[rental.status]}>{rental.status}</Badge>
            {/* blue badge for accepted rentals that start in the future */}
            {isUpcoming(rental) && (
              <Badge bg="primary" className="ms-2">Upcoming &middot; {formatServerDate(rental.startDate)}</Badge>
            )}
            {isOverdue(rental) && <Badge bg="danger" className="ms-2">Overdue</Badge>}
          </div>
          <p className="mb-1">{rental.days} days &middot; ₹{rental.totalPrice} total</p>
          <LateFeeText rental={rental} />
          {(rental.status === "accepted" || rental.status === "returned") && rental.lateFee > 0 && (
            <p className="mb-1 small">
              <strong>Total payable: ₹{rental.totalPrice + rental.lateFee}</strong>
            </p>
          )}
          {rental.startDate && (
            <p className="mb-1 small section-description">
              {formatServerDate(rental.startDate)} to {formatServerDate(rental.dueDate)}
            </p>
          )}
          {rental.status === "accepted" && (
            <>
              <p className="mb-1 small section-description">Return by: {formatServerDate(rental.dueDate)}</p>
              <p className="mb-2 small">
                <strong>Pickup details</strong>
                <br />
                📍 {rental.gear?.location || "Location not added"}
                <br />
                Owner: {rental.owner?.name}
                <br />
                <ContactLines person={rental.owner} />
              </p>
            </>
          )}
          <div className="mt-auto d-flex gap-2">
            {rental.gear && (
              <Button as={Link} to={`/gears/${rental.gear._id}`} className="btn-accent" size="sm">View</Button>
            )}
            {/* "I returned it" only after the rental has started; then wait for the owner */}
            {rental.status === "accepted" && !isUpcoming(rental) && !rental.returnRequested && (
              <Button variant="outline-danger" size="sm" disabled={busy} onClick={() => onRequestReturn(rental._id)}>
                I returned it
              </Button>
            )}
            {rental.status === "accepted" && rental.returnRequested && (
              <Badge bg="warning" text="dark" className="align-self-center">
                Waiting for owner to confirm
              </Badge>
            )}
            {/* renter can withdraw a request while it is still pending */}
            {rental.status === "pending" && (
              <Button variant="outline-danger" size="sm" disabled={busy} onClick={() => onCancel(rental._id)}>
                Cancel Request
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
};

export default MyRentalCard;
