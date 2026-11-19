import React from "react";
import { Alert, Table, Badge } from "react-bootstrap";
import { formatDate } from "../utils/adminHelpers";

// Content of the "Warnings Sent" tab (all warnings sent by the admin)
const AdminWarningsList = ({ warnings }) => {
  return (
    <>
    {warnings.length === 0 ? (
      <Alert variant="info" className="mt-3">No warnings have been sent yet.</Alert>
    ) : (
      <Table responsive striped hover className="mt-3 align-middle">
        <thead>
          <tr>
            <th>User</th>
            <th>Message</th>
            <th>Gear</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {warnings.map((w) => (
            <tr key={w._id}>
              <td>{w.user?.name || "Deleted user"}</td>
              <td>{w.message}</td>
              <td>{w.gear?.title || "—"}</td>
              <td>{formatDate(w.createdAt)}</td>
              <td>
                <Badge bg={w.isRead ? "success" : "secondary"}>{w.isRead ? "Read" : "Unread"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    )}
    </>
  );
};

export default AdminWarningsList;
