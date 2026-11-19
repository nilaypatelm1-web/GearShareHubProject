import React from "react";
import { Link } from "react-router-dom";
import { Alert, Card } from "react-bootstrap";
import StarRating from "./StarRating";

// The "Rating" box on the gear page. It shows one of three things:
// 1) a login message (guest), 2) the star picker (allowed to rate), 3) the reason why rating is not allowed
const RatingSection = ({ user, canReview, reviewMessage, myRating, ratingError, ratingSaved, ratingSending, onRate }) => {
  let content;

  if (!user) {
    content = (
      <Alert variant="info">
        <Link to="/login">Log in</Link> to rate this gear.
      </Alert>
    );
  } else if (canReview) {
    content = (
      <Card>
        <Card.Body>
          <h5 className="mb-2">{myRating > 0 ? "Update your rating" : "Rate this gear"}</h5>
          {ratingError && <Alert variant="danger">{ratingError}</Alert>}
          <StarRating interactive value={myRating} onChange={onRate} disabled={ratingSending} />
          <small className="ms-2 text-muted">
            {myRating > 0 ? `Your rating: ${myRating} / 5` : "Click a star"}
          </small>
          {ratingSaved && <div className="small text-success mt-1">Rating saved.</div>}
        </Card.Body>
      </Card>
    );
  } else {
    content = <Alert variant="secondary">{reviewMessage}</Alert>;
  }

  return (
    <div className="mt-5">
      <h4 className="fw-bold mb-3">Rating</h4>
      {content}
    </div>
  );
};

export default RatingSection;
