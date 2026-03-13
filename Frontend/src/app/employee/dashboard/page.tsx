"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/lib/store";
import { attendanceAPI, leavesAPI } from "@/lib/api";
import { FiClock, FiCheckSquare, FiFilter } from "react-icons/fi";

type ViewFilter = "day" | "month" | "year";

interface AttendanceRecord {
  _id: string;
  date: string;
  clockIn?: string | null;
  clockOut?: string | null;
  workingHours?: number;
  status?: string;
}

interface LeaveRecord {
  _id: string;
  status?: string;
  appliedDate?: string;
}

interface LeaveStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

interface ChartPoint {
  label: string;
  shortLabel: string;
  value: number;
  rawHours: number;
  type: "work" | "leave" | "holiday" | "none";
}

const monthNamesShort = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const getTodayIso = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentMonthIso = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const parseMonthInput = (monthInput: string) => {
  const [yearString, monthString] = monthInput.split("-");
  return {
    year: Number(yearString),
    month: Number(monthString),
  };
};

const toSafeHours = (hours: unknown) => {
  const value = Number(hours ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const getAttendanceType = (record?: AttendanceRecord | null): ChartPoint["type"] => {
  if (!record) return "none";
  const status = String(record.status || "").toLowerCase();
  if (status === "leave") return "leave";
  if (status === "holiday") return "holiday";
  if (toSafeHours(record.workingHours) > 0 || record.clockIn) return "work";
  return "none";
};

const getDisplayValue = (type: ChartPoint["type"], hours: number) => {
  if (type === "work") return hours;
  if (type === "leave") return 0.9;
  if (type === "holiday") return 0.6;
  return 0;
};

const buildLeaveStats = (records: LeaveRecord[]): LeaveStats => {
  const stats: LeaveStats = { total: 0, approved: 0, pending: 0, rejected: 0 };

  for (const record of records) {
    const status = String(record.status || "").toLowerCase();
    if (status === "approved") stats.approved += 1;
    if (status === "pending") stats.pending += 1;
    if (status === "rejected") stats.rejected += 1;
  }

  stats.total = stats.approved + stats.pending + stats.rejected;
  return stats;
};

const buildAttendanceChartData = (
  records: AttendanceRecord[],
  viewFilter: ViewFilter,
  selectedDay: string,
  selectedMonth: string,
  selectedYear: number
): ChartPoint[] => {
  if (viewFilter === "day") {
    const record = records.find((item) => item.date === selectedDay);
    const dateObj = new Date(`${selectedDay}T00:00:00`);
    const label = Number.isNaN(dateObj.getTime())
      ? selectedDay
      : dateObj.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
    const type = getAttendanceType(record);
    const rawHours = toSafeHours(record?.workingHours);

    return [
      {
        label,
        shortLabel: label,
        value: getDisplayValue(type, rawHours),
        rawHours,
        type,
      },
    ];
  }

  if (viewFilter === "month") {
    const { month, year } = parseMonthInput(selectedMonth);
    const daysInMonth = new Date(year, month, 0).getDate();
    const recordsByDay = new Map<number, AttendanceRecord>();

    for (const record of records) {
      const dateObj = new Date(`${record.date}T00:00:00`);
      if (Number.isNaN(dateObj.getTime())) continue;
      if (dateObj.getFullYear() !== year || dateObj.getMonth() + 1 !== month) continue;
      recordsByDay.set(dateObj.getDate(), record);
    }

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const record = recordsByDay.get(day);
      const rawHours = toSafeHours(record?.workingHours);
      const type = getAttendanceType(record);
      return {
        label: `Day ${day}`,
        shortLabel: String(day),
        value: getDisplayValue(type, rawHours),
        rawHours,
        type,
      };
    });
  }

  const monthlyHours = new Array<number>(12).fill(0);
  for (const record of records) {
    const dateObj = new Date(`${record.date}T00:00:00`);
    if (Number.isNaN(dateObj.getTime())) continue;
    if (dateObj.getFullYear() !== selectedYear) continue;
    const monthIndex = dateObj.getMonth();
    monthlyHours[monthIndex] += toSafeHours(record.workingHours);
  }

  return monthNamesShort.map((monthLabel, index) => ({
    label: monthLabel,
    shortLabel: monthLabel,
    value: Number(monthlyHours[index].toFixed(2)),
    rawHours: Number(monthlyHours[index].toFixed(2)),
    type: "work" as const,
  }));
};

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const chartScrollRef = useRef<HTMLDivElement | null>(null);

  const [viewFilter, setViewFilter] = useState<ViewFilter>("month");
  const [selectedDay, setSelectedDay] = useState(getTodayIso());
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthIso());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveStats, setLeaveStats] = useState<LeaveStats>({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let attendancePromise: ReturnType<typeof attendanceAPI.getMyAttendance>;
        let leavesPromise: ReturnType<typeof leavesAPI.getMyLeaves>;

        if (viewFilter === "day") {
          const dateObj = new Date(`${selectedDay}T00:00:00`);
          const month = dateObj.getMonth() + 1;
          const year = dateObj.getFullYear();

          attendancePromise = attendanceAPI.getMyAttendance(undefined, undefined, selectedDay);
          leavesPromise = leavesAPI.getMyLeaves({ month, year });
        } else if (viewFilter === "month") {
          const { month, year } = parseMonthInput(selectedMonth);
          attendancePromise = attendanceAPI.getMyAttendance(month, year);
          leavesPromise = leavesAPI.getMyLeaves({ month, year });
        } else {
          attendancePromise = attendanceAPI.getMyAttendance(undefined, selectedYear);
          leavesPromise = leavesAPI.getMyLeaves({ year: selectedYear });
        }

        const [attendanceRes, leavesRes] = await Promise.all([attendancePromise, leavesPromise]);

        const attendanceData = Array.isArray(attendanceRes.data)
          ? (attendanceRes.data as AttendanceRecord[])
          : [];

        const leavesDataRaw = Array.isArray(leavesRes.data) ? (leavesRes.data as LeaveRecord[]) : [];

        const leavesData =
          viewFilter === "day"
            ? leavesDataRaw.filter((item) =>
                String(item.appliedDate || "").startsWith(selectedDay)
              )
            : leavesDataRaw;

        setAttendanceRecords(attendanceData);
        setLeaveStats(buildLeaveStats(leavesData));
      } catch (err) {
        console.error(err);
        setAttendanceRecords([]);
        setLeaveStats({ total: 0, approved: 0, pending: 0, rejected: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [viewFilter, selectedDay, selectedMonth, selectedYear]);

  const attendanceChartData = useMemo(
    () =>
      buildAttendanceChartData(
        attendanceRecords,
        viewFilter,
        selectedDay,
        selectedMonth,
        selectedYear
      ),
    [attendanceRecords, viewFilter, selectedDay, selectedMonth, selectedYear]
  );

  const maxChartValue = useMemo(() => {
    const maxValue = Math.max(...attendanceChartData.map((item) => item.value), 0);
    return Math.max(12, Math.ceil(maxValue));
  }, [attendanceChartData]);

  const yTicks = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const ratio = (5 - index) / 5;
      return Number((maxChartValue * ratio).toFixed(0));
    });
  }, [maxChartValue]);

  const leaveSegments = useMemo(() => {
    const total = leaveStats.total || 1;
    return [
      { key: "Approved", value: leaveStats.approved, color: "#22c55e", percent: (leaveStats.approved / total) * 100 },
      { key: "Pending", value: leaveStats.pending, color: "#f59e0b", percent: (leaveStats.pending / total) * 100 },
      { key: "Rejected", value: leaveStats.rejected, color: "#ef4444", percent: (leaveStats.rejected / total) * 100 },
    ];
  }, [leaveStats]);

  const pieBackground = useMemo(() => {
    if (leaveStats.total === 0) {
      return "conic-gradient(rgba(148,163,184,0.2) 0 100%)";
    }

    let cursor = 0;
    const slices = leaveSegments
      .filter((segment) => segment.value > 0)
      .map((segment) => {
        const start = cursor;
        const end = cursor + segment.percent;
        cursor = end;
        return `${segment.color} ${start}% ${end}%`;
      });

    return `conic-gradient(${slices.join(",")})`;
  }, [leaveSegments, leaveStats.total]);

  const rangeSubtitle =
    viewFilter === "day"
      ? `Day report: ${selectedDay}`
      : viewFilter === "month"
      ? `Month report: ${selectedMonth}`
      : `Year report: ${selectedYear}`;

  const yearlyOptions = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index);
  const chartColumnWidth = viewFilter === "year" ? 52 : 34;
  const chartInnerWidth = Math.max(attendanceChartData.length * chartColumnWidth, 520);
  const periodWorkHours = useMemo(
    () =>
      Number(
        attendanceChartData
          .filter((item) => item.type === "work")
          .reduce((sum, item) => sum + item.rawHours, 0)
          .toFixed(2)
      ),
    [attendanceChartData]
  );
  const periodOvertimeDays = useMemo(
    () => attendanceChartData.filter((item) => item.type === "work" && item.rawHours > 10).length,
    [attendanceChartData]
  );

  useEffect(() => {
    const element = chartScrollRef.current;
    if (!element) return;

    if (viewFilter === "day") {
      element.scrollLeft = 0;
      return;
    }

    // Show latest timeline first; user can scroll left for older data.
    element.scrollLeft = element.scrollWidth;
  }, [viewFilter, selectedMonth, selectedYear, attendanceChartData.length]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid rgba(99,102,241,0.2)",
            borderTop: "3px solid #6366f1",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1050, margin: "0 auto", padding: "20px" }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
          Welcome, <span className="gradient-text">{user?.name?.split(" ")[0]}</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 8, marginBottom: 14 }}>
          Clear dashboard analytics for attendance and leave reports.
        </p>

        <div
          className="glass-card"
          style={{
            padding: 14,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            width: "fit-content",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 6 }}>
            <FiFilter size={15} color="#a5b4fc" />
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Filter</span>
          </div>

          {(["day", "month", "year"] as ViewFilter[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewFilter(mode)}
              style={{
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: 10,
                padding: "6px 12px",
                background: viewFilter === mode ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.08)",
                color: viewFilter === mode ? "#c7d2fe" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {mode}
            </button>
          ))}

          {viewFilter === "day" && (
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              style={{
                background: "rgba(15,23,42,0.65)",
                color: "var(--text-primary)",
                border: "1px solid rgba(99,102,241,0.25)",
                borderRadius: 10,
                padding: "7px 10px",
                fontSize: 13,
              }}
            />
          )}

          {viewFilter === "month" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                background: "rgba(15,23,42,0.65)",
                color: "var(--text-primary)",
                border: "1px solid rgba(99,102,241,0.25)",
                borderRadius: 10,
                padding: "7px 10px",
                fontSize: 13,
              }}
            />
          )}

          {viewFilter === "year" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                background: "rgba(15,23,42,0.65)",
                color: "var(--text-primary)",
                border: "1px solid rgba(99,102,241,0.25)",
                borderRadius: 10,
                padding: "7px 10px",
                fontSize: 13,
              }}
            >
              {yearlyOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}

          <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>{rangeSubtitle}</span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: 24,
          marginBottom: 40,
        }}
      >
        <div className="glass-card" style={{ padding: 24, borderRadius: 20 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(139, 92, 246, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiClock color="#a78bfa" size={18} />
            </div>
            Attendance Working Hours
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 14 }}>
            Y-axis: hours, X-axis: {viewFilter === "year" ? "month" : "day"}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: -8, marginBottom: 12 }}>
            Scroll left/right on graph to view older and newer days.
          </p>
          <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
            {[
              { label: "Work", color: "#6366f1" },
              { label: "Leave", color: "#f59e0b" },
              { label: "Holiday", color: "#22d3ee" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: item.color,
                    boxShadow: `0 0 8px ${item.color}`,
                  }}
                />
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{item.label}</span>
              </div>
            ))}
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: -2, marginBottom: 10 }}>
            Total Work Hours: <b>{periodWorkHours}h</b> | Overtime Days (&gt;10h): <b>{periodOvertimeDays}</b>
          </p>

          <div style={{ height: 270, display: "flex", gap: 10 }}>
            <div
              style={{
                width: 44,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "flex-end",
                paddingBottom: 24,
                paddingTop: 4,
              }}
            >
              {yTicks.map((tick, index) => (
                <span key={`tick-${tick}-${index}`} style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {tick}h
                </span>
              ))}
            </div>

            <div
              ref={chartScrollRef}
              style={{ flex: 1, overflowX: "auto", overflowY: "hidden", paddingBottom: 2, scrollbarWidth: "thin" }}
              onWheel={(e) => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
            >
              <div
                style={{
                  width: chartInnerWidth,
                  minWidth: "100%",
                  height: "100%",
                  position: "relative",
                  borderLeft: "1px solid rgba(255,255,255,0.15)",
                  borderBottom: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {yTicks.map((_, index) => (
                  <div
                    key={`line-${index}`}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: `${(index / (yTicks.length - 1)) * 100}%`,
                      borderTop: "1px dashed rgba(148,163,184,0.15)",
                    }}
                  />
                ))}

                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 26,
                    display: "grid",
                    gridTemplateColumns: `repeat(${attendanceChartData.length}, ${chartColumnWidth}px)`,
                    alignItems: "stretch",
                    gap: 4,
                    padding: "6px 6px 0",
                  }}
                >
                  {attendanceChartData.map((item) => {
                    const heightPercent = maxChartValue > 0 ? (item.value / maxChartValue) * 100 : 0;
                    const active = item.value > 0;
                    const barColor =
                      item.type === "leave"
                        ? "linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)"
                        : item.type === "holiday"
                        ? "linear-gradient(180deg, #67e8f9 0%, #06b6d4 100%)"
                        : "linear-gradient(180deg, #818cf8 0%, #6366f1 100%)";
                    const tooltipLabel =
                      item.type === "leave"
                        ? `${item.label}: Leave`
                        : item.type === "holiday"
                        ? `${item.label}: Holiday`
                        : item.type === "none"
                        ? `${item.label}: No record`
                        : `${item.label}: ${item.rawHours.toFixed(2)}h`;
                    return (
                      <div
                        key={`bar-${item.label}`}
                        style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", height: "100%" }}
                        title={tooltipLabel}
                      >
                        <div
                          style={{
                            width: 18,
                            minHeight: active ? 6 : 2,
                            height: `${heightPercent}%`,
                            borderRadius: "8px 8px 2px 2px",
                            background: active
                              ? barColor
                              : "rgba(148,163,184,0.3)",
                            boxShadow:
                              active && item.type === "leave"
                                ? "0 8px 14px rgba(245,158,11,0.28)"
                                : active && item.type === "holiday"
                                ? "0 8px 14px rgba(6,182,212,0.28)"
                                : active
                                ? "0 8px 14px rgba(99,102,241,0.25)"
                                : "none",
                            transition: "height 0.3s ease",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 24,
                    display: "grid",
                    gridTemplateColumns: `repeat(${attendanceChartData.length}, ${chartColumnWidth}px)`,
                    gap: 4,
                    alignItems: "end",
                    padding: "0 6px",
                  }}
                >
                  {attendanceChartData.map((item, index) => {
                    const interval = attendanceChartData.length > 14 ? Math.ceil(attendanceChartData.length / 8) : 1;
                    const showLabel = index % interval === 0 || index === attendanceChartData.length - 1;
                    return (
                      <span
                        key={`x-${item.label}`}
                        style={{
                          fontSize: 10,
                          color: "var(--text-muted)",
                          textAlign: "center",
                          opacity: showLabel ? 1 : 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.shortLabel}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 24, borderRadius: 20 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(245, 158, 11, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiCheckSquare color="#fbbf24" size={18} />
            </div>
            Leave Status Pie Chart
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 18 }}>
            Approved, pending, and rejected leave distribution.
          </p>

          <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: pieBackground,
                position: "relative",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 36,
                  borderRadius: "50%",
                  background: "rgba(15,23,42,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Total</span>
                <span style={{ fontSize: 24, fontWeight: 800 }}>{leaveStats.total}</span>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 170, display: "flex", flexDirection: "column", gap: 10 }}>
              {leaveSegments.map((segment) => {
                const percentage =
                  leaveStats.total > 0 ? Math.round((segment.value / leaveStats.total) * 100) : 0;
                return (
                  <div
                    key={segment.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderRadius: 12,
                      padding: "10px 12px",
                      background: "rgba(148,163,184,0.08)",
                      border: "1px solid rgba(148,163,184,0.18)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: segment.color,
                          boxShadow: `0 0 8px ${segment.color}`,
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>{segment.key}</span>
                    </div>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                      {segment.value} ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
