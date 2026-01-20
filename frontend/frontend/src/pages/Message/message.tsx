import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import "./messages.css";


const API_BASE = "http://localhost:4000/api";

type MessageRow = {
  smsSeqNbr: number;
  residenceId: string | null;
  mobileNo: string | null;
  smsText: string | null;
  apiResponse: string | null;
  status: number;
  createDate: string;
};

const formatDateTime = (value: string) => {
  if (!value) return "-";
  return value;
};

//  RANGE HELPER
const isInRange = (rowDate: string, from?: string, to?: string) => {
  if (!rowDate) return true;

  const d = new Date(rowDate).setHours(0, 0, 0, 0);
  const f = from ? new Date(from).setHours(0, 0, 0, 0) : null;
  const t = to ? new Date(to).setHours(0, 0, 0, 0) : null;

  if (f && d < f) return false;
  if (t && d > t) return false;
  return true;
};

const Messages = () => {
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  // From–To range only
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [, setInitialLoad] = useState(true);

  const loadMessages = async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (filter === "sent") params.append("status", "1");
      else if (filter === "user_not_found")
        params.append("failureType", "user_not_found");

      const res = await fetch(
        `${API_BASE}/messages?${params.toString()}`
      );
      const data = await res.json();

      if (data.ok) {
        let fetchedRows: MessageRow[] = data.rows;

        // From–To range filter
        if (fromDate || toDate) {
          fetchedRows = fetchedRows.filter((r) =>
            isInRange(r.createDate, fromDate, toDate)
          );
        }

        if (filter === "sent") {
          fetchedRows = fetchedRows.filter((r) => r.status === 1);
        }

        if (filter === "user_not_found") {
          fetchedRows = fetchedRows.filter(
            (r) =>
              r.status === 0 &&
              r.apiResponse === "USER NOT FOUND"
          );
        }

        if (filter === "skipped") {
          fetchedRows = fetchedRows.filter(
            (r) => r.apiResponse === "COOLDOWN"
          );
        }

        // Latest first
        fetchedRows = fetchedRows
          .slice()
          .sort(
            (a, b) =>
              new Date(b.createDate).getTime() -
              new Date(a.createDate).getTime()
          );

        setRows(fetchedRows);
      } else {
        setRows([]);
      }
    } catch (err) {
      console.error("Failed to load messages", err);
      setRows([]);
    } finally {
      setInitialLoad(false);
    }
  };

  //AUTO REFRESH 
  useEffect(() => {
    loadMessages();

    // pause auto-refresh while filtering
    if (search || filter || fromDate || toDate) return;

    const interval = setInterval(loadMessages, 11000);
    return () => clearInterval(interval);
  }, [search, filter, fromDate, toDate]);

  // ================= CSV DOWNLOAD =================
  const downloadCSV = () => {
    if (rows.length === 0) return;

    const headers = [
      "SMS Seq No",
      "Mobile",
      "Message",
      "Status",
      "Date",
    ];

    const csvRows = rows.map((r) => [
      r.smsSeqNbr,
      r.mobileNo ?? "",
      r.smsText ?? "",
      r.status === 1
        ? "Sent"
        : r.apiResponse === "COOLDOWN"
        ? "Skipped"
        : "User Not Found",
      formatDateTime(r.createDate),
    ]);

    const csvContent =
      [headers, ...csvRows]
        .map((row) =>
          row
            .map((cell) =>
              `"${String(cell).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `messages_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-vh-100 dashboard-theme theme-light">
      <div className="container-fluid">
        <div className="row gx-0">
          <Sidebar />

          {/* GAP */}
          <div
            aria-hidden
            style={{
              width: 16,
              minWidth: 16,
              background: "rgba(25,135,84,0.06)",
              borderLeft: "1px solid #e0efe0",
              borderRight: "1px solid rgba(0,0,0,0.02)",
            }}
          />

          <main className="col p-4">
            <h3 className="mb-3">Messages</h3>

            {/* FILTERS */}
            <div className="row g-2 mb-3">
              <div className="col-md-4">
                <input
                  className="form-control"
                  placeholder="Search mobile, text, residence ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="col-md-2">
                <input
                  type="date"
                  className="form-control"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div className="col-md-2">
                <input
                  type="date"
                  className="form-control"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              <div className="col-md-2">
                <select
                  className="form-select"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="sent">Sent</option>
                  <option value="user_not_found">
                    User Not Found
                  </option>
                  <option value="skipped">Skipped</option>
                </select>
              </div>

              <div className="col-md-2">
                <button
                  className="btn btn-success w-100"
                  onClick={downloadCSV}
                  disabled={rows.length === 0}
                >
                  ⬇ Download
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Mobile</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center">
                        No messages found
                      </td>
                    </tr>
                  )}

                  {rows.map((row) => (
                    <tr key={row.smsSeqNbr}>
                      <td>{row.smsSeqNbr}</td>
                      <td>{row.mobileNo ?? "-"}</td>
                      <td>{row.smsText ?? "-"}</td>
                      <td>
                        {row.status === 1 && (
                          <span className="badge bg-success">
                            Sent
                          </span>
                        )}
                        {row.status === 0 &&
                          row.apiResponse ===
                            "USER NOT FOUND" && (
                            <span className="badge bg-danger">
                              User Not Found
                            </span>
                          )}
                        {row.status === 0 &&
                          row.apiResponse ===
                            "COOLDOWN" && (
                            <span className="badge bg-warning text-dark">
                              Skipped
                            </span>
                          )}
                      </td>
                      <td>{formatDateTime(row.createDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Messages;
