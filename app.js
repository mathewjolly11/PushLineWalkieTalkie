if (window.__pushlineAppLoaded) {
  console.warn("Pushline already initialized.");
} else {
  window.__pushlineAppLoaded = true;

  const config = window.PUSHLINE_CONFIG || {};
  const SUPABASE_URL = config.supabaseUrl;
  const SUPABASE_ANON_KEY = config.supabaseAnonKey;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    alert("Missing Supabase config. Create config.js from config.sample.js.");
    throw new Error("Missing Supabase config");
  }
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ptt = document.getElementById("ptt");
const toggle = document.getElementById("room-visibility");
const status = document.getElementById("status");
const statusText = document.getElementById("status-text");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const signInBtn = document.getElementById("sign-in");
const signUpBtn = document.getElementById("sign-up");
const authActions = document.getElementById("auth-actions");
const landingCta = document.getElementById("landing-cta");
const signOutBtn = document.getElementById("sign-out");
const authUser = document.getElementById("auth-user");
const roomNameInput = document.getElementById("room-name");
const roomIdInput = document.getElementById("room-id");
const createRoomBtn = document.getElementById("create-room");
const joinRoomBtn = document.getElementById("join-room");
const usersList = document.getElementById("users-list");
const publicRoomsPanel = document.getElementById("public-rooms-panel");
const publicRoomsList = document.getElementById("public-rooms-list");

let loaderOpen = false;

const showAlert = (icon, title, text, options = {}) => {
  if (loaderOpen) {
    closeLoader();
  }
  if (window.Swal && typeof window.Swal.fire === "function") {
    const iconColorMap = {
      success: "#9cff5a",
      error: "#ff6b6b",
      warning: "#ffd166",
      info: "#9bdcff",
      question: "#9bdcff"
    };
    window.Swal.fire({
      icon,
      title,
      text,
      background: "#0b0b0b",
      color: "#ffffff",
      iconColor: iconColorMap[icon] || "#ffffff",
      confirmButtonColor: "#ffffff",
      showConfirmButton: options.showConfirmButton ?? true,
      timer: options.timer,
      timerProgressBar: Boolean(options.timer),
      customClass: {
        popup: "pushline-swal",
        confirmButton: "pushline-swal-confirm"
      }
    });
  } else {
    alert(`${title}\n${text}`);
  }
};

const showLoader = (title, text) => {
  if (window.Swal && typeof window.Swal.fire === "function") {
    loaderOpen = true;
    window.Swal.fire({
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: "#0b0b0b",
      color: "#ffffff",
      customClass: {
        popup: "pushline-swal",
        loader: "pushline-swal-loader"
      },
      didOpen: () => {
        window.Swal.showLoading();
      }
    });
  }
};

const closeLoader = () => {
  if (window.Swal && typeof window.Swal.close === "function") {
    loaderOpen = false;
    window.Swal.close();
  }
};

let currentUser = null;
let currentRoomId = null;
let currentChannel = null;
let localStream = null;
let isChannelConnected = false;
const peers = new Map();
const peerSpeaking = new Map();
const pendingIce = new Map();
let audioContext = null;
let analyser = null;
let analyserSource = null;
let levelRaf = null;
const guestId = `guest-${(window.crypto?.randomUUID?.() || Math.random().toString(16).slice(2, 10))}`;

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

const generateRoomCode = () => {
  const num = Math.floor(Math.random() * 1000);
  return `WALK-${String(num).padStart(3, "0")}`;
};

const getClientId = () => currentUser?.id || guestId;

const getClientName = () => {
  if (currentUser?.email) {
    return currentUser.email.split("@")[0].toUpperCase();
  }
  return `GUEST-${guestId.slice(-4).toUpperCase()}`;
};

const setPressed = (isPressed) => {
  ptt.classList.toggle("active", isPressed);
  ptt.setAttribute("aria-pressed", String(isPressed));
  document.body.classList.toggle("speaking", isPressed);
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }
  if (localStream) {
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = isPressed;
    });
    broadcastSpeaking(isPressed);
  }
};

const startAudioLevelMeter = (stream) => {
  if (analyser && analyserSource) return;
  audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.8;
  analyserSource = audioContext.createMediaStreamSource(stream);
  analyserSource.connect(analyser);

  const data = new Uint8Array(analyser.fftSize);
  const tick = () => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const strength = Math.min(1, rms * 3.2);
    ptt.style.setProperty("--audio-strength", strength.toFixed(3));
    ptt.classList.toggle("audio-active", strength > 0.08);
    levelRaf = requestAnimationFrame(tick);
  };
  tick();
};

