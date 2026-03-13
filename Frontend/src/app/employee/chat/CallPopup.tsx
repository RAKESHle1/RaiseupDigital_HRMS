import React from "react";

const CallPopup = ({ user, onEndCall }: { user: any; onEndCall: () => void }) => {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "300px",
        height: "200px",
        backgroundColor: "#1a1a1a",
        color: "white",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
        textAlign: "center",
        zIndex: 1000,
      }}
    >
      <h3>{user.name}</h3>
      <p>Calling...</p>
      <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "20px" }}>
        <button
          style={{
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            cursor: "pointer",
          }}
          onClick={onEndCall}
        >
          ✖
        </button>
        <button
          style={{
            backgroundColor: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            cursor: "pointer",
          }}
        >
          🔇
        </button>
      </div>
    </div>
  );
};

export default CallPopup;