import React from "react";
import { Table, Badge, Button } from "react-bootstrap";
import { formatDate } from "../utils/adminHelpers";

// Colour of the status badge for rentals
const statusColor = { pending: "warning", accepted: "primary", rejected: "danger", returned: "success", cancelled: "secondary" };

// Table of all rentals (who got what)
const AdminRentalsTable = ({ rentals, onDelete }) => {
  return (
  <Table responsive striped hover className="mt-3 align-middle">
    <thead>
      <tr>
        <th>Gear</th>
        <th>Renter</th>
        <th>Owner</th>
        <th>Days</th>
        <th>Total</th>
        <th>Status</th>
        <th>Due Date</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {rentals.map((r) => (
        <tr key={r._id}>
          <td>{r.gear?.title || "Deleted gear"}</td>
          <td>{r.renter?.name || "Deleted user"}</td>
          <td>{r.owner?.name || "Deleted user"}</td>
          <td>{r.days}</td>
          <td>₹{r.totalPrice}</td>
          <td>
            <Badge bg={statusColor[r.status]}>{r.status}</Badge>
          </td>
          <td>{formatDate(r.dueDate)}</td>
          <td>
            <Button
              size="sm"
              variant="outline-danger"
              onClick={() => onDelete("rentals", r._id, "Delete this rental record?")}
            >
              Delete
            </Button>
          </td>
        </tr>
      ))}
    </tbody>
  </Table>
  );
};

export default AdminRentalsTable;