const stopAudioLevelMeter = () => {
  if (levelRaf) {
    cancelAnimationFrame(levelRaf);
    levelRaf = null;
  }
  if (analyserSource) {
    analyserSource.disconnect();
    analyserSource = null;
  }
  analyser = null;
  if (audioContext && audioContext.state !== "closed") {
    audioContext.close();
  }
  audioContext = null;
  ptt.style.setProperty("--audio-strength", "0");
  ptt.classList.remove("audio-active");
};

const setToggle = () => {
  const isPublic = toggle.getAttribute("aria-pressed") !== "false";
  toggle.setAttribute("aria-pressed", String(!isPublic));
};

const setStatus = () => {
  const connected = navigator.onLine && isChannelConnected;
  status.classList.toggle("offline", !connected);
  statusText.textContent = connected ? "Connected" : "Offline";
  document.body.classList.toggle("connected", connected);
};

const setAuthUI = (user) => {
  authUser.textContent = user ? `Signed in: ${user.email}` : "Signed out";
  const isSignedIn = Boolean(user);
  createRoomBtn.disabled = !isSignedIn;
  joinRoomBtn.disabled = false;
  signOutBtn.style.display = user ? "inline-block" : "none";
  authActions.style.display = user ? "none" : "grid";
  if (landingCta) {
    landingCta.style.display = user ? "none" : "flex";
  }
  if (publicRoomsPanel) {
    publicRoomsPanel.style.display = user ? "flex" : "none";
  }
  setStatus();
};

const isPublicRoom = (room) => room?.is_public === true || room?.is_public === "true" || room?.is_public === 1;

const renderPublicRooms = (rooms) => {
  if (!publicRoomsList) return;
  publicRoomsList.innerHTML = "";
  const visibleRooms = (rooms || []).filter(isPublicRoom);
  if (visibleRooms.length === 0) {
    publicRoomsList.innerHTML = "<div class=\"room-empty\">No public rooms yet.</div>";
    return;
  }

  visibleRooms.forEach((room) => {
    const item = document.createElement("div");
    item.className = "room-item";

    const meta = document.createElement("div");
    meta.className = "room-meta";

    const name = document.createElement("div");
    name.className = "room-name";
    name.textContent = room.name || "Untitled";

    const code = document.createElement("div");
    code.className = "room-code";
    code.textContent = room.code || "";

    meta.appendChild(name);
    meta.appendChild(code);

    const button = document.createElement("button");
    button.className = "btn ghost";
    button.textContent = "Join";
    button.dataset.roomId = room.id;

    item.appendChild(meta);
    item.appendChild(button);
    publicRoomsList.appendChild(item);
  });
};

const loadPublicRooms = async () => {
  if (!currentUser || !publicRoomsList) return;
  const { data, error } = await supabaseClient
    .from("rooms")
    .select("id, code, name, is_public")
    .eq("is_public", true)
    .limit(20);

  if (error) {
    renderPublicRooms([]);
    return;
  }

  renderPublicRooms(data || []);
};

const displayNameFor = (user) => {
  if (!user || !user.email) return "Unknown";
  return user.email.split("@")[0].toUpperCase();
};

const renderUsers = (presenceState) => {
  usersList.innerHTML = "";
  const entries = Object.entries(presenceState);
  if (entries.length === 0) {
    usersList.innerHTML = "<li class=\"user\"><span class=\"name\">No users</span><span class=\"mic\"></span></li>";
    return;
  }

  entries.forEach(([userId, metas]) => {
    const meta = metas[0] || {};
    const li = document.createElement("li");
    li.className = "user";
    const isSpeaking = peerSpeaking.get(userId);
    li.classList.add(isSpeaking ? "speaking" : "listening");

    const name = document.createElement("span");
    name.className = "name";
    const label = meta.name || "UNKNOWN";
    name.textContent = userId === getClientId() ? `${label} (YOU)` : label;

    const mic = document.createElement("span");
    mic.className = "mic";
    li.appendChild(name);
    li.appendChild(mic);
    usersList.appendChild(li);
  });
};

