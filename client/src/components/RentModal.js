import React from "react";
import { Modal, Button, Alert, Form } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getToday, addDays, formatDay } from "../utils/dateUtils";
import { MIN_DAYS, MAX_DAYS, MAX_DAYS_AHEAD, getExcludeIntervals, getBookedDays } from "../utils/bookingDates";

// The pop-up where the renter picks the start date and the number of days.
// All the values live in GearDetail; this component only shows them and tells GearDetail what changed.
const RentModal = ({
  show,
  onClose,
  gear,
  booked,
  startDate,
  onStartDateChange,
  days,
  onDaysChange,
  modalError,
  requestSent,
  sending,
  hasConflict,
  endDate,
  totalPrice,
  daysValid,
  onConfirm,
}) => {
  // Booked days: disabled and coloured red in the calendar
  const excludeIntervals = getExcludeIntervals(booked);
  const bookedDays = getBookedDays(excludeIntervals);

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Rent "{gear.title}"</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {requestSent ? (
          <Alert variant="success" className="mb-0">
            Your request has been sent to the owner. You'll see it in your Dashboard once they respond.
          </Alert>
        ) : (
          <>
            {modalError && <Alert variant="danger">{modalError}</Alert>}
            <p className="mb-2"><strong>Price:</strong> ₹{gear.pricePerDay} / day</p>

            {/* Calendar pop-up: booked days are disabled and highlighted */}
            <Form.Group className="mb-3">
              <Form.Label>Start date</Form.Label>
              <DatePicker
                selected={startDate}
                onChange={onStartDateChange}
                minDate={getToday()}
                maxDate={addDays(getToday(), MAX_DAYS_AHEAD)}
                excludeDateIntervals={excludeIntervals}
                highlightDates={[{ "booked-day": bookedDays }]}
                dateFormat="dd MMM yyyy"
                className="form-control"
                placeholderText="Choose a start date"
                onKeyDown={(e) => e.preventDefault()} // pick from the calendar only
              />
              <Form.Text>Red days are already booked. You can book up to {MAX_DAYS_AHEAD} days ahead.</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Number of days (max {MAX_DAYS})</Form.Label>
              <Form.Control
                type="number"
                min={MIN_DAYS}
                max={MAX_DAYS}
                value={days}
                onChange={(e) => onDaysChange(e.target.value)}
              />
            </Form.Group>

            {hasConflict && (
              <p className="text-danger mb-2">
                These dates include a booked day. Please choose a different start date or fewer days.
              </p>
            )}
            {endDate && <p className="mb-1">Return by: <strong>{formatDay(endDate)}</strong></p>}
            <h5>Total: ₹{totalPrice}</h5>
            {gear.deposit > 0 && (
              <p className="small text-muted mb-0">
                Refundable deposit: ₹{gear.deposit}, paid directly to owner (not included in the total).
              </p>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        {requestSent ? (
          <Button className="btn-accent" onClick={onClose}>Close</Button>
        ) : (
          <>
            <Button variant="outline-secondary" onClick={onClose}>Cancel</Button>
            <Button
              className="btn-accent"
              onClick={onConfirm}
              disabled={sending || hasConflict || !startDate || !daysValid}
            >
              {sending ? "Sending..." : "Confirm"}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default RentModal;
