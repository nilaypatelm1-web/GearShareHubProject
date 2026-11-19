import React from "react";
import { Table, Badge, Button } from "react-bootstrap";
import { formatDate } from "../utils/adminHelpers";

// Table of all users. The admin cannot warn, block or delete their own row.
const AdminUsersTable = ({ users, currentUserId, warningCount, onWarn, onToggleBlock, onDelete }) => {
  return (
  <Table responsive striped hover className="mt-3 align-middle">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
        <th>Warnings</th>
        <th>Joined</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {users.map((u) => (
        <tr key={u._id}>
          <td>
            {u.name}{" "}
            {u.isBlocked && <Badge bg="danger">Blocked</Badge>}
          </td>
          <td>{u.email}</td>
          <td>
            <Badge bg={u.role === "admin" ? "primary" : "secondary"}>{u.role || "user"}</Badge>
          </td>
          <td>
            {warningCount[u._id] || 0}{" "}
            {/* simple rule: 3 or more warnings gets a red badge (no auto-ban) */}
            {(warningCount[u._id] || 0) >= 3 && <Badge bg="danger">3+ warnings</Badge>}
          </td>
          <td>{formatDate(u.createdAt)}</td>
          <td className="text-nowrap">
            {/* admin cannot warn or delete their own account */}
            {u._id !== currentUserId && (
              <>
                {/* admins cannot be warned, so no Warn button on admin rows */}
                {u.role !== "admin" && (
                  <Button
                    size="sm"
                    variant="outline-warning"
                    className="me-2"
                    onClick={() => onWarn(u._id, u.name)}
                  >
                    Warn
                  </Button>
                )}
                {/* admins cannot be blocked */}
                {u.role !== "admin" && (
                  <Button
                    size="sm"
                    variant={u.isBlocked ? "outline-success" : "outline-secondary"}
                    className="me-2"
                    onClick={() => onToggleBlock(u)}
                  >
                    {u.isBlocked ? "Unblock" : "Block"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() =>
                    onDelete("users", u._id, `Delete ${u.name}? Their gears, rentals, ratings, warnings and notifications will also be deleted.`)
                  }
                >
                  Delete
                </Button>
              </>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </Table>
  );
};

export default AdminUsersTable;
