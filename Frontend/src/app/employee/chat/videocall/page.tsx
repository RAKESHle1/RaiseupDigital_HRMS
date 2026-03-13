"use client";

import React from "react";

const VideoCallPage = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#1a1a1a",
        color: "white",
      }}
    >
      <h1>Video Call</h1>
      <p>Connecting...</p>
      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
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

export default VideoCallPage;