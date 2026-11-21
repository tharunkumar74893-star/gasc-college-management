/**
 * GASC College Management System - Face Attendance Module
 * File path : assets/face-attendance.js
 * Tech      : HTML5, Vanilla JS (ES6+), Supabase JS v2, face-api.js (v0.22.2)
 * Threshold : faceapi.euclideanDistance(liveDescriptor, storedDescriptor) < 0.55
 */

const FACE_ATTENDANCE_CONFIG = {
  MODEL_URL: './models',
  MATCH_THRESHOLD: 0.55,
  MIN_CONFIDENCE: 0.65,
  ENROLL_SAMPLES: 3,
  SAMPLE_DELAY_MS: 250,
  PENDING_DESCRIPTOR_KEY: 'gasc_pending_face_descriptor'
};

let isModelsLoaded = false;

/**
 * Load face-api.js v0.22.2 weights once from MODEL_URL
 */
export async function loadFaceModels(modelUrl = FACE_ATTENDANCE_CONFIG.MODEL_URL) {
  if (isModelsLoaded) return true;

  if (!window.faceapi) {
    throw new Error('face-api.js (v0.22.2) is not loaded. Include the v0.22.2 script before running face attendance.');
  }

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
    faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
    faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
  ]);

  isModelsLoaded = true;
  return true;
}

/**
 * Start user webcam stream on a <video> element
 */
export async function startCameraStream(videoElement) {
  if (!videoElement) {
    throw new Error('Video element not found.');
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera access is not supported in this browser or context (use HTTPS / localhost).');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: 'user'
    },
    audio: false
  });

  videoElement.srcObject = stream;

  await new Promise((resolve, reject) => {
    videoElement.onloadedmetadata = async () => {
      try {
        await videoElement.play();
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    videoElement.onerror = () => reject(new Error('Failed to load webcam stream.'));
  });

  return stream;
}

/**
 * Stop webcam tracks cleanly
 */
export function stopCameraStream(videoElement) {
  if (videoElement && videoElement.srcObject) {
    const tracks = videoElement.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
    videoElement.srcObject = null;
  }
}

/**
 * Detect a single face from <video> and return its 128-dimension Float32Array descriptor
 */
export async function extractSingleFaceDescriptor(videoElement) {
  await loadFaceModels();

  const detectorOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: FACE_ATTENDANCE_CONFIG.MIN_CONFIDENCE
  });

  const detections = await faceapi
    .detectAllFaces(videoElement, detectorOptions)
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (!detections || detections.length === 0) {
    throw new Error('No face detected. Ensure proper lighting and look straight at the camera.');
  }

  if (detections.length > 1) {
    throw new Error('Multiple faces detected. Only one student should be in front of the camera.');
  }

  return detections[0].descriptor; // Float32Array(128)
}

/**
 * Average multiple 128D descriptors into a clean 128-number array for PostgreSQL JSONB
 */
function averageDescriptors(descriptors) {
  const dims = 128;
  const sum = new Array(dims).fill(0);

  for (const desc of descriptors) {
    for (let i = 0; i < dims; i++) {
      sum[i] += Number(desc[i]);
    }
  }

  return sum.map((val) => Number((val / descriptors.length).toFixed(8)));
}

/**
 * Capture face during Student Registration and save 128D JSONB descriptor to `profiles`
 * (If session is not active yet, stores temporarily in sessionStorage for post-login sync)
 */
export async function enrollStudentFace({ supabase, videoElement, profileId, onProgress }) {
  const samples = [];

  for (let i = 0; i < FACE_ATTENDANCE_CONFIG.ENROLL_SAMPLES; i++) {
    if (typeof onProgress === 'function') {
      onProgress(`Capturing face scan ${i + 1} of ${FACE_ATTENDANCE_CONFIG.ENROLL_SAMPLES}...`);
    }
    const descriptor = await extractSingleFaceDescriptor(videoElement);
    samples.push(descriptor);

    if (i < FACE_ATTENDANCE_CONFIG.ENROLL_SAMPLES - 1) {
      await new Promise((resolve) => setTimeout(resolve, FACE_ATTENDANCE_CONFIG.SAMPLE_DELAY_MS));
    }
  }

  const descriptorArray = averageDescriptors(samples);

  if (!profileId || !supabase) {
    sessionStorage.setItem(
      FACE_ATTENDANCE_CONFIG.PENDING_DESCRIPTOR_KEY,
      JSON.stringify(descriptorArray)
    );
    return {
      success: true,
      pendingSync: true,
      descriptor: descriptorArray,
      message: 'Face captured! It will be linked to your profile upon login/registration.'
    };
  }

  // Ensure student row exists in `students` table
  const { error: rpcErr } = await supabase.rpc('get_or_create_student_id', {
    p_profile_id: profileId
  });
  if (rpcErr) {
    throw new Error(`Student record setup failed: ${rpcErr.message}`);
  }

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      face_descriptor: descriptorArray,
      face_verified: true,
      face_enrolled_at: new Date().toISOString()
    })
    .eq('id', profileId);

  if (updateErr) {
    throw new Error(`Failed to save face descriptor in profile: ${updateErr.message}`);
  }

  sessionStorage.removeItem(FACE_ATTENDANCE_CONFIG.PENDING_DESCRIPTOR_KEY);

  return {
    success: true,
    pendingSync: false,
    descriptor: descriptorArray,
    message: 'Face biometric registered and saved to profile successfully.'
  };
}

