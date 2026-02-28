/* ═══════════════════════════════════════════
   PurpleFix — Application Logic
   (Supabase config is in config.js)
   ═══════════════════════════════════════════ */

// ══════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════
const state = {
  currentScreen: 'landing',
  device_uuid: '',
  image_data: null,
  lat: 42.0551,
  lng: -87.6754,
  address: '',
  description: '',
  cameraStream: null,
  cameraPermissionGranted: false,
  leafletMap: null,
  geocodeTimer: null,
  recognition: null,
  voiceFinalTranscript: '',
  issues: [],          // local copy of submitted issues
  imageSource: null,   // 'camera' or 'upload' — controls retake button label
};

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
(function init() {
  // Device UUID
  let id = null;
  try { id = localStorage.getItem('purplefix_device_uuid'); } catch (e) {}
  if (!id) {
    id = 'pf-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));
    try { localStorage.setItem('purplefix_device_uuid', id); } catch (e) {}
  }
  state.device_uuid = id;

  // Load saved issues and deduplicate
  try {
    const saved = localStorage.getItem('purplefix_issues');
    if (saved) {
      var loaded = JSON.parse(saved);
      // Deduplicate by created_at (trimmed to seconds)
      var seen = {};
      state.issues = loaded.filter(function(issue) {
        var key = issue.created_at ? issue.created_at.substring(0, 19) : Math.random().toString();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
      localStorage.setItem('purplefix_issues', JSON.stringify(state.issues));
    }
  } catch (e) {}

  // Textarea listeners
  document.addEventListener('DOMContentLoaded', () => {
    var vr = document.getElementById('voice-result');
    if (vr) vr.addEventListener('input', function () {
      state.description = this.value;
      state.voiceFinalTranscript = this.value;
      updateSubmitBtn();
    });
  });
})();

// ══════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════
function goTo(screen) {
  // Remove active from all
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));

  // Cleanup previous
  if (state.currentScreen === 'camera') stopCameraStream();
  if (state.currentScreen === 'location') destroyMap();

  // Setup new screen
  if (screen === 'camera') startCamera();
  if (screen === 'preview') {
    document.getElementById('preview-img').src = state.image_data || '';
    // Reset the confirm button
    const btn = document.getElementById('confirm-photo-btn');
    btn.disabled = false;
    btn.innerHTML = '✅ Looks Good';
    // Dynamic retake/re-upload label
    const retakeBtn = document.getElementById('retake-btn');
    retakeBtn.textContent = state.imageSource === 'upload' ? '🔄 Re-upload' : '🔄 Retake';
  }
  if (screen === 'location') setTimeout(initMap, 100);
  if (screen === 'describe') resetDescribe();
  if (screen === 'success') {
    setTimeout(() => {
      const fill = document.getElementById('progress-fill');
      fill.style.animation = 'none';
      void fill.offsetWidth;
      fill.style.animation = 'shrink 3.5s linear forwards';
    }, 50);
    setTimeout(() => goTo('home'), 3500);
  }
  if (screen === 'track') {
    renderIssues();
  }
  if (screen === 'home') {
    updateBadge();
  }

  // Render step indicators
  if (screen === 'media') renderSteps('media-steps', 0);
  if (screen === 'location') renderSteps('loc-steps', 1);
  if (screen === 'describe') renderSteps('desc-steps', 2);

  // Activate
  const nextEl = document.getElementById('s-' + screen);
  if (nextEl) nextEl.classList.add('active');
  state.currentScreen = screen;
}

// ══════════════════════════════════════════
//  APP ENTRY POINT
// ══════════════════════════════════════════
function start() {
  // Only skip how-it-works if this device has submitted at least one issue
  if (state.issues.length > 0) {
    goTo('home');
  } else {
    goTo('howitworks');
  }
}

// ══════════════════════════════════════════
//  STEP INDICATOR (SVG icons, clickable)
// ══════════════════════════════════════════
var stepIcons = [
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
];
var stepLabels = ['Capture', 'Locate', 'Describe', 'Submit'];
// Map step index to the screen it navigates to
var stepScreens = ['media', 'location', 'describe', null]; // null = submit, not navigable

