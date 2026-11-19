import React from "react";
import { Link } from "react-router-dom";
import { Card, Badge, Button } from "react-bootstrap";
import { getImageUrl } from "../api/axios";
import { getGearImages } from "../utils/gearImages";
import StarRating from "./StarRating";
import AvailabilityBadge from "./AvailabilityBadge";
import WishlistButton from "./WishlistButton";

// One gear card, shared by Browse Gears, the Dashboard wishlist and the owner profile page.
// (The parent puts it inside a <Col>.) The card shows the FIRST image.
const GearCard = ({ gear }) => {
  const firstImage = getGearImages(gear)[0];

  // the owner can be a populated object ({ _id, name, city }) or just an id
  let ownerId = gear.owner;
  if (gear.owner && typeof gear.owner === "object") ownerId = gear.owner._id;

  // long descriptions are cut after 80 letters
  let shortDescription = gear.description;
  if (gear.description.length > 80) shortDescription = gear.description.slice(0, 80) + "...";

  return (
    <Card className="h-100 hover-card">
      <div style={{ height: "200px", background: "white", overflow: "hidden", position: "relative" }} className="d-flex align-items-center justify-content-center">
        {/* badges on the left: top rented gear(s) and paused listings */}
        <div className="d-flex flex-column align-items-start gap-1" style={{ position: "absolute", top: "8px", left: "8px", zIndex: 1 }}>
          {gear.isMostRented && (
            <Badge bg="warning" text="dark">Most Rented</Badge>
          )}
          {/* shown when the owner paused the listing (no new requests) */}
          {gear.isPaused && (
            <Badge bg="warning" text="dark">Paused</Badge>
          )}
        </div>
        <WishlistButton gearId={gear._id} ownerId={ownerId} />
        <img
          src={getImageUrl(firstImage) || "https://placehold.co/400x250?text=No+Image"}
          alt={gear.title}
          style={{ height: "100%", width: "100%", objectFit: "contain", padding: "10px" }}
        />
      </div>
      <Card.Body className="d-flex flex-column">
        <Card.Title>{gear.title}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">{gear.category}</Card.Subtitle>
        {/* star rating + review count */}
        <div className="mb-2">
          <StarRating rating={gear.avgRating} count={gear.ratingCount} />
        </div>
        <Card.Text className="flex-grow-1">
          {shortDescription}
        </Card.Text>
        {gear.location && <div className="small section-description mb-1">📍 {gear.location}</div>}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <strong>₹{gear.pricePerDay} / day</strong>
          {/* "Rented now" or "Available from <date>" (computed by the server) */}
          <AvailabilityBadge gear={gear} />
        </div>
        <Button as={Link} to={`/gears/${gear._id}`} className="btn-accent">
          View Details
        </Button>
      </Card.Body>
    </Card>
  );
};

export default GearCard;
