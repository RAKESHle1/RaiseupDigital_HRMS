"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { attendanceAPI, frsAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { FiCamera, FiClock, FiCheckCircle, FiXCircle, FiLogIn, FiLogOut, FiRefreshCw } from "react-icons/fi";

type AttendanceRow = {
  status?: string;
  workingHours?: number;
  clockIn?: string | null;
  clockOut?: string | null;
};

export default function FRSAttendancePage() {
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<number | string>(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState("");
  
  // FRS Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const getAttendanceBadge = (rec: AttendanceRow) => {
    const status = String(rec.status || "").toLowerCase();
    if (status === "holiday") return { text: "Holiday", style: { background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)", color: "#67e8f9" } };
    if (status === "leave") return { text: "Leave", style: { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" } };
    if ((rec.workingHours || 0) >= 9) return { text: "Full", style: { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" } };
    if (rec.clockIn && !rec.clockOut) return { text: "Active", style: { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" } };
    if (rec.clockOut) return { text: "Short", style: { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" } };
    return { text: "No Record", style: { background: "rgba(148,163,184,0.12)", border: "1px solid rgba(148,163,184,0.3)", color: "#94a3b8" } };
  };

  useEffect(() => {
    fetchData();
  }, [month, year, selectedDate]);

  const fetchData = async () => {
    try {
      const [todayRes, historyRes] = await Promise.all([
        attendanceAPI.getToday(),
        attendanceAPI.getMyAttendance(
          month === "" ? undefined : Number(month), 
          year, 
          selectedDate || undefined
        ),
      ]);
      setTodayRecord(todayRes.data);
      setRecords(historyRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Camera Controls ───────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      setScanResult(null);
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("Could not access camera. Please allow camera permissions.");
      setShowCamera(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setScanning(false);
  }, []);

  const captureAndScan = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setScanning(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error("Failed to capture image");
        setScanning(false);
        return;
      }

      try {
        const res = await frsAPI.recognize(blob);
        const data = res.data;

        setScanResult(data);

        if (data.action === "clock_in") {
          toast.success(`Clocked IN at ${data.time}`);
        } else if (data.action === "clock_out") {
          toast.success(`Clocked OUT at ${data.time} — ${data.workingHours}h`);
        } else if (data.action === "already_done") {
          toast.success("Already clocked in and out today!");
        }

        // Refresh attendance data
        fetchData();
      } catch (err: any) {
        const detail = err.response?.data?.detail || "Face scan failed. Try again.";
        setScanResult({ status: "error", message: detail });
        toast.error(detail);
      } finally {
        setScanning(false);
      }
    }, "image/jpeg", 0.85);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(99,102,241,0.2)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes pulse-ring { 
          0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          70% { box-shadow: 0 0 0 20px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        @keyframes scan-line {
          0% { top: 0; }
          50% { top: calc(100% - 3px); }
          100% { top: 0; }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>
          <span className="gradient-text">Face Recognition Scan</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
          Scan your face to clock in or out automatically
        </p>
      </div>

      {/* FRS Scan Card */}
      <div className="glass-card" style={{ padding: 32, marginBottom: 28, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
          <FiCamera size={32} color="#6366f1" />
          <FiClock size={28} color="#818cf8" />
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>

        {/* Today's Status */}
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Clock In</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: todayRecord?.clockIn ? "#22c55e" : "var(--text-muted)" }}>
              {todayRecord?.clockIn || "--:--"}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Clock Out</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: todayRecord?.clockOut ? "#ef4444" : "var(--text-muted)" }}>
              {todayRecord?.clockOut || "--:--"}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Hours</p>
            <p style={{
              fontSize: 24, fontWeight: 800,
              color: todayRecord?.workingHours ? (todayRecord.workingHours >= 9 ? "#22c55e" : "#ef4444") : "var(--text-muted)"
            }}>
              {todayRecord?.workingHours ? `${todayRecord.workingHours}h` : "0.0h"}
            </p>
          </div>
        </div>

        {/* Scan Button */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          {todayRecord?.clockIn && todayRecord?.clockOut ? (
            <div style={{
              padding: "16px 48px", borderRadius: 14,
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
              color: "#22c55e", fontSize: 16, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 10
            }}>
              <FiCheckCircle size={20} /> Day Complete — {todayRecord.workingHours}h
            </div>
          ) : (
            <button
              onClick={startCamera}
              style={{
                padding: "18px 56px", borderRadius: 16, border: "none",
                background: !todayRecord?.clockIn 
                  ? "linear-gradient(135deg, #6366f1, #8b5cf6)" 
                  : "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "white", fontSize: 17, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12,
                boxShadow: !todayRecord?.clockIn 
                  ? "0 8px 30px rgba(99,102,241,0.4)"
                  : "0 8px 30px rgba(239,68,68,0.3)",
                transition: "all 0.3s ease",
                animation: "pulse-ring 2s infinite",
              }}
            >
              <FiCamera size={22} />
              {!todayRecord?.clockIn ? "SCAN FACE TO CLOCK IN" : "SCAN FACE TO CLOCK OUT"}
            </button>
          )}
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="modal-overlay" onClick={stopCamera}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 580, padding: 0, overflow: "hidden", animation: "fadeInScale 0.3s ease" }}
          >
            {/* Camera Header */}
            <div style={{ 
              padding: "20px 24px", 
              background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))",
              borderBottom: "1px solid var(--border-color)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <FiCamera size={18} color="white" />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700 }}>
                    Face Recognition Scan
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {!todayRecord?.clockIn ? "Clock In" : "Clock Out"} — Look at the camera
                  </p>
                </div>
              </div>
              <button onClick={stopCamera} style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                color: "#ef4444", fontSize: 12, fontWeight: 600
              }}>
                ✕ Close
              </button>
            </div>

            {/* Camera Feed */}
            <div style={{ position: "relative", background: "#000", aspectRatio: "4/3" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />

              {/* Scanning Overlay */}
              {scanning && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(0,0,0,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 16
                }}>
                  {/* Scan line effect */}
                  <div style={{
                    position: "absolute", left: "10%", right: "10%",
                    height: 3, background: "linear-gradient(90deg, transparent, #6366f1, transparent)",
                    animation: "scan-line 1.5s ease-in-out infinite"
                  }} />
                  <div style={{
                    width: 50, height: 50, border: "3px solid rgba(99,102,241,0.3)",
                    borderTop: "3px solid #6366f1", borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                  }} />
                  <p style={{ color: "white", fontSize: 16, fontWeight: 700, textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                    Scanning face...
                  </p>
                </div>
              )}

              {/* Face guide overlay */}
              {!scanning && !scanResult && (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none"
                }}>
                  <div style={{
                    width: 200, height: 260, borderRadius: "50%",
                    border: "3px dashed rgba(99,102,241,0.5)",
                    boxShadow: "0 0 40px rgba(99,102,241,0.15)"
                  }} />
                </div>
              )}
            </div>

            {/* Scan Result */}
            {scanResult && (
              <div style={{
                padding: 24, textAlign: "center",
                background: scanResult.status === "error" 
                  ? "rgba(239,68,68,0.05)" 
                  : "rgba(34,197,94,0.05)"
              }}>
                {scanResult.status === "error" ? (
                  <>
                    <FiXCircle size={48} color="#ef4444" style={{ marginBottom: 12 }} />
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#ef4444", marginBottom: 6 }}>
                      Scan Failed
                    </p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {scanResult.message}
                    </p>
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={48} color="#22c55e" style={{ marginBottom: 12 }} />
                    <p style={{ fontSize: 18, fontWeight: 700, color: "#22c55e", marginBottom: 4 }}>
                      {scanResult.action === "clock_in" ? "Clocked In!" : 
                       scanResult.action === "clock_out" ? "Clocked Out!" : "Already Done!"}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                      {scanResult.employee?.name}
                    </p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                      {scanResult.employee?.department} — {scanResult.employee?.employeeId}
                    </p>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "8px 20px", borderRadius: 10,
                      background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)"
                    }}>
                      <FiClock size={16} color="#818cf8" />
                      <span style={{ fontSize: 22, fontWeight: 800, color: "#818cf8" }}>
                        {scanResult.time}
                      </span>
                    </div>
                    {scanResult.action === "clock_out" && scanResult.workingHours > 0 && (
                      <p style={{ marginTop: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                        Working hours: <strong>{scanResult.workingHours}h</strong>
                      </p>
                    )}
                    <p style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
                      Confidence: {scanResult.confidence}%
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ 
              padding: "16px 24px", borderTop: "1px solid var(--border-color)",
              display: "flex", justifyContent: "center", gap: 12
            }}>
              {!scanResult ? (
                <button
                  onClick={captureAndScan}
                  disabled={scanning}
                  style={{
                    flex: 1, padding: "14px 24px", borderRadius: 12, border: "none",
                    background: scanning 
                      ? "rgba(99,102,241,0.3)" 
                      : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "white", fontSize: 15, fontWeight: 700, cursor: scanning ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    boxShadow: "0 6px 20px rgba(99,102,241,0.3)",
                    transition: "all 0.3s ease",
                  }}
                >
                  {scanning ? (
                    <>
                      <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <FiCamera size={18} /> Capture & Scan
                    </>
                  )}
                </button>
              ) : (
                <>
                  {scanResult.status === "error" && (
                    <button
                      onClick={() => setScanResult(null)}
                      style={{
                        flex: 1, padding: "14px 24px", borderRadius: 12, border: "none",
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                        boxShadow: "0 6px 20px rgba(99,102,241,0.3)",
                      }}
                    >
                      <FiRefreshCw size={18} /> Try Again
                    </button>
                  )}
                  <button
                    onClick={stopCamera}
                    style={{
                      flex: 1, padding: "14px 24px", borderRadius: 12,
                      background: scanResult.status === "error" 
                        ? "rgba(255,255,255,0.05)"
                        : "linear-gradient(135deg, #22c55e, #16a34a)",
                      color: scanResult.status === "error" ? "var(--text-secondary)" : "white",
                      border: scanResult.status === "error" ? "1px solid var(--border-color)" : "none",
                      fontSize: 15, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      boxShadow: scanResult.status !== "error" ? "0 6px 20px rgba(34,197,94,0.3)" : "none",
                    }}
                  >
                    <FiCheckCircle size={18} /> OK
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Attendance History</h2>
          
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: "rgba(255,255,255,0.03)", padding: "6px 12px", borderRadius: 12, border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>View by:</span>
            </div>
            
            <input 
              type="date" 
              className="input-field" 
              style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
              value={selectedDate}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDate(val);
                if(val) {
                  const [y, m] = val.split("-");
                  setYear(Number(y));
                  setMonth(Number(m));
                }
              }}
            />

            <div style={{ width: 1, height: 20, background: "var(--border-color)" }} />

            <select className="input-field" style={{ width: "auto", padding: "6px 10px", fontSize: 13 }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              <option value="">All Months</option>
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>

            <select className="input-field" style={{ width: "auto", padding: "6px 10px", fontSize: 13 }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Working Hours</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{rec.date}</td>
                  <td>{rec.clockIn || "—"}</td>
                  <td>{rec.clockOut || "—"}</td>
                  <td style={{
                    fontWeight: 600,
                    color: rec.workingHours >= 9 ? "#22c55e" : rec.workingHours > 0 ? "#ef4444" : "var(--text-muted)",
                  }}>
                    {rec.workingHours ? `${rec.workingHours}h` : "—"}
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: rec.method === "frs" ? "rgba(99,102,241,0.12)" : "rgba(148,163,184,0.12)",
                      border: rec.method === "frs" ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(148,163,184,0.3)",
                      color: rec.method === "frs" ? "#818cf8" : "#94a3b8",
                    }}>
                      {rec.method === "frs" ? "📷 FRS" : "⏰ Manual"}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const badge = getAttendanceBadge(rec);
                      return (
                        <span className="badge" style={badge.style}>
                          {badge.text}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && (
            <p style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No records for this period</p>
          )}
        </div>
      </div>
    </div>
  );
}