const broadcastSpeaking = async (isSpeaking) => {
  if (!currentChannel) return;
  const clientId = getClientId();
  peerSpeaking.set(clientId, isSpeaking);
  renderUsers(currentChannel.presenceState());
  await currentChannel.send({
    type: "broadcast",
    event: "signal",
    payload: { type: "talking", from: clientId, value: isSpeaking }
  });
};

const ensureLocalStream = async () => {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  localStream.getAudioTracks().forEach((track) => {
    track.enabled = false;
  });
  startAudioLevelMeter(localStream);
  return localStream;
};

const cleanupRoom = async () => {
  if (currentChannel) {
    await currentChannel.unsubscribe();
  }
  currentChannel = null;
  currentRoomId = null;
  isChannelConnected = false;
  peers.forEach((peer) => peer.pc.close());
  peers.clear();
  peerSpeaking.clear();
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  stopAudioLevelMeter();
  renderUsers({});
  setStatus();
};

const sendSignal = async (payload) => {
  if (!currentChannel) return;
  await currentChannel.send({ type: "broadcast", event: "signal", payload });
};

const createPeerConnection = async (peerId, shouldOffer) => {
  if (peers.has(peerId)) return peers.get(peerId).pc;
  const clientId = getClientId();

  const pc = new RTCPeerConnection(rtcConfig);
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.id = `audio-${peerId}`;
  document.body.appendChild(audio);

  const stream = await ensureLocalStream();
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignal({ type: "ice", to: peerId, from: clientId, candidate: event.candidate });
    }
  };

  pc.ontrack = (event) => {
    audio.srcObject = event.streams[0];
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed" || pc.connectionState === "closed") {
      audio.remove();
      peers.delete(peerId);
    }
  };

  peers.set(peerId, { pc, audio });

  if (shouldOffer) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal({ type: "offer", to: peerId, from: clientId, sdp: offer });
  }

  return pc;
};

const handleSignal = async (payload) => {
  const clientId = getClientId();
  if (!payload || payload.from === clientId) return;
  if (payload.to && payload.to !== clientId) return;

  if (payload.type === "talking") {
    peerSpeaking.set(payload.from, payload.value);
    renderUsers(currentChannel.presenceState());
    return;
  }

  const shouldOffer = payload.type === "offer" ? false : clientId < payload.from;
  const pc = await createPeerConnection(payload.from, shouldOffer);

  if (payload.type === "offer") {
    if (pc.signalingState !== "stable") {
      return;
    }
    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await sendSignal({ type: "answer", to: payload.from, from: clientId, sdp: answer });

    const queued = pendingIce.get(payload.from);
    if (queued && queued.length) {
      for (const candidate of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingIce.delete(payload.from);
    }
  }

  if (payload.type === "answer") {
    if (pc.signalingState !== "have-local-offer") {
      return;
    }
    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

    const queued = pendingIce.get(payload.from);
    if (queued && queued.length) {
      for (const candidate of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingIce.delete(payload.from);
    }
  }

  if (payload.type === "ice" && payload.candidate) {
    try {
      if (!pc.remoteDescription) {
        const queued = pendingIce.get(payload.from) || [];
        queued.push(payload.candidate);
        pendingIce.set(payload.from, queued);
        return;
      }
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch (error) {
      console.error("ICE error", error);
    }
  }
};

const joinRoom = async (roomId) => {
  await cleanupRoom();
  currentRoomId = roomId;
  const clientId = getClientId();

  currentChannel = supabaseClient.channel(`room:${roomId}`, {
    config: {
      presence: {
        key: clientId
      }
    }
  });

  currentChannel.on("presence", { event: "sync" }, () => {
    const state = currentChannel.presenceState();
    renderUsers(state);
    const peersNow = new Set(Object.keys(state).filter((id) => id !== clientId));
    peersNow.forEach((peerId) => {
      const shouldOffer = clientId < peerId;
      createPeerConnection(peerId, shouldOffer);
    });

    peers.forEach((value, peerId) => {
      if (!peersNow.has(peerId)) {
        value.pc.close();
        value.audio.remove();
        peers.delete(peerId);
      }
    });
  });

  currentChannel.on("broadcast", { event: "signal" }, ({ payload }) => {
    handleSignal(payload);
  });

  currentChannel.subscribe((status) => {
    isChannelConnected = status === "SUBSCRIBED";
    if (status === "SUBSCRIBED") {
      currentChannel.track({
        user_id: clientId,
        name: currentUser ? displayNameFor(currentUser) : getClientName()
      });
    }
    setStatus();
  });
};

const createRoom = async () => {
  if (!currentUser) {
    showAlert("warning", "Sign in required", "Create room needs a signed-in account.");
    return;
  }
  const name = roomNameInput.value.trim() || "Untitled";
  const isPublic = toggle.getAttribute("aria-pressed") !== "false";
  showLoader("Creating room", "Please wait...");
  try {
    let data = null;
    let error = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = generateRoomCode();
      ({ data, error } = await supabaseClient
        .from("rooms")
        .insert({ code, name, is_public: isPublic, created_by: currentUser.id })
        .select()
        .single());
      if (!error) break;
    }

    if (error) {
      showAlert("error", "Create room failed", error.message);
      return;
    }

    roomIdInput.value = data.code;
    joinRoom(data.id);
    loadPublicRooms();
  } finally {
    closeLoader();
  }
};

const joinRoomById = async () => {
  const roomId = roomIdInput.value.trim();
  if (!roomId) return;
  showLoader("Joining room", "Please wait...");
  try {
    const { data, error } = await supabaseClient
      .from("rooms")
      .select("id, code, is_public")
      .eq("code", roomId)
      .maybeSingle();

    if (error) {
      showAlert("error", "Join failed", "Please try again.");
      return;
    }

    if (!data) {
      showAlert("error", "Room not found", "Check the room code and try again.");
      return;
    }

    if (!currentUser && !isPublicRoom(data)) {
      showAlert("warning", "Private room", "Sign in to join private rooms.");
      return;
    }

    joinRoom(data.id);
  } finally {
    closeLoader();
  }
};

signInBtn.addEventListener("click", async () => {
  if (!authEmail.value.trim() || !authPassword.value) {
    showAlert("warning", "Missing details", "Enter email and password.");
    return;
  }
  showLoader("Signing in", "Please wait...");
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: authEmail.value,
      password: authPassword.value
    });
    if (error) {
      showAlert("error", "Sign in failed", "Check your email or password and try again.");
      return;
    }
    showAlert("success", "Signed in", "Welcome back.", { timer: 2500 });
  } finally {
    closeLoader();
  }
});

