"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { chatAPI, usersAPI } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";
import { FiSend, FiPlus, FiUsers, FiMessageCircle, FiSearch, FiX, FiPhone, FiVideo, FiMic, FiMicOff, FiUser, FiVideoOff } from "react-icons/fi";
import socketService from "@/lib/socket";

// ─── Helper: format timestamp to IST ──────────────────────
const formatTime = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return "";
  }
};

// ─── Helper: get my ID from localStorage directly ─────────
const getMyId = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    return stored?.id || stored?._id || "";
  } catch {
    return "";
  }
};

const getMyName = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    return stored?.name || "";
  } catch {
    return "";
  }
};

export default function EmployeeChatPage() {
  const { user, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  const [conversations, setConversations] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chatType, setChatType] = useState<"dm" | "group">("dm");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", members: [] as string[] });
  const [tab, setTab] = useState<"chats" | "groups">("chats");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChatRef = useRef<any>(null);
  const chatTypeRef = useRef<"dm" | "group">("dm");

  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "incoming" | "active">("idle");
  const [callType, setCallType] = useState<"audio" | "video">("video");
  const [caller, setCaller] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<any>(null);
  const pendingOffer = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [remoteMicMuted, setRemoteMicMuted] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { chatTypeRef.current = chatType; }, [chatType]);

  const fetchMessages = useCallback(async (chatOverride?: any, typeOverride?: string) => {
    const currentChat = chatOverride || activeChatRef.current;
    const currentType = typeOverride || chatTypeRef.current;
    if (!currentChat) return;
    try {
      let res;
      if (currentType === "dm") {
        const id = currentChat.userId || currentChat._id;
        if (!id) return;
        res = await chatAPI.getMessages(id);
      } else {
        res = await chatAPI.getGroupMessages(currentChat._id);
      }
      setMessages(res.data);
    } catch (err) {
      console.error("fetchMessages error:", err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [convRes, groupsRes, usersRes] = await Promise.all([
        chatAPI.getConversations(),
        chatAPI.getMyGroups(),
        usersAPI.getAll(),
      ]);
      setConversations(convRes.data);
      setGroups(groupsRes.data);
      const myId = getMyId();
      setAllUsers(usersRes.data.filter((u: any) => u._id !== myId));
    } catch (err) {
      console.error("fetchData error:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    socket.current = socketService.connect();
    const myId = getMyId();
    const joinSelfRoom = () => {
      if (myId) socket.current?.emit("join_room", { room: myId });
    };
    if (socket.current?.connected) joinSelfRoom();
    socket.current?.on("connect", joinSelfRoom);

    socket.current.on("new_message", () => fetchMessages());
    socket.current.on("incoming_call", (data: any) => {
      setCaller(data.from); setCallType(data.type);
      pendingOffer.current = data.offer;
      setRemoteMicMuted(false);
      setCallStatus("incoming");
    });
    socket.current.on("call_accepted", async (data: any) => {
      await pc.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
      setCallStartedAt(Date.now());
      setCallStatus("active");
    });
    socket.current.on("ice_candidate", async (data: any) => {
      if (data.candidate) await pc.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
    });
    socket.current.on("call_status_update", (data: any) => {
      if (typeof data?.isMicMuted === "boolean") {
        setRemoteMicMuted(data.isMicMuted);
      }
    });
    socket.current.on("call_ended", () => endCall(false));

    const interval = setInterval(fetchData, 5000);
    return () => {
      clearInterval(interval);
      socket.current?.off("connect", joinSelfRoom);
      socket.current?.off("new_message");
      socket.current?.off("incoming_call");
      socket.current?.off("call_accepted");
      socket.current?.off("ice_candidate");
      socket.current?.off("call_status_update");
      socket.current?.off("call_ended");
    };
  }, [fetchData, fetchMessages]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat, chatType);
      const interval = setInterval(() => fetchMessages(), 3000);
      return () => clearInterval(interval);
    }
  }, [activeChat, chatType]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream; }, [localStream]);
  useEffect(() => { if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream; }, [remoteStream]);
  useEffect(() => {
    if (callStatus !== "active" || !callStartedAt) {
      setCallSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setCallSeconds(Math.floor((Date.now() - callStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [callStatus, callStartedAt]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat || sending) return;
    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);
    try {
      if (chatType === "dm") {
        const receiverId = activeChat.userId || activeChat._id;
        if (!receiverId) { toast.error("No recipient selected"); setNewMessage(messageText); return; }
        await chatAPI.sendMessage({ receiverId, message: messageText });
        socket.current?.emit("send_message", {
          receiverId,
          senderName: user?.name || getMyName(),
          message: messageText,
          timestamp: new Date().toISOString(),
        });
      } else {
        await chatAPI.sendGroupMessage(activeChat._id, { message: messageText });
      }
      await fetchMessages();
      await fetchData();
    } catch (err: any) {
      console.error("sendMessage error:", err);
      toast.error(err?.response?.data?.detail || "Failed to send message");
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const startNewChat = (targetUser: any) => {
    const chat = { userId: targetUser._id, name: targetUser.name, profilePhoto: targetUser.profilePhoto };
    setActiveChat(chat); setChatType("dm"); setShowNewChat(false);
    fetchMessages(chat, "dm");
  };

  const createGroup = async () => {
    if (!groupForm.name) { toast.error("Group name required"); return; }
    try {
      await chatAPI.createGroup(groupForm);
      toast.success("Group created!");
      setShowNewGroup(false);
      setGroupForm({ name: "", description: "", members: [] });
      fetchData();
    } catch (err) { toast.error("Failed to create group"); }
  };

  const filteredUsers = allUsers.filter((u) => u.name?.toLowerCase().includes(search.toLowerCase()));

  const initPeerConnection = () => {
    pc.current = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.current.onicecandidate = (event) => {
      if (event.candidate) socket.current.emit("ice_candidate", { candidate: event.candidate, to: callStatus === "calling" ? activeChat.userId : (caller?.id || caller?._id) });
    };
    pc.current.ontrack = (event) => setRemoteStream(event.streams[0]);
  };

  const startCall = async (type: "audio" | "video") => {
    if (!activeChat || chatType !== "dm") {
      toast.error("Calls are only available in direct chats");
      return;
    }
    setCallType(type); setCallStatus("calling"); initPeerConnection();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
      setLocalStream(stream);
      setIsMicMuted(false);
      setIsCameraOff(type !== "video");
      setRemoteMicMuted(false);
      stream.getTracks().forEach((track) => pc.current?.addTrack(track, stream));
      const offer = await pc.current?.createOffer();
      await pc.current?.setLocalDescription(offer);
      socket.current.emit("call_user", { to: activeChat.userId || activeChat._id, type, offer, from: { id: getMyId(), name: user?.name, profilePhoto: user?.profilePhoto } });
    } catch (err) { toast.error("Could not access camera/microphone"); setCallStatus("idle"); }
  };

  const acceptCall = async () => {
    initPeerConnection(); setCallStatus("active");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === "video" });
      setLocalStream(stream);
      setIsMicMuted(false);
      setIsCameraOff(callType !== "video");
      setRemoteMicMuted(false);
      setCallStartedAt(Date.now());
      stream.getTracks().forEach((track) => pc.current?.addTrack(track, stream));
      await pc.current?.setRemoteDescription(new RTCSessionDescription(pendingOffer.current));
      const answer = await pc.current?.createAnswer();
      await pc.current?.setLocalDescription(answer);
      socket.current.emit("call_accepted", { to: caller?.id || caller?._id, answer });
    } catch (err) { toast.error("Could not access camera/microphone"); endCall(); }
  };

  const endCall = (notifyPeer = true) => {
    localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setIsMicMuted(false);
    setIsCameraOff(false);
    setRemoteMicMuted(false);
    setCallStartedAt(null);
    setCallSeconds(0);
    pc.current?.close();
    pc.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setCallStatus("idle");
    if (notifyPeer) {
      socket.current?.emit("call_ended", { to: activeChat?.userId || caller?.id || caller?._id });
    }
  };

  const toggleMic = () => {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;
    const nextMuted = !isMicMuted;
    audioTracks.forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMicMuted(nextMuted);
    socket.current?.emit("call_status_update", {
      to: activeChat?.userId || caller?.id || caller?._id,
      isMicMuted: nextMuted,
    });
  };

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <div style={{ height: "calc(100vh - 64px)", display: "flex", gap: 0 }}>
      {/* Left Panel */}
      <div style={{ width: 320, minWidth: 320, borderRight: "1px solid var(--border-color)", display: "flex", flexDirection: "column", background: "rgba(15,15,26,0.5)", borderRadius: "16px 0 0 16px", overflow: "hidden" }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Messages</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowNewChat(true)} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: 6, cursor: "pointer", color: "#818cf8" }}><FiPlus size={16} /></button>
              <button onClick={() => setShowNewGroup(true)} style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8, padding: 6, cursor: "pointer", color: "#a855f7" }}><FiUsers size={16} /></button>
            </div>
          </div>
          <div style={{ display: "flex", background: "rgba(99,102,241,0.06)", borderRadius: 8, overflow: "hidden" }}>
            <button onClick={() => setTab("chats")} style={{ flex: 1, padding: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13, background: tab === "chats" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent", color: tab === "chats" ? "white" : "var(--text-secondary)" }}>Chats</button>
            <button onClick={() => setTab("groups")} style={{ flex: 1, padding: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13, background: tab === "groups" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent", color: tab === "groups" ? "white" : "var(--text-secondary)" }}>Groups</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {tab === "chats" ? (
            conversations.length === 0
              ? <p style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 13 }}>No conversations yet. Start a new chat!</p>
              : conversations.map((conv) => (
                <button key={conv.userId} onClick={() => { setActiveChat(conv); setChatType("dm"); }} style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", gap: 12, border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 4, background: activeChat?.userId === conv.userId ? "rgba(99,102,241,0.12)" : "transparent", textAlign: "left" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0 }}>{conv.name?.slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{conv.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conv.lastMessage}</p>
                  </div>
                </button>
              ))
          ) : (
            groups.length === 0
              ? <p style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 13 }}>No groups yet. Create one!</p>
              : groups.map((group) => (
                <button key={group._id} onClick={() => { setActiveChat(group); setChatType("group"); }} style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", gap: 12, border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 4, background: activeChat?._id === group._id && chatType === "group" ? "rgba(99,102,241,0.12)" : "transparent", textAlign: "left" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #8b5cf6, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FiUsers size={18} color="white" /></div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{group.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{group.members?.length || 0} members</p>
                  </div>
                </button>
              ))
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "rgba(22,33,62,0.3)", borderRadius: "0 16px 16px 0" }}>
        {activeChat ? (
          <>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: chatType === "group" ? "linear-gradient(135deg, #8b5cf6, #a855f7)" : "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white" }}>
                  {chatType === "group" ? <FiUsers size={18} color="white" /> : activeChat.name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>{activeChat.name}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{chatType === "dm" ? "Direct Message" : `${activeChat.members?.length || 0} members`}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => startCall("audio")}
                  disabled={chatType !== "dm"}
                  title={chatType !== "dm" ? "Calling is available only in direct chat" : "Start audio call"}
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: 10, cursor: chatType === "dm" ? "pointer" : "not-allowed", color: "#22c55e", opacity: chatType === "dm" ? 1 : 0.5 }}
                >
                  <FiPhone size={16} />
                </button>
                <button
                  onClick={() => startCall("video")}
                  disabled={chatType !== "dm"}
                  title={chatType !== "dm" ? "Calling is available only in direct chat" : "Start video call"}
                  style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: 10, cursor: chatType === "dm" ? "pointer" : "not-allowed", color: "#818cf8", opacity: chatType === "dm" ? 1 : 0.5 }}
                >
                  <FiVideo size={16} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <FiMessageCircle size={48} color="var(--text-muted)" />
                    <p style={{ color: "var(--text-muted)", marginTop: 12, fontSize: 14 }}>No messages yet. Say hello! 👋</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  // ✅ Use localStorage directly — no React state dependency
                  const myId = getMyId();
                  const myName = getMyName();
                  const isMe = msg.senderId === myId || msg.senderName === myName;
                  return (
                    <div key={msg._id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                      {!isMe && chatType === "group" && (
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2, paddingLeft: 4 }}>{msg.senderName}</p>
                      )}
                      <div className={`chat-bubble ${isMe ? "chat-bubble-sent" : "chat-bubble-received"}`}>
                        {msg.message}
                      </div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, padding: "0 4px" }}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-color)", display: "flex", gap: 12 }}>
              <input className="input-field" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()} placeholder="Type a message..." style={{ flex: 1 }} disabled={sending} />
              <button onClick={sendMessage} className="gradient-btn" style={{ padding: "10px 20px", opacity: sending ? 0.6 : 1 }} disabled={!newMessage.trim() || sending}><FiSend size={18} /></button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 96, height: 96, margin: "0 auto", borderRadius: 28, background: "linear-gradient(135deg, rgba(99,102,241,0.24), rgba(139,92,246,0.18))", border: "1px solid rgba(129,140,248,0.35)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 36px rgba(99,102,241,0.2)" }}>
                <FiMessageCircle size={48} color="#c4b5fd" />
              </div>
              <h3 style={{ color: "var(--text-secondary)", marginTop: 20, fontSize: 18 }}>Select a conversation</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Choose a chat from the left panel or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>New Chat</h2>
              <button onClick={() => setShowNewChat(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><FiX size={20} /></button>
            </div>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <FiSearch style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input className="input-field" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {filteredUsers.map((u) => (
                <button key={u._id} onClick={() => startNewChat(u)} style={{ width: "100%", padding: "10px 12px", display: "flex", alignItems: "center", gap: 12, border: "none", borderRadius: 8, cursor: "pointer", background: "transparent", textAlign: "left", marginBottom: 4 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white" }}>{u.name?.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{u.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.department}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      {showNewGroup && (
        <div className="modal-overlay" onClick={() => setShowNewGroup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Create Group</h2>
              <button onClick={() => setShowNewGroup(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><FiX size={20} /></button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Group Name</label>
              <input className="input-field" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="e.g., Development Team" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Description</label>
              <input className="input-field" value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Add Members</label>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {allUsers.map((u) => (
                  <label key={u._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", cursor: "pointer" }}>
                    <input type="checkbox" checked={groupForm.members.includes(u._id)} onChange={(e) => {
                      if (e.target.checked) setGroupForm({ ...groupForm, members: [...groupForm.members, u._id] });
                      else setGroupForm({ ...groupForm, members: groupForm.members.filter((m) => m !== u._id) });
                    }} />
                    <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{u.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>({u.department})</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setShowNewGroup(false)} style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>Cancel</button>
              <button onClick={createGroup} className="gradient-btn">Create Group</button>
            </div>
          </div>
        </div>
      )}

      {/* Call UI */}
      {callStatus !== "idle" && (
        <div className="modal-overlay" style={{ zIndex: 1000, background: "rgba(7,12,24,0.92)", backdropFilter: "blur(4px)" }}>
          <div style={{ width: "min(1100px, 92vw)" }}>
            {callStatus === "incoming" ? (
              <div className="glass-card" style={{ padding: 40, width: 320, margin: "0 auto" }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, margin: "0 auto 20px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FiUser size={40} color="white" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{caller?.name}</h3>
                <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>Incoming {callType} call...</p>
                <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
                  <button onClick={acceptCall} style={{ width: 56, height: 56, borderRadius: "50%", background: "#22c55e", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}><FiPhone size={24} /></button>
                  <button onClick={() => endCall()} style={{ width: 56, height: 56, borderRadius: "50%", background: "#ef4444", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}><FiPhone size={24} /></button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", height: "min(760px, 86vh)", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 6px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ color: "white", fontSize: 16, fontWeight: 700 }}>{activeChat?.name || caller?.name}</p>
                      {remoteMicMuted && (
                        <span title={`${activeChat?.name || caller?.name} muted`} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(239,68,68,0.92)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                          <FiMicOff size={12} />
                        </span>
                      )}
                    </div>
                    <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
                      {callStatus === "calling" ? `Calling (${callType})...` : `Connected - ${formatDuration(callSeconds)}`}
                    </p>
                  </div>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 999, padding: "6px 12px" }}>
                    {callType === "video" ? "Video Call" : "Audio Call"}
                  </span>
                </div>
                <div style={{ flex: 1, position: "relative", background: "#000", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: remoteStream && callType === "video" ? "block" : "none" }} />
                  {(!remoteStream || callType === "audio") && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "radial-gradient(circle at center, rgba(99,102,241,0.28), rgba(0,0,0,0.95))" }}>
                      <div style={{ width: 88, height: 88, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FiUser size={44} color="white" />
                      </div>
                      <p style={{ color: "white", fontSize: 14 }}>{remoteStream ? "Voice connected" : `Connecting to ${activeChat?.name || caller?.name}...`}</p>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 16, right: 16, width: 220, height: 140, background: "#202124", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.28)" }}>
                    {callType === "video" && !isCameraOff ? (
                      <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: 8, alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.8)" }}>
                        <FiVideoOff size={22} />
                        <span style={{ fontSize: 12 }}>Camera off</span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ paddingBottom: 6, display: "flex", justifyContent: "center", gap: 14 }}>
                  <button
                    onClick={toggleMic}
                    style={{ width: 58, height: 58, borderRadius: "50%", background: isMicMuted ? "rgba(239,68,68,0.95)" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.22)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}
                    title={isMicMuted ? "Unmute microphone" : "Mute microphone"}
                  >
                    {isMicMuted ? <FiMicOff size={24} /> : <FiMic size={24} />}
                  </button>
                  <button onClick={() => endCall()} style={{ width: 58, height: 58, borderRadius: "50%", background: "#ef4444", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }} title="End call">
                    <FiPhone size={24} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

