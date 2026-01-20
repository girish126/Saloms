import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const collapsedWidth = 64;
  const expandedWidth = 220;

  const asideStyle: React.CSSProperties = {
    width: sidebarOpen ? expandedWidth : collapsedWidth,
    transition: "width 180ms ease",
    minHeight: "calc(100vh - 56px)",
    overflow: "hidden",
    background: "var(--card-bg)",        
    borderRight: "1px solid var(--border)" 
  };

  const navLinkContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 6,
    cursor: "pointer",
    color: "var(--text)",                             
    transition: "background 160ms ease, color 160ms",
  };

  const iconStyle: React.CSSProperties = {
    width: 28,
    textAlign: "center",
    fontSize: 16,
    flexShrink: 0,
    color: "var(--text)",       
  };

  const labelStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    opacity: sidebarOpen ? 1 : 0,
    transform: sidebarOpen ? "translateX(0)" : "translateX(-6px)",
    transition: "opacity 150ms ease, transform 150ms ease",
    fontSize: 14,
    color: "var(--text)",      
  };


  return (
    <>
      {/* Dark Mode Hover Fix */}
      <style>{`
        .sidebar-item:hover {
          background: var(--hover-bg);
        }
        /* Light Mode */
        .theme-light {
          --hover-bg: rgba(0,0,0,0.06);
        }
        /* Dark Mode */
        .theme-dark {
          --hover-bg: rgba(255,255,255,0.06);
        }
      `}</style>

      <aside
        className="col-12 col-md-auto p-3"
        style={asideStyle}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        <div style={{ height: 12 }} />

        <ul className="nav flex-column" style={{ gap: 6 }}>
          <li className="nav-item mb-2">
            <div
              className="sidebar-item"
              style={navLinkContainerStyle}
              onClick={() => navigate("/dashboard")}
              title="Dashboard"
            >
              <div style={iconStyle}>🏠</div>
              <div style={labelStyle}>Dashboard</div>
            </div>
          </li>

          <li className="nav-item mb-2">
            <div
              className="sidebar-item"
              style={navLinkContainerStyle}
              onClick={() => navigate("/add-student")}
            >
              <div style={iconStyle}>➕</div>
              <div style={labelStyle}>Add Students</div>
            </div>
          </li>

          <li className="nav-item mb-2">
            <div
              className="sidebar-item"
              style={navLinkContainerStyle}
              onClick={() => navigate("/allstudents")}
            >
              <div style={iconStyle}>🧑‍🤝‍🧑</div>
              <div style={labelStyle}>All Students</div>
            </div>
          </li>

          <hr style={{ borderColor: "var(--border)" }} />

          <li className="nav-item mb-2">
            <div
              className="sidebar-item"
              style={navLinkContainerStyle}
              onClick={() => navigate("/master-data")}
            >
              <div style={iconStyle}>📦</div>
              <div style={labelStyle}>Master Data</div>
            </div>
          </li>

          <li className="nav-item mb-2">
            <div
              className="sidebar-item"
              style={navLinkContainerStyle}
              onClick={() => navigate("/report")}
            >
              <div style={iconStyle}>📋</div>
              <div style={labelStyle}>Report</div>
            </div>
          </li>




            <li className="nav-item mb-2">
            <div
              className="sidebar-item"
              style={navLinkContainerStyle}
              onClick={() => navigate("/messages")}
            >
              <div style={iconStyle}>💬</div>
              <div style={labelStyle}>Messages</div>
            </div>
          </li>



            <li className="nav-item mb-2">
            <div
              className="sidebar-item"
              style={navLinkContainerStyle}
              onClick={() => navigate("/settings")}
            >
              <div style={iconStyle}>⚙️</div>
              <div style={labelStyle}>Settings</div>
            </div>
          </li>
    
        </ul>
      </aside>
    </>
  );
};

export default Sidebar;