function renderSteps(containerId, activeIdx) {
  var el = document.getElementById(containerId);
  if (!el) return;
  var html = '<div class="steps-row">';
  stepLabels.forEach(function(label, i) {
    var isActive = i <= activeIdx;
    var isClickable = i <= activeIdx && stepScreens[i] !== null;
    var clickAttr = isClickable ? ' onclick="App.jumpToStep(' + i + ')" style="cursor:pointer;"' : '';
    html += '<div class="step-item">' +
      '<div class="step-dot ' + (isActive ? 'active' : '') + '"' + clickAttr + '>' + stepIcons[i] + '</div>' +
      '<span class="step-label ' + (isActive ? 'active' : '') + '">' + label + '</span>' +
      '</div>';
    if (i < stepLabels.length - 1) {
      html += '<div class="step-line ' + (i < activeIdx ? 'active' : '') + '"></div>';
    }
  });
  html += '</div>';
  el.innerHTML = html;
}

function jumpToStep(stepIdx) {
  var screen = stepScreens[stepIdx];
  if (!screen) return;

  // Reset data for steps after this one
  if (stepIdx === 0) {
    // Going back to Capture — discard image, location, description
    state.image_data = null;
    state.imageSource = null;
    state.address = '';
    state.description = '';
    state.voiceFinalTranscript = '';
  } else if (stepIdx === 1) {
    // Going back to Location — discard location and description
    state.address = '';
    state.description = '';
    state.voiceFinalTranscript = '';
  } else if (stepIdx === 2) {
    // Going back to Describe — discard description
    state.description = '';
    state.voiceFinalTranscript = '';
  }

  goTo(screen);
}

// ══════════════════════════════════════════
//  CAMERA
// ══════════════════════════════════════════
async function startCamera() {
  const video = document.getElementById('cam-video');
  const fallback = document.getElementById('cam-fallback');

  // If we already have a granted permission or stream, reuse approach
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    state.cameraStream = stream;
    state.cameraPermissionGranted = true;
    video.srcObject = stream;
    video.style.display = 'block';
    if (fallback) fallback.style.display = 'none';
  } catch (e) {
    console.error('Camera error:', e);
    video.style.display = 'none';
    if (fallback) fallback.style.display = 'flex';

    if (!state.cameraPermissionGranted) {
      // Only alert on first denial
      alert('Camera access is needed to take a photo. Please allow camera in your browser settings, or use the Upload option.');
      goTo('media');
    }
  }
}

function stopCameraStream() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(t => t.stop());
    state.cameraStream = null;
  }
}

function openCamera() {
  goTo('camera');
}

function capturePhoto() {
  const video = document.getElementById('cam-video');
  if (video && video.videoWidth) {
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    state.image_data = c.toDataURL('image/jpeg', 0.85);
    state.imageSource = 'camera';
  }
  stopCameraStream();
  goTo('preview');
}

function handleFileUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    state.image_data = ev.target.result;
    state.imageSource = 'upload';
    goTo('preview');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function retakePhoto() {
  state.image_data = null;
  // Go back to media chooser — camera permission is already granted
  // so "Take Photo" will open camera without re-prompting
  goTo('media');
}

