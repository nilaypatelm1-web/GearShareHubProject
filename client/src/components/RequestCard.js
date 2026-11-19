import React from "react";
import { Col, Card, Button } from "react-bootstrap";
import { getImageUrl } from "../api/axios";
import { getGearImages } from "../utils/gearImages";
import { formatServerDate } from "../utils/dateUtils";
import CardImage from "./CardImage";

// Card for a rental request that someone sent for my gear (I can accept or reject it)
const RequestCard = ({ req, busy, onAccept, onReject }) => {
  return (
    <Col md={4} className="mb-4">
      <Card className="h-100 hover-card">
        <CardImage
          src={getImageUrl(getGearImages(req.gear)[0])}
          alt={req.gear?.title}
        />
        <Card.Body>
          <Card.Title>{req.gear?.title}</Card.Title>
          <p className="mb-1">From: <strong>{req.renter?.name}</strong></p>
          <p className="mb-1 small section-description">{req.renter?.email}</p>
          <p className="mb-1">{req.days} days &middot; ₹{req.totalPrice} total</p>
          <p className="mb-3 small">
            Start: <strong>{formatServerDate(req.startDate)}</strong>
            <br />
            Return: <strong>{formatServerDate(req.dueDate)}</strong>
          </p>
          <div className="d-flex gap-2">
            <Button
              className="btn-accent"
              size="sm"
              disabled={busy}
              onClick={() => onAccept(req._id)}
            >
              Accept
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              disabled={busy}
              onClick={() => onReject(req._id)}
            >
              Reject
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
};

export default RequestCard;
