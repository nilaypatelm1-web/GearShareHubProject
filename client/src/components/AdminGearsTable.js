import React from "react";
import { Link } from "react-router-dom";
import { Table, Badge, Button } from "react-bootstrap";

// Table of all gears. The admin cannot warn themselves about their own gear.
const AdminGearsTable = ({ gears, currentUserId, onWarn, onDelete }) => {
  return (
  <Table responsive striped hover className="mt-3 align-middle">
    <thead>
      <tr>
        <th>Title</th>
        <th>Owner</th>
        <th>Category</th>
        <th>Price/Day</th>
        <th>Status</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {gears.map((g) => (
        <tr key={g._id}>
          <td>{g.title}</td>
          <td>{g.owner?.name || "Deleted user"}</td>
          <td>{g.category}</td>
          <td>₹{g.pricePerDay}</td>
          <td>
            <Badge bg={g.rentedNow ? "secondary" : "success"}>{g.rentedNow ? "rented now" : "available"}</Badge>{" "}
            {g.isPaused && <Badge bg="warning" text="dark">paused</Badge>}
          </td>
          <td className="text-nowrap">
            <Button as={Link} to={`/gears/${g._id}`} size="sm" className="btn-accent me-2">
              View
            </Button>
            {/* warn the owner about this listing (not for the admin's own gear) */}
            {g.owner && g.owner._id !== currentUserId && (
              <Button
                size="sm"
                variant="outline-warning"
                className="me-2"
                onClick={() => onWarn(g.owner._id, g.owner.name, g._id, g.title)}
              >
                Warn Owner
              </Button>
            )}
            <Button
              size="sm"
              variant="outline-danger"
              onClick={() =>
                onDelete("gears", g._id, `Delete "${g.title}"? Its rentals, ratings and picture will also be deleted, even if it is rented right now.`)
              }
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

export default AdminGearsTable;