function confirmPhoto() {
  const btn = document.getElementById('confirm-photo-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Getting location...';

  navigator.geolocation.getCurrentPosition(
    pos => {
      state.lat = pos.coords.latitude;
      state.lng = pos.coords.longitude;
      goTo('location');
    },
    () => {
      // Fallback to Northwestern campus
      state.lat = 42.0551;
      state.lng = -87.6754;
      goTo('location');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ══════════════════════════════════════════
//  MAP & GEOCODING
// ══════════════════════════════════════════
function initMap() {
  const container = document.getElementById('leaflet-map');
  if (!container || state.leafletMap) return;

  state.leafletMap = L.map(container, {
    center: [state.lat, state.lng],
    zoom: 17, zoomControl: false, attributionControl: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(state.leafletMap);

  state.leafletMap.on('moveend', function () {
    const c = state.leafletMap.getCenter();
    state.lat = c.lat;
    state.lng = c.lng;
    clearTimeout(state.geocodeTimer);
    state.geocodeTimer = setTimeout(() => reverseGeocode(c.lat, c.lng), 400);
  });

  setTimeout(() => state.leafletMap.invalidateSize(), 150);
  reverseGeocode(state.lat, state.lng);
}

function destroyMap() {
  if (state.leafletMap) {
    state.leafletMap.remove();
    state.leafletMap = null;
  }
}

function reverseGeocode(lat, lng) {
  const el = document.getElementById('addr-text');
  el.innerHTML = '<span class="spinner spinner-purple"></span> Fetching address...';

  fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&addressdetails=1&zoom=18', {
    headers: { 'Accept-Language': 'en' }
  })
    .then(r => r.json())
    .then(data => {
      if (data && data.address) {
        const a = data.address;
        const parts = [];
        if (a.house_number && a.road) parts.push(a.house_number + ' ' + a.road);
        else if (a.road) parts.push(a.road);
        else if (a.building) parts.push(a.building);
        if (a.neighbourhood) parts.push(a.neighbourhood);
        if (a.suburb) parts.push(a.suburb);
        if (a.city || a.town || a.village) parts.push(a.city || a.town || a.village);
        if (a.state) parts.push(a.state);
        const address = parts.filter(Boolean).join(', ');
        state.address = address || data.display_name || lat.toFixed(5) + ', ' + lng.toFixed(5);
      } else {
        state.address = data.display_name || lat.toFixed(5) + ', ' + lng.toFixed(5);
      }
      el.textContent = state.address;
    })
    .catch(() => {
      state.address = lat.toFixed(5) + ', ' + lng.toFixed(5);
      el.textContent = state.address;
    });
}

function confirmLocation() {
  goTo('describe');
}

// ══════════════════════════════════════════
//  DESCRIBE & VOICE
// ══════════════════════════════════════════
function resetDescribe() {
  document.getElementById('input-chooser').style.display = 'flex';
  document.getElementById('voice-ui').style.display = 'none';
  document.getElementById('voice-toolbar').style.display = 'none';
  document.getElementById('voice-result-wrap').style.display = 'none';
  document.getElementById('form-input-wrap').style.display = 'none';
  // Reset form fields
  document.getElementById('object-select').value = '';
  document.getElementById('issue-select').value = '';
  document.getElementById('issue-extra').value = '';
  var vr = document.getElementById('voice-result');
  if (vr) vr.value = '';
  state.voiceFinalTranscript = '';
  state.description = '';
  document.getElementById('submit-btn').disabled = true;
}

function showFormInput() {
  document.getElementById('input-chooser').style.display = 'none';
  document.getElementById('voice-ui').style.display = 'none';
  document.getElementById('voice-toolbar').style.display = 'none';
  document.getElementById('voice-result-wrap').style.display = 'none';
  document.getElementById('form-input-wrap').style.display = 'flex';
  updateSubmitBtn();
}

function updateSubmitBtn() {
  // For form mode: need both object and issue selected
  var formWrap = document.getElementById('form-input-wrap');
  var voiceWrap = document.getElementById('voice-result-wrap');

  if (formWrap.style.display === 'flex') {
    var obj = document.getElementById('object-select').value;
    var issue = document.getElementById('issue-select').value;
    document.getElementById('submit-btn').disabled = !obj || !issue;
  } else if (voiceWrap.style.display === 'block' || voiceWrap.style.display === 'flex') {
    var vr = document.getElementById('voice-result');
    document.getElementById('submit-btn').disabled = !(vr && vr.value.trim());
  } else {
    document.getElementById('submit-btn').disabled = true;
  }
}

function startVoice() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Speech recognition not supported in this browser. Please use the Type option.');
    showFormInput();
    return;
  }

  document.getElementById('input-chooser').style.display = 'none';
  document.getElementById('voice-ui').style.display = 'flex';
  document.getElementById('voice-toolbar').style.display = 'none';
  document.getElementById('voice-result-wrap').style.display = 'none';
  document.getElementById('form-input-wrap').style.display = 'none';

  var recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  var base = state.voiceFinalTranscript;

  recognition.onresult = function (event) {
    var interim = '';
    var final = base;
    for (var i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript + ' ';
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    state.voiceFinalTranscript = final;
    state.description = (final + interim).trim();
    var vr = document.getElementById('voice-result');
    if (vr) vr.value = state.description;
    updateSubmitBtn();
  };

  recognition.onend = function () {
    state.description = state.voiceFinalTranscript.trim();
    document.getElementById('voice-ui').style.display = 'none';
    if (state.description) {
      document.getElementById('voice-toolbar').style.display = 'flex';
      document.getElementById('voice-result-wrap').style.display = 'block';
      var vr = document.getElementById('voice-result');
      if (vr) vr.value = state.description;
    } else {
      document.getElementById('input-chooser').style.display = 'flex';
    }
    updateSubmitBtn();
  };

  recognition.onerror = function () { stopVoice(); };

  state.recognition = recognition;
  recognition.start();
}

function stopVoice() {
  if (state.recognition) {
    state.recognition.stop();
    state.recognition = null;
  }
}

// ══════════════════════════════════════════
//  IMAGE COMPRESSION
// ══════════════════════════════════════════
function compressImage(base64Data, maxWidth, quality) {
  maxWidth = maxWidth || 1200;
  quality = quality || 0.6;

  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() {
      var w = img.width;
      var h = img.height;

      // Scale down if wider than maxWidth
      if (w > maxWidth) {
        h = Math.round(h * (maxWidth / w));
        w = maxWidth;
      }

      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      var compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = function() {
      resolve(base64Data); // fallback to original
    };
    img.src = base64Data;
  });
}

// ══════════════════════════════════════════
//  SUBMIT
// ══════════════════════════════════════════
async function submitReport() {
  var btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Submitting...';

  // Build description from whichever input mode was used
  var formWrap = document.getElementById('form-input-wrap');
  var description = '';

  if (formWrap.style.display === 'flex') {
    var obj = document.getElementById('object-select').value;
    var issue = document.getElementById('issue-select').value;
    var extra = document.getElementById('issue-extra').value.trim();
    description = obj + ' — ' + issue;
    if (extra) description += ': ' + extra;
  } else {
    var vr = document.getElementById('voice-result');
    description = vr ? vr.value.trim() : state.description;
  }

  state.description = description;

  // Compress image before upload (max 1200px wide, 60% quality)
  var compressedImage = null;
  if (state.image_data) {
    btn.innerHTML = '<span class="spinner"></span> Compressing image...';
    compressedImage = await compressImage(state.image_data, 1200, 0.6);
  }

  // Upload image to Supabase
  btn.innerHTML = '<span class="spinner"></span> Uploading...';
  var imageUrl = await supabaseUpload(compressedImage);

  // Build record
  var record = {
    device_uuid: state.device_uuid,
    image_url: imageUrl,
    latitude: state.lat,
    longitude: state.lng,
    address: state.address,
    description: state.description,
    status: 'submitted',
    created_at: new Date().toISOString()
  };

  // Insert into Supabase
  btn.innerHTML = '<span class="spinner"></span> Saving...';
  var insertResult = await supabaseInsert(record);
  if (insertResult && insertResult.length > 0) {
    // Use the server record (has exact timestamps, id, etc.)
    record = insertResult[0];
    record.status = record.status || 'submitted';
  } else if (!insertResult) {
    record.status = 'local_only';
  }

  // Save locally
  state.issues.unshift(record);
  try { localStorage.setItem('purplefix_issues', JSON.stringify(state.issues)); } catch (e) {}

  // Reset report state
  state.image_data = null;
  state.imageSource = null;
  state.address = '';
  state.description = '';
  state.voiceFinalTranscript = '';

  goTo('success');
}

// ══════════════════════════════════════════
//  TRACK SCREEN
// ══════════════════════════════════════════
async function renderIssues() {
  const list = document.getElementById('issues-list');
  const noEl = document.getElementById('no-issues');

  if (state.issues.length === 0) {
    list.innerHTML = '';
    noEl.style.display = 'flex';
    return;
  }

  // Show current local data immediately
  noEl.style.display = 'none';
  renderIssueCards();

  // Then refresh statuses from Supabase in the background
  await refreshStatusesFromSupabase();
}

function renderIssueCards() {
  const list = document.getElementById('issues-list');
  const noEl = document.getElementById('no-issues');

  if (state.issues.length === 0) {
    list.innerHTML = '';
    noEl.style.display = 'flex';
    return;
  }
  noEl.style.display = 'none';

  var statusColors = {
    'submitted':   { bg: 'rgba(39,174,96,0.1)',   color: '#27AE60', label: 'Submitted' },
    'local_only':  { bg: 'rgba(230,126,34,0.1)',   color: '#E67E22', label: 'Local only' },
    'pending':     { bg: 'rgba(78,42,132,0.1)',    color: '#4E2A84', label: 'Pending' },
    'in_progress': { bg: 'rgba(243,156,18,0.12)',  color: '#F39C12', label: 'In progress' },
    'resolved':    { bg: 'rgba(39,174,96,0.12)',   color: '#27AE60', label: 'Resolved' },
    'closed':      { bg: 'rgba(149,165,166,0.15)', color: '#95A5A6', label: 'Closed' }
  };

  list.innerHTML = state.issues.map(function(issue, i) {
    var date = new Date(issue.created_at);
    var timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' +
      date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    var status = (issue.status || 'submitted').toLowerCase();
    var sc = statusColors[status] || statusColors['submitted'];

    return '<div class="issue-card" style="animation-delay:' + (i * 0.06) + 's;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
      '<span class="issue-card-status" style="background:' + sc.bg + ';color:' + sc.color + ';">' + escapeHtml(sc.label) + '</span>' +
      '<span class="issue-card-time">' + timeStr + '</span>' +
      '</div>' +
      '<p class="issue-card-desc">' + escapeHtml(issue.description) + '</p>' +
      '<div class="issue-card-location">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="#4E2A84" stroke="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>' +
      '<span>' + escapeHtml(issue.address || 'Location set') + '</span>' +
      '</div>' +
      '</div>';
  }).join('');
}

async function refreshStatusesFromSupabase() {
  if (!SUPABASE_URL || SUPABASE_URL.indexOf('YOUR_PROJECT') !== -1) return;
  if (!state.device_uuid) return;

  try {
    var res = await fetch(
      SUPABASE_URL + '/rest/v1/issues?device_uuid=eq.' + encodeURIComponent(state.device_uuid) + '&order=created_at.desc',
      {
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!res.ok) throw new Error('Fetch failed');

    var remoteIssues = await res.json();
    if (!remoteIssues || !remoteIssues.length) return;

    // Build remote map keyed by created_at (trimmed to seconds for safe matching)
    var remoteMap = {};
    remoteIssues.forEach(function(ri) {
      var key = ri.created_at ? ri.created_at.substring(0, 19) : '';
      remoteMap[key] = ri;
    });

    var updated = false;

    // Update statuses of local issues from remote
    state.issues.forEach(function(localIssue) {
      var key = localIssue.created_at ? localIssue.created_at.substring(0, 19) : '';
      var remote = remoteMap[key];
      if (remote && remote.status !== localIssue.status) {
        localIssue.status = remote.status;
        updated = true;
      }
    });

    // Delete issues with status 'delete-student-copy'
    var beforeLen = state.issues.length;
    state.issues = state.issues.filter(function(issue) {
      return issue.status !== 'delete-student-copy';
    });
    if (state.issues.length !== beforeLen) updated = true;

    // Add remote issues we don't have locally (avoid duplicates)
    remoteIssues.forEach(function(ri) {
      if (ri.status === 'delete-student-copy') return; // skip deleted
      var riKey = ri.created_at ? ri.created_at.substring(0, 19) : '';
      var exists = state.issues.some(function(li) {
        var liKey = li.created_at ? li.created_at.substring(0, 19) : '';
        return liKey === riKey;
      });
      if (!exists) {
        state.issues.push(ri);
        updated = true;
      }
    });

    if (updated) {
      state.issues.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
      try { localStorage.setItem('purplefix_issues', JSON.stringify(state.issues)); } catch (e) {}
      renderIssueCards();
      updateBadge();
    }
  } catch (e) {
    console.warn('Status refresh failed:', e.message);
  }
}

function updateBadge() {
  const badge = document.getElementById('track-badge');
  if (state.issues.length > 0) {
    badge.style.display = 'flex';
    badge.textContent = state.issues.length;
  } else {
    badge.style.display = 'none';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ══════════════════════════════════════════
//  SUPABASE HELPERS
// ══════════════════════════════════════════
async function supabaseUpload(base64Data) {
  if (!base64Data) return null;
  if (!SUPABASE_URL || SUPABASE_URL.indexOf('YOUR_PROJECT') !== -1) return null;

  try {
    var parts = base64Data.split(',');
    var byteString = atob(parts[1]);
    var mimeString = parts[0].split(':')[1].split(';')[0];
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    var blob = new Blob([ab], { type: mimeString });
    var fileName = Date.now() + '.jpg';
    var filePath = state.device_uuid + '/' + fileName;

    // Upload to PRIVATE bucket "reports"
    var uploadUrl = SUPABASE_URL + '/storage/v1/object/reports/' + filePath;
    console.log('[PurpleFix] Uploading to:', uploadUrl, 'Size:', blob.size, 'bytes');

    var res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': mimeString,
        'x-upsert': 'true'
      },
      body: blob
    });

    if (!res.ok) {
      var errBody = await res.text();
      console.error('[PurpleFix] Upload failed:', res.status, errBody);
      throw new Error('Upload failed: ' + res.status);
    }

    console.log('[PurpleFix] Upload success:', filePath);
    return filePath;
  } catch (e) {
    console.warn('[PurpleFix] Supabase upload error:', e.message);
    return null;
  }
}

// Get a signed URL for a private storage object (valid for 1 hour)
async function getSignedUrl(storagePath) {
  if (!storagePath || !SUPABASE_URL || SUPABASE_URL.indexOf('YOUR_PROJECT') !== -1) return null;
  try {
    var res = await fetch(SUPABASE_URL + '/storage/v1/object/sign/' + storagePath, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiresIn: 3600 })
    });
    if (!res.ok) return null;
    var data = await res.json();
    return SUPABASE_URL + '/storage/v1' + data.signedURL;
  } catch (e) {
    return null;
  }
}

async function supabaseInsert(data) {
  if (!SUPABASE_URL || SUPABASE_URL.indexOf('YOUR_PROJECT') !== -1) return null;

  try {
    console.log('[PurpleFix] Inserting issue:', JSON.stringify(data).substring(0, 200));
    var res = await fetch(SUPABASE_URL + '/rest/v1/issues', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      var errBody = await res.text();
      console.error('[PurpleFix] Insert failed:', res.status, errBody);
      throw new Error('Insert failed: ' + res.status);
    }
    var result = await res.json();
    console.log('[PurpleFix] Insert success:', result);
    return result;
  } catch (e) {
    console.warn('[PurpleFix] Supabase insert error:', e.message);
    return null;
  }
}

// ══════════════════════════════════════════
//  PUBLIC API (called from HTML onclick)
// ══════════════════════════════════════════
window.App = {
  start,
  goTo,
  openCamera,
  capturePhoto,
  handleFileUpload,
  retakePhoto,
  confirmPhoto,
  confirmLocation,
  showFormInput,
  updateSubmitBtn,
  startVoice,
  stopVoice,
  submitReport,
  jumpToStep
};