/**
 * Verify live camera face against stored `profiles.face_descriptor` (JSONB)
 * using faceapi.euclideanDistance() with strict threshold < 0.55.
 * If matched, marks attendance as PRESENT in `attendance` table.
 */
export async function verifyAndMarkAttendance({ supabase, videoElement, profileId }) {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }
  if (!profileId) {
    throw new Error('Logged-in student profile ID is missing.');
  }

  // 1. Fetch stored 128D face_descriptor from `profiles`
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, name, roll_number, face_descriptor')
    .eq('id', profileId)
    .single();

  if (profileErr || !profile) {
    throw new Error('Unable to load student profile for face verification.');
  }

  if (!Array.isArray(profile.face_descriptor) || profile.face_descriptor.length !== 128) {
    throw new Error('No 128D face descriptor found in your profile. Please enroll your face first.');
  }

  // 2. Capture live 128D descriptor from webcam
  const liveDescriptor = await extractSingleFaceDescriptor(videoElement);
  const storedDescriptor = new Float32Array(profile.face_descriptor);

  // 3. Calculate Euclidean distance (threshold < 0.55)
  const rawDistance = faceapi.euclideanDistance(liveDescriptor, storedDescriptor);
  const distance = Number(rawDistance.toFixed(4));

  if (distance >= FACE_ATTENDANCE_CONFIG.MATCH_THRESHOLD) {
    return {
      matched: false,
      alreadyMarked: false,
      distance,
      threshold: FACE_ATTENDANCE_CONFIG.MATCH_THRESHOLD,
      message: `Face mismatch (Distance: ${distance}, required < ${FACE_ATTENDANCE_CONFIG.MATCH_THRESHOLD}). Please retry.`
    };
  }

  // 4. Resolve bigint student_id from `students` table
  const { data: studentId, error: studentErr } = await supabase.rpc('get_or_create_student_id', {
    p_profile_id: profileId
  });

  if (studentErr || !studentId) {
    throw new Error(`Unable to find student record: ${studentErr?.message || 'Unknown error'}`);
  }

  // 5. Check existing attendance for today
  const todayDate = new Date().toISOString().split('T')[0];

  const { data: existingRecord, error: selectErr } = await supabase
    .from('attendance')
    .select('id, status, attendance_time')
    .eq('student_id', studentId)
    .eq('attendance_date', todayDate)
    .maybeSingle();

  if (selectErr) {
    throw new Error(`Failed to check today's attendance: ${selectErr.message}`);
  }

  if (existingRecord && existingRecord.status === 'PRESENT') {
    return {
      matched: true,
      alreadyMarked: true,
      distance,
      status: existingRecord.status,
      record: existingRecord,
      message: `Face matched (Distance: ${distance}). Attendance already marked as PRESENT for today.`
    };
  }

  // 6. Insert / Upsert PRESENT record into `attendance` table
  const nowIso = new Date().toISOString();

  const { data: savedRecord, error: upsertErr } = await supabase
    .from('attendance')
    .upsert(
      {
        student_id: studentId,
        attendance_date: todayDate,
        attendance_time: nowIso,
        status: 'PRESENT',
        verification_status: 'FACE_VERIFIED',
        match_distance: distance
      },
      { onConflict: 'student_id,attendance_date' }
    )
    .select()
    .single();

  if (upsertErr) {
    throw new Error(`Face matched, but failed to record attendance: ${upsertErr.message}`);
  }

  return {
    matched: true,
    alreadyMarked: false,
    distance,
    status: 'PRESENT',
    record: savedRecord,
    message: `Face verified (Distance: ${distance}). Attendance marked as PRESENT!`
  };
}
