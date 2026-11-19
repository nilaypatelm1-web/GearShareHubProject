import React from "react";
import { Card, Badge, Button } from "react-bootstrap";

// Show a date nicely, or a dash if there is none
const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "-");

// Card for one warning the admin sent me (unread ones have a red border)
const WarningCard = ({ warning: w, onMarkRead }) => {
  return (
    <Card className={`mb-3 hover-card ${w.isRead ? "" : "border-danger"}`}>
      <Card.Body className="d-flex justify-content-between align-items-start">
        <div>
          <p className="mb-1">{w.message}</p>
          {w.gear && <p className="mb-1 small text-muted">Regarding: {w.gear.title}</p>}
          <p className="mb-0 small text-muted">{formatDate(w.createdAt)}</p>
        </div>
        {w.isRead ? (
          <Badge bg="secondary">Read</Badge>
        ) : (
          <Button size="sm" variant="outline-danger" onClick={() => onMarkRead(w._id)}>
            Mark as read
          </Button>
        )}
      </Card.Body>
    </Card>
  );
};

export default WarningCard;
