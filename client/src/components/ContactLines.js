import React from "react";

// Pickup contact lines: email + phone (or "Phone not added"). Only used for ACCEPTED rentals.
const ContactLines = ({ person }) => (
  <>
    Email: <a href={`mailto:${person?.email}`}>{person?.email}</a>
    <br />
    Phone: {person?.phone ? <a href={`tel:${person.phone}`}>{person.phone}</a> : <span className="text-muted">Phone not added</span>}
  </>
);

export default ContactLines;