signUpBtn.addEventListener("click", async () => {
  if (!authEmail.value.trim() || !authPassword.value) {
    showAlert("warning", "Missing details", "Enter email and password.");
    return;
  }
  showLoader("Signing up", "Creating your account...");
  try {
    const { error } = await supabaseClient.auth.signUp({
      email: authEmail.value,
      password: authPassword.value
    });
    if (error) {
      const message = error.message && /already\s+registered/i.test(error.message)
        ? "Email already exists. Please sign in."
        : error.message;
      showAlert("error", "Sign up failed", message);
      return;
    }
    showAlert("success", "Sign up success", "Check your email if confirmation is required.", { timer: 3000 });
  } finally {
    closeLoader();
  }
});


signOutBtn.addEventListener("click", async () => {
  await cleanupRoom();
  await supabaseClient.auth.signOut();
  showAlert("success", "Signed out", "You have been signed out.");
});

if (publicRoomsList) {
  publicRoomsList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches("button[data-room-id]")) {
      const roomId = target.dataset.roomId;
      if (roomId) {
        joinRoom(roomId);
      }
    }
  });
}

createRoomBtn.addEventListener("click", createRoom);
joinRoomBtn.addEventListener("click", joinRoomById);
toggle.addEventListener("click", setToggle);

ptt.addEventListener("pointerdown", () => setPressed(true));
ptt.addEventListener("pointerup", () => setPressed(false));
ptt.addEventListener("pointerleave", () => setPressed(false));
ptt.addEventListener("pointercancel", () => setPressed(false));

window.addEventListener("online", setStatus);
window.addEventListener("offline", setStatus);

supabaseClient.auth.getSession().then(({ data }) => {
  currentUser = data.session?.user || null;
  setAuthUI(currentUser);
  if (currentUser) {
    loadPublicRooms();
  }
});

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    setAuthUI(currentUser);
    if (currentUser) {
      loadPublicRooms();
    } else if (publicRoomsList) {
      renderPublicRooms([]);
    }
  });
}
