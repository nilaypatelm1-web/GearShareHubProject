import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Container, Row, Col, Badge, Button, Spinner, Alert } from "react-bootstrap";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import StarRating from "../components/StarRating";
import WishlistButton from "../components/WishlistButton";
import GearGallery from "../components/GearGallery";
import RatingSection from "../components/RatingSection";
import RentModal from "../components/RentModal";
import { getToday, addDays, toYMD, fromServerDate, formatDay, formatServerDate, rangesOverlap } from "../utils/dateUtils";
import { MIN_DAYS, MAX_DAYS, findFirstFreeDay } from "../utils/bookingDates";

const GearDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [gear, setGear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0); // which picture is shown big
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Booked ranges from the server, converted to local dates: [{ start, due }]
  const [booked, setBooked] = useState([]);

  // Rent modal state
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState(getToday());
  const [days, setDays] = useState(1);
  const [modalError, setModalError] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  // Rating state
  const [canReview, setCanReview] = useState(false); // is this user allowed to rate?
  const [reviewMessage, setReviewMessage] = useState(""); // reason shown when they are not allowed
  const [myRating, setMyRating] = useState(0); // the user's current rating (0 = not rated yet)
  const [ratingError, setRatingError] = useState("");
  const [ratingSaved, setRatingSaved] = useState(false);
  const [ratingSending, setRatingSending] = useState(false);

  // Loads the booked date ranges (accepted, not returned) of this gear
  const loadBooked = async () => {
    try {
      const res = await api.get(`/gears/${id}/booked-dates`);
      const list = res.data.map((b) => ({ start: fromServerDate(b.startDate), due: fromServerDate(b.dueDate) }));
      setBooked(list);
      return list;
    } catch (err) {
      setBooked([]);
      return [];
    }
  };

  // Checks if the logged-in user may rate this gear and what they rated before
  const loadRatingInfo = async () => {
    if (!user) return; // guests cannot rate
    try {
      const res = await api.get(`/reviews/can-review/${id}`);
      setCanReview(res.data.canReview);
      setReviewMessage(res.data.message);
      setMyRating(res.data.myRating || 0);
    } catch (err) {
      setCanReview(false);
      setReviewMessage("Could not check rating permission.");
    }
  };

  // Load the gear and its booked dates when the page opens
  useEffect(() => {
    const fetchGear = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/gears/${id}`);
        setGear(res.data);
        setActiveImage(0);
      } catch (err) {
        setError(err.response ? "Gear not found or failed to load." : getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchGear();
    loadBooked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadRatingInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  // Clicking a star saves (or updates) the rating right away, then refreshes the average
  const handleRate = async (stars) => {
    setRatingError("");
    setRatingSaved(false);
    setRatingSending(true);
    try {
      await api.post("/reviews", { gearId: id, rating: stars });
      setMyRating(stars);
      setRatingSaved(true);
      const gearRes = await api.get(`/gears/${id}`); // new avgRating / ratingCount
      setGear(gearRes.data);
    } catch (err) {
      setRatingError(getErrorMessage(err, "Failed to save rating."));
    } finally {
      setRatingSending(false);
    }
  };

  const ownerId = gear?.owner?._id;
  const isOwner = Boolean(user) && Boolean(gear) && ownerId === user.id;

  // The chosen range: start .. start + days (return day). Used for the live summary and the conflict check.
  const numDays = Number(days);
  const daysValid = Number.isInteger(numDays) && numDays >= MIN_DAYS && numDays <= MAX_DAYS;
  let endDate = null;
  if (startDate && daysValid) endDate = addDays(startDate, numDays);

  let hasConflict = false;
  if (endDate) {
    hasConflict = booked.some((b) => rangesOverlap(startDate, endDate, b.start, b.due));
  }

  const handleOpenModal = async () => {
    setModalError("");
    setRequestSent(false);
    setDays(1);
    const list = await loadBooked(); // fresh booked dates every time the modal opens
    setStartDate(findFirstFreeDay(list)); // start on the first day that is not booked
    setShowModal(true);
  };

  const handleSendRequest = async () => {
    setModalError("");
    if (!startDate) {
      setModalError("Please choose a start date.");
      return;
    }
    if (!daysValid) {
      setModalError(`Days must be a whole number between ${MIN_DAYS} and ${MAX_DAYS}`);
      return;
    }
    if (hasConflict) {
      setModalError("The chosen dates include a booked day.");
      return;
    }
    setActionLoading(true);
    try {
      await api.post("/rentals", { gearId: gear._id, startDate: toYMD(startDate), days: numDays });
      setRequestSent(true);
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to send request."));
    } finally {
      setActionLoading(false);
    }
  };

  // Owner pauses / resumes the listing (the server toggles it)
  const handleTogglePause = async () => {
    setActionError("");
    setActionLoading(true);
    try {
      const res = await api.put(`/gears/${id}/pause`);
      setGear((prev) => Object.assign({}, prev, { isPaused: res.data.isPaused }));
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to update the listing."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this gear listing? Its rentals, ratings and picture will also be deleted.")) return;
    setActionError("");
    setActionLoading(true);
    try {
      await api.delete(`/gears/${id}`);
      navigate("/gears");
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to delete gear."));
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  const totalPrice = gear.pricePerDay * (daysValid ? numDays : 0);

  return (
    <Container className="py-4">
      {actionError && <Alert variant="danger">{actionError}</Alert>}

      <Row className="g-4">
        <Col md={6}>
          <GearGallery gear={gear} activeImage={activeImage} onSelect={setActiveImage} />
        </Col>

        <Col md={6}>
          <div className="d-flex align-items-start justify-content-between gap-2">
            <h2 className="fw-bold">{gear.title}</h2>
            <WishlistButton gearId={gear._id} ownerId={gear.owner?._id} inline />
          </div>
          {/* average rating + number of ratings (everyone sees this) */}
          <div className="mb-2">
            <StarRating rating={gear.avgRating} count={gear.ratingCount} />
          </div>
          {/* how many times this gear was rented (accepted + returned) */}
          <p className="text-muted mb-2">
            Rented {gear.rentCount || 0} {gear.rentCount === 1 ? "time" : "times"}
          </p>
          <Badge bg="secondary" className="mb-2">{gear.category}</Badge>{" "}
          {gear.rentedNow && <Badge bg="danger" className="mb-2">Rented now</Badge>}
          <p className="mb-2 fw-semibold">Available from {formatServerDate(gear.availableFrom)}</p>

          <p className="mt-3">{gear.description}</p>
          <h4 className="mb-2 brand-accent-dark">₹{gear.pricePerDay} / day</h4>
          <p className="mb-1">📍 Pickup location: {gear.location ? <strong>{gear.location}</strong> : <span className="text-muted">Not added</span>}</p>
          <p className="mb-2">
            {gear.deposit > 0
              ? `Refundable deposit: ₹${gear.deposit}, paid directly to owner`
              : "No deposit required"}
          </p>
          <p className="text-muted">
            Listed by:{" "}
            {gear.owner?._id ? <Link to={`/owner/${gear.owner._id}`}>{gear.owner.name}</Link> : "Unknown"}
          </p>

          {/* Booked dates: accepted rentals that are not over yet */}
          {booked.length > 0 && (
            <div className="mb-3">
              <small className="fw-semibold">Booked dates</small>
              <ul className="booked-list mb-0 ps-3">
                {booked.map((b, i) => (
                  <li key={i}>
                    {formatDay(b.start)} to {formatDay(b.due)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rent button — for logged-in users who don't own this gear (even when it is rented now) */}
          {/* Paused by the owner: no new requests, so show a notice instead of the Rent button */}
          {!isOwner && gear.isPaused && (
            <Alert variant="warning" className="py-2">Paused by owner. This gear cannot be rented right now.</Alert>
          )}
          {user && !isOwner && !gear.isPaused && (
            <Button className="btn-accent me-2" onClick={handleOpenModal}>
              Rent this Gear
            </Button>
          )}

          {/* Owner-only actions */}
          {isOwner && (
            <>
              {gear.isPaused && <Badge bg="warning" text="dark" className="me-2">Paused</Badge>}
              <Button
                variant={gear.isPaused ? "outline-success" : "outline-warning"}
                className="me-2"
                onClick={handleTogglePause}
                disabled={actionLoading}
              >
                {gear.isPaused ? "Resume" : "Pause"}
              </Button>
              <Button as={Link} to={`/edit-gear/${gear._id}`} variant="outline-secondary" className="me-2">
                Edit
              </Button>
              <Button variant="outline-danger" onClick={handleDelete} disabled={actionLoading}>
                {actionLoading ? "Deleting..." : "Delete"}
              </Button>
            </>
          )}

          {!user && !gear.isPaused && <p className="text-muted mt-3">Log in to rent this gear.</p>}
        </Col>
      </Row>

      <RatingSection
        user={user}
        canReview={canReview}
        reviewMessage={reviewMessage}
        myRating={myRating}
        ratingError={ratingError}
        ratingSaved={ratingSaved}
        ratingSending={ratingSending}
        onRate={handleRate}
      />

      {/* Rent request modal */}
      <RentModal
        show={showModal}
        onClose={() => setShowModal(false)}
        gear={gear}
        booked={booked}
        startDate={startDate}
        onStartDateChange={setStartDate}
        days={days}
        onDaysChange={setDays}
        modalError={modalError}
        requestSent={requestSent}
        sending={actionLoading}
        hasConflict={hasConflict}
        endDate={endDate}
        totalPrice={totalPrice}
        daysValid={daysValid}
        onConfirm={handleSendRequest}
      />
    </Container>
  );
};

export default GearDetail;
