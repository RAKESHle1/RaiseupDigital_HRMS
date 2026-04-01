"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { chatAPI, usersAPI } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";
import { FiSend, FiPlus, FiUsers, FiMessageCircle, FiSearch, FiX, FiPhone, FiVideo, FiMic, FiMicOff, FiUser, FiVideoOff, FiCheck } from "react-icons/fi";
import socketService from "@/lib/socket";
import { playNotificationSound, startCallRingtone } from "@/lib/sounds";

// ─── Helper: format chat timestamp like WhatsApp ────────
const formatChatTime = (timestamp: string) => {
  try {
    const msgDate = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());

    if (msgDay.getTime() === today.getTime()) {
      return msgDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
    } else if (msgDay.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return msgDate.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" });
    }
  } catch {
    return "";
  }
};

const getMyId = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    return stored?.id || stored?._id || "";
  } catch {
    return "";
  }
};

export default function EmployeeChatPage() {
  const { user } = useAuthStore();
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
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [otherReadTimestamp, setOtherReadTimestamp] = useState<string>("");
  const [presenceByUser, setPresenceByUser] = useState<Record<string, "online" | "leave" | "offline">>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Refs to avoid stale closures ─────────────────────
  const activeChatRef = useRef<any>(null);
  const chatTypeRef = useRef<"dm" | "group">("dm");

  // WebRTC & Call State
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "incoming" | "active">("idle");
  const [callType, setCallType] = useState<"audio" | "video">("video");
  const [caller, setCaller] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<any>(null);
  const isTypingRef = useRef(false);
  const lastTypingEmitAtRef = useRef(0);
  const typingPauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOffer = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const stopRingtoneRef = useRef<(() => void) | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [remoteMicMuted, setRemoteMicMuted] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);

  // ─── Keep refs in sync with state ─────────────────────
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    chatTypeRef.current = chatType;
  }, [chatType]);

  // ─── fetchMessages uses refs (no stale closure) ────────
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
        // New response format: { messages: [...], otherReadTimestamp: "..." }
        const msgData = res.data.messages || res.data;
        const readTs = res.data.otherReadTimestamp || "";
        const sortedMessages = (Array.isArray(msgData) ? msgData : []).sort(
          (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setMessages(sortedMessages);
        setOtherReadTimestamp(readTs);
      } else {
        res = await chatAPI.getGroupMessages(currentChat._id);
        const sortedMessages = (Array.isArray(res.data) ? res.data : []).sort(
          (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setMessages(sortedMessages);
        setOtherReadTimestamp("");
      }
    } catch (err) {
      console.error("fetchMessages error:", err);
    }
  }, []);

  const getCurrentUserId = useCallback(() => {
    return user?.id || (user as any)?._id || getMyId();
  }, [user]);

  const loadUnreadCounts = useCallback(() => ({}), []);

  const clearUnreadForUser = useCallback(async (otherUserId?: string) => {
    if (!otherUserId) return;
    try {
      await chatAPI.markRead(otherUserId);
      setUnreadCounts((prev) => {
        if (!prev[otherUserId]) return prev;
        const next = { ...prev };
        delete next[otherUserId];
        return next;
      });
    } catch {}
  }, []);

  const incrementUnreadForUser = useCallback((otherUserId?: string) => {
    if (!otherUserId) return;
    setUnreadCounts((prev) => ({
      ...prev,
      [otherUserId]: (prev[otherUserId] || 0) + 1,
    }));
  }, []);

  const getPresenceStatus = useCallback((userId?: string) => {
    if (!userId) return "offline" as const;
    return presenceByUser[String(userId)] || "offline";
  }, [presenceByUser]);

  const getPresenceMeta = useCallback((userId?: string) => {
    const status = getPresenceStatus(userId);
    if (status === "online") return { label: "Online", color: "#22c55e" };
    if (status === "leave") return { label: "On Leave", color: "#f59e0b" };
    return { label: "Offline", color: "rgba(148,163,184,0.95)" };
  }, [getPresenceStatus]);

  const fetchData = useCallback(async () => {
    try {
      const [convRes, groupsRes, usersRes] = await Promise.all([
        chatAPI.getConversations(),
        chatAPI.getMyGroups(),
        usersAPI.getAll(),
      ]);
      const sortedConversations = [...convRes.data].sort(
        (a: any, b: any) => new Date(b.lastTimestamp || 0).getTime() - new Date(a.lastTimestamp || 0).getTime()
      );
      setConversations(sortedConversations);
      setGroups(groupsRes.data);
      const myId = user?.id || (user as any)?._id || getMyId();
      setAllUsers(usersRes.data.filter((u: any) => u._id !== myId));

      // Extract unread counts from conversation data (server-side)
      const newUnreadCounts: Record<string, number> = {};
      sortedConversations.forEach((c: any) => {
        if (c.unreadCount > 0) {
          newUnreadCounts[String(c.userId)] = c.unreadCount;
        }
      });
      setUnreadCounts(newUnreadCounts);

      const presenceUserIds = sortedConversations
        .map((c: any) => String(c.userId || ""))
        .filter(Boolean);
      if (presenceUserIds.length > 0) {
        const presenceRes = await chatAPI.getPresence(presenceUserIds);
        if (presenceRes?.data && typeof presenceRes.data === "object") {
          setPresenceByUser((prev) => ({ ...prev, ...presenceRes.data }));
        }
      }

      if (!activeChatRef.current && sortedConversations.length > 0) {
        setActiveChat(sortedConversations[0]);
        setChatType("dm");
      }
    } catch (err) {
      console.error("fetchData error:", err);
    }
  }, [user]);

  const stopPeerTypingIndicator = useCallback(() => {
    if (typingIndicatorTimeoutRef.current) {
      clearTimeout(typingIndicatorTimeoutRef.current);
      typingIndicatorTimeoutRef.current = null;
    }
    setIsPeerTyping(false);
    setTypingUserName("");
  }, []);

  const emitStopTyping = useCallback((chatOverride?: any) => {
    if (!isTypingRef.current || chatTypeRef.current !== "dm") return;
    const targetChat = chatOverride || activeChatRef.current;
    const receiverId = targetChat?.userId || targetChat?._id;
    if (!receiverId) return;
    socket.current?.emit("stop_typing", {
      receiverId,
      senderId: user?.id || (user as any)?._id || getMyId(),
      senderName: user?.name,
    });
    isTypingRef.current = false;
    lastTypingEmitAtRef.current = 0;
  }, [user]);

  const emitTyping = useCallback((chatOverride?: any) => {
    const targetChat = chatOverride || activeChatRef.current;
    if (!targetChat || chatTypeRef.current !== "dm") return;
    const receiverId = targetChat.userId || targetChat._id;
    if (!receiverId) return;
    socket.current?.emit("typing", {
      receiverId,
      senderId: user?.id || (user as any)?._id || getMyId(),
      senderName: user?.name,
    });
    isTypingRef.current = true;
    lastTypingEmitAtRef.current = Date.now();
  }, [user]);

  const handleMessageInputChange = (value: string) => {
    setNewMessage(value);
    if (chatTypeRef.current !== "dm" || !activeChatRef.current) return;

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      if (typingPauseTimeoutRef.current) {
        clearTimeout(typingPauseTimeoutRef.current);
        typingPauseTimeoutRef.current = null;
      }
      emitStopTyping();
      return;
    }

    const now = Date.now();
    if (!isTypingRef.current || now - lastTypingEmitAtRef.current > 700) {
      emitTyping();
    }

    if (typingPauseTimeoutRef.current) {
      clearTimeout(typingPauseTimeoutRef.current);
    }
    typingPauseTimeoutRef.current = setTimeout(() => {
      emitStopTyping();
    }, 1200);
  };

  useEffect(() => {
    // No need to load from localStorage anymore — server provides unread counts
  }, []);

  useEffect(() => {
    fetchData();
    socket.current = socketService.connect();
    const myId = user?.id || (user as any)?._id || getMyId();
    const joinSelfRoom = () => {
      if (myId) socket.current?.emit("join_room", { room: myId, self: true });
    };
    if (socket.current?.connected) joinSelfRoom();
    socket.current?.on("connect", joinSelfRoom);

    socket.current.on("new_message", (data: any) => {
      fetchMessages(); // now uses ref - no stale closure
      fetchData();

      const senderId = data?.senderId ? String(data.senderId) : "";
      if (senderId && senderId !== String(getCurrentUserId())) {
        playNotificationSound();
      }
      const currentChatId = String(activeChatRef.current?.userId || activeChatRef.current?._id || "");
      const isActiveDm = chatTypeRef.current === "dm" && senderId && senderId === currentChatId;
      if (senderId && !isActiveDm && senderId !== String(getCurrentUserId())) {
        incrementUnreadForUser(senderId);
      }
    });

    socket.current.on("presence_update", (data: any) => {
      const userId = String(data?.userId || "");
      const status = data?.status;
      if (!userId || (status !== "online" && status !== "offline")) return;
      setPresenceByUser((prev) => {
        const current = prev[userId];
        if (current === "leave" && status === "online") {
          return prev;
        }
        if (current === status) return prev;
        return { ...prev, [userId]: status };
      });
    });

    socket.current.on("user_typing", (data: any) => {
      if (chatTypeRef.current !== "dm") return;
      const currentChatId = activeChatRef.current?.userId || activeChatRef.current?._id;
      if (!currentChatId) return;
      const senderId = data?.senderId;
      if (!senderId || String(senderId) !== String(currentChatId)) return;
      setTypingUserName(data?.senderName || activeChatRef.current?.name || "");
      setIsPeerTyping(true);
      if (typingIndicatorTimeoutRef.current) {
        clearTimeout(typingIndicatorTimeoutRef.current);
      }
      typingIndicatorTimeoutRef.current = setTimeout(() => {
        setIsPeerTyping(false);
      }, 2800);
    });

    socket.current.on("user_stop_typing", (data: any) => {
      if (chatTypeRef.current !== "dm") return;
      const currentChatId = activeChatRef.current?.userId || activeChatRef.current?._id;
      if (!currentChatId) return;
      const senderId = data?.senderId;
      if (!senderId || String(senderId) !== String(currentChatId)) return;
      stopPeerTypingIndicator();
    });

    socket.current.on("incoming_call", (data: any) => {
      setCaller(data.from);
      setCallType(data.type);
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
      if (data.candidate) {
        await pc.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
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
      socket.current?.off("presence_update");
      socket.current?.off("user_typing");
      socket.current?.off("user_stop_typing");
      socket.current?.off("incoming_call");
      socket.current?.off("call_accepted");
      socket.current?.off("ice_candidate");
      socket.current?.off("call_status_update");
      socket.current?.off("call_ended");
      if (typingPauseTimeoutRef.current) {
        clearTimeout(typingPauseTimeoutRef.current);
        typingPauseTimeoutRef.current = null;
      }
      emitStopTyping();
      stopPeerTypingIndicator();
    };
  }, [user, fetchData, fetchMessages, emitStopTyping, stopPeerTypingIndicator, incrementUnreadForUser, getCurrentUserId]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat, chatType);
      const interval = setInterval(() => fetchMessages(), 3000);
      return () => clearInterval(interval);
    }
  }, [activeChat, chatType]);

  useEffect(() => {
    if (chatType !== "dm" || !activeChat) return;
    const chatUserId = String(activeChat.userId || activeChat._id || "");
    if (chatUserId) {
      clearUnreadForUser(chatUserId);
    }
  }, [activeChat, chatType, clearUnreadForUser]);

  useEffect(() => {
    stopPeerTypingIndicator();
    return () => {
      emitStopTyping(activeChat);
    };
  }, [activeChat, chatType, emitStopTyping, stopPeerTypingIndicator]);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPeerTyping]);

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

  useEffect(() => {
    if (callStatus === "calling" || callStatus === "incoming") {
      if (!stopRingtoneRef.current) {
        stopRingtoneRef.current = startCallRingtone();
      }
    } else if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }
  }, [callStatus]);

  useEffect(() => {
    return () => {
      if (stopRingtoneRef.current) {
        stopRingtoneRef.current();
        stopRingtoneRef.current = null;
      }
    };
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat || sending) return;
    const messageText = newMessage.trim();
    emitStopTyping(activeChat);
    if (typingPauseTimeoutRef.current) {
      clearTimeout(typingPauseTimeoutRef.current);
      typingPauseTimeoutRef.current = null;
    }
    setNewMessage("");
    setSending(true);
    try {
      if (chatType === "dm") {
        const receiverId = activeChat.userId || activeChat._id;
        if (!receiverId) { toast.error("No recipient selected"); setNewMessage(messageText); return; }
        await chatAPI.sendMessage({ receiverId, message: messageText });
        socket.current?.emit("send_message", {
          receiverId,
          senderId: getCurrentUserId(),
          senderName: user?.name,
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
    setActiveChat(chat);
    setChatType("dm");
    setShowNewChat(false);
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
    } catch (err) {
      toast.error("Failed to create group");
    }
  };

  const filteredUsers = allUsers.filter((u) => u.name?.toLowerCase().includes(search.toLowerCase()));

  const initPeerConnection = () => {
    pc.current = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("ice_candidate", { candidate: event.candidate, to: callStatus === "calling" ? activeChat.userId : (caller?.id || caller?._id) });
      }
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
      const myId = user?.id || (user as any)?._id || getMyId();
      socket.current.emit("call_user", { to: activeChat.userId || activeChat._id, type, offer, from: { id: myId, name: user?.name, profilePhoto: user?.profilePhoto } });
    } catch (err) {
      toast.error("Could not access camera/microphone");
      setCallStatus("idle");
    }
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
    } catch (err) {
      toast.error("Could not access camera/microphone");
      endCall();
    }
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
      socket.current.emit("call_ended", { to: activeChat?.userId || caller?.id || caller?._id });
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
      <style>{`
        @keyframes typing-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
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
            conversations.length === 0 ? (
              <p style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 13 }}>No conversations yet. Start a new chat!</p>
            ) : (
              conversations.map((conv) => {
                const unread = unreadCounts[String(conv.userId)] || 0;
                const presence = getPresenceMeta(String(conv.userId));
                const isActive = activeChat?.userId === conv.userId;
                const myId = user?.id || (user as any)?._id || getMyId();
                const isLastMsgFromOther = conv.lastSenderId && conv.lastSenderId !== myId;
                return (
                <button key={conv.userId} onClick={() => { setActiveChat(conv); setChatType("dm"); }} style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", gap: 12, border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 4, background: isActive ? "rgba(99,102,241,0.12)" : "transparent", textAlign: "left", transition: "background 0.15s" }}>
                  {/* Avatar with presence dot */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "white" }}>{conv.name?.slice(0, 2).toUpperCase()}</div>
                    <span style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: "50%", background: presence.color, border: "2px solid rgba(15,15,26,0.9)", boxShadow: `0 0 6px ${presence.color}` }} />
                  </div>
                  {/* Name + last message */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <p style={{ fontWeight: unread > 0 ? 700 : 600, fontSize: 14, color: "var(--text-primary)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{conv.name}</p>
                      <span style={{ fontSize: 11, color: unread > 0 ? "#22c55e" : "var(--text-muted)", flexShrink: 0, marginLeft: 8, fontWeight: unread > 0 ? 600 : 400 }}>
                        {conv.lastTimestamp ? formatChatTime(conv.lastTimestamp) : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p style={{ fontSize: 12.5, color: unread > 0 ? "var(--text-secondary)" : "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: unread > 0 ? 600 : 400, maxWidth: unread > 0 ? "calc(100% - 36px)" : "100%" }}>
                        {!isLastMsgFromOther && conv.lastMessage ? <><FiCheck size={12} style={{ display: "inline", marginRight: 3, verticalAlign: "middle", color: "#818cf8" }} /></> : null}
                        {conv.lastMessage || "Start chatting..."}
                      </p>
                      {unread > 0 && (
                        <div style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: "#25d366", color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 6 }}>
                          {unread > 99 ? "99+" : unread}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )})
            )
          ) : (
            groups.length === 0 ? (
              <p style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 13 }}>No groups yet. Create one!</p>
            ) : (
              groups.map((group) => (
                <button key={group._id} onClick={() => { setActiveChat(group); setChatType("group"); }} style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", gap: 12, border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 4, background: activeChat?._id === group._id && chatType === "group" ? "rgba(99,102,241,0.12)" : "transparent", textAlign: "left" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #8b5cf6, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FiUsers size={18} color="white" /></div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{group.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{group.members?.length || 0} members</p>
                  </div>
                </button>
              ))
            )
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
                  <p style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    {chatType === "dm" ? (
                      <>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: getPresenceMeta(String(activeChat.userId || activeChat._id)).color, boxShadow: `0 0 8px ${getPresenceMeta(String(activeChat.userId || activeChat._id)).color}` }} />
                        {getPresenceMeta(String(activeChat.userId || activeChat._id)).label}
                      </>
                    ) : (
                      `${activeChat.members?.length || 0} members`
                    )}
                  </p>
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
                  // ✅ Fixed isMe check
                  const isMe = msg.senderId === user?.id ||
                               msg.senderId === (user as any)?._id ||
                               msg.senderName === user?.name;

                  // Tick status for sent messages (DM only)
                  let tickStatus: "sent" | "delivered" | "read" = "sent";
                  if (isMe && chatType === "dm" && msg.timestamp) {
                    const recipientId = activeChatRef.current?.userId || activeChatRef.current?._id;
                    const isOtherOnline = presenceByUser[recipientId] === "online";
                    
                    if (otherReadTimestamp && msg.timestamp <= otherReadTimestamp) {
                      tickStatus = "read";
                    } else if (isOtherOnline) {
                      tickStatus = "delivered";
                    } else {
                      tickStatus = "sent";
                    }
                  }

                  return (
                    <div key={msg._id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                      {!isMe && chatType === "group" && (
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2, paddingLeft: 4 }}>{msg.senderName}</p>
                      )}
                      <div className={`chat-bubble ${isMe ? "chat-bubble-sent" : "chat-bubble-received"}`}>
                        <span>{msg.message}</span>
                        {isMe && chatType === "dm" && (
                          <span style={{ display: "inline-flex", alignItems: "center", marginLeft: 6, verticalAlign: "bottom", position: "relative", top: 2 }}>
                            {tickStatus === "read" ? (
                              /* Double blue ticks */
                              <span style={{ display: "inline-flex", alignItems: "center" }}>
                                <FiCheck size={13} style={{ color: "#53bdeb", strokeWidth: 3 }} />
                                <FiCheck size={13} style={{ color: "#53bdeb", strokeWidth: 3, marginLeft: -8 }} />
                              </span>
                            ) : tickStatus === "delivered" ? (
                              /* Double grey ticks */
                              <span style={{ display: "inline-flex", alignItems: "center" }}>
                                <FiCheck size={13} style={{ color: "rgba(255,255,255,0.5)", strokeWidth: 3 }} />
                                <FiCheck size={13} style={{ color: "rgba(255,255,255,0.5)", strokeWidth: 3, marginLeft: -8 }} />
                              </span>
                            ) : (
                              /* Single grey tick */
                              <FiCheck size={13} style={{ color: "rgba(255,255,255,0.5)", strokeWidth: 3 }} />
                            )}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, padding: "0 4px", display: "flex", alignItems: "center", gap: 3 }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  );
                })
              )}
              {chatType === "dm" && isPeerTyping && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <div
                    className="chat-bubble chat-bubble-received"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 52 }}
                    aria-label={`${typingUserName || activeChat?.name || "User"} is typing`}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.88)", animation: "typing-dot 1s ease-in-out 0s infinite" }} />
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.88)", animation: "typing-dot 1s ease-in-out 0.2s infinite" }} />
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.88)", animation: "typing-dot 1s ease-in-out 0.4s infinite" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-color)", display: "flex", gap: 12 }}>
              <input className="input-field" value={newMessage} onChange={(e) => handleMessageInputChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()} placeholder="Type a message..." style={{ flex: 1 }} disabled={sending} />
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
                      if (e.target.checked) { setGroupForm({ ...groupForm, members: [...groupForm.members, u._id] }); }
                      else { setGroupForm({ ...groupForm, members: groupForm.members.filter((m) => m !== u._id) }); }
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
                  {callType === "video" && (
                    <div style={{ position: "absolute", bottom: 16, right: 16, width: 220, height: 140, background: "#202124", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.28)" }}>
                      {!isCameraOff ? (
                        <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: 8, alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.8)" }}>
                          <FiVideoOff size={22} />
                          <span style={{ fontSize: 12 }}>Camera off</span>
                        </div>
                      )}
                    </div>
                  )}
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





