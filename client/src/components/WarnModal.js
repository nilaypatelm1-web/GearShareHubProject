import React from "react";
import { Modal, Button, Alert, Form } from "react-bootstrap";

// Pop-up to write a warning (used by the Users and Gears tabs).
// warnTarget = { userId, userName, gearId, gearTitle }, or null when the pop-up is closed.
const WarnModal = ({ warnTarget, message, onMessageChange, error, sending, onSend, onClose }) => {
  return (
    <Modal show={warnTarget !== null} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Warn {warnTarget?.userName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* shown only when opened from the Gears tab */}
        {warnTarget?.gearTitle && (
          <p className="small">
            Regarding gear: <strong>{warnTarget.gearTitle}</strong>
          </p>
        )}
        {error && <Alert variant="danger">{error}</Alert>}
        <Form.Group>
          <Form.Label>Warning message</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="e.g. The photo does not match the item described"
          />
          <Form.Text>Minimum 5 characters</Form.Text>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button className="btn-accent" onClick={onSend} disabled={sending}>
          {sending ? "Sending..." : "Send Warning"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default WarnModal;
