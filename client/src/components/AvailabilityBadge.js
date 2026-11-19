import React from "react";
import { Badge } from "react-bootstrap";
import { formatServerDate } from "../utils/dateUtils";

// "Rented now" (with the date it frees up) or "Available from <date>".
// Uses the rentedNow / availableFrom fields the server computes for every gear.
const AvailabilityBadge = ({ gear }) => {
  if (gear.rentedNow) {
    return (
      <span className="text-end">
        <Badge bg="danger">Rented now</Badge>
        <div className="small section-description ">Available from {formatServerDate(gear.availableFrom)}</div>
      </span>
    );
  }
  return <Badge bg="success">Available from {formatServerDate(gear.availableFrom)}</Badge>;
};

export default AvailabilityBadge;
