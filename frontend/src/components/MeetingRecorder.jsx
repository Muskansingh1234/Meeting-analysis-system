
import { useRef, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

export default function MeetingRecorder({ onMeetingSaved }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const meetingIdRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  function stopTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function startMeeting() {
    if (!title.trim()) {
      setMessage("Please enter a meeting title.");
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMessage(
        "Recording is not supported in this browser. Try a recent version of Chrome or Edge."
      );
      return;
    }

    try {
      setMessage("Requesting microphone permission...");
      setTranscript("");

      // Ask for microphone access before creating a database record.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      setMessage("Creating meeting...");

      const meetingResponse = await fetch(`${API_URL}/meetings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          ...(description.trim()
            ? { description: description.trim() }
            : {}),
        }),
      });

      const meetingResult = await meetingResponse
        .json()
        .catch(() => ({}));

      if (!meetingResponse.ok) {
        throw new Error(
          meetingResult.detail || "Could not create the meeting."
        );
      }

      meetingIdRef.current = meetingResult.id;

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];

      const mimeType = supportedTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setMessage("A recording error occurred. Please try again.");
      };

      recorder.onstop = async () => {
        stopTimer();
        setProcessing(true);
        setMessage("Uploading audio and generating transcript...");

        try {
          const actualType = recorder.mimeType || "audio/webm";

          const extension = actualType.includes("mp4")
            ? "mp4"
            : actualType.includes("ogg")
              ? "ogg"
              : actualType.includes("mpeg")
                ? "mp3"
                : "webm";

          const audioBlob = new Blob(chunksRef.current, {
            type: actualType,
          });

          if (audioBlob.size === 0) {
            throw new Error("The recording is empty.");
          }

          const formData = new FormData();

          formData.append(
            "file",
            audioBlob,
            `meeting-recording.${extension}`
          );

          const response = await fetch(
            `${API_URL}/meetings/${meetingIdRef.current}/transcribe`,
            {
              method: "POST",
              body: formData,
            }
          );

          const result = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              result.detail ||
                `Audio upload failed (HTTP ${response.status}).`
            );
          }

          setTranscript(result.transcript || "");
          setMessage(
            result.transcript
              ? "Recording saved and transcription completed."
              : "Recording processed, but no speech was detected."
          );

          if (onMeetingSaved) {
            onMeetingSaved(result);
          }
        } catch (error) {
          setMessage(
            `Transcription failed: ${error.message} Your meeting record may still be saved.`
          );
        } finally {
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          recorderRef.current = null;
          meetingIdRef.current = null;
          chunksRef.current = [];
          setRecording(false);
          setProcessing(false);
        }
      };

      recorder.start();
      startTimeRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      setMessage(`Recording meeting #${meetingResult.id}. Speak into your microphone.`);

      stopTimer();

      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsed(
            Math.floor((Date.now() - startTimeRef.current) / 1000)
          );
        }
      }, 1000);
    } catch (error) {
      stopTimer();

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      setRecording(false);
      setProcessing(false);

      setMessage(
        error.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access and try again."
          : `Could not start recording: ${error.message}`
      );
    }
  }

  function stopMeeting() {
    stopTimer();

    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    setRecording(false);
  }

  return (
    <section
      className="panel"
      style={{
        maxWidth: 760,
        margin: "24px 0",
        padding: 24,
      }}
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">LIVE AUDIO</p>
          <h2>Meeting Recorder</h2>
          <p>
            Record microphone audio and save a transcript to your meeting.
          </p>
        </div>

        <span
          className="status-badge"
          style={{
            color: recording ? "#b91c1c" : undefined,
          }}
        >
          <span className="status-dot" />
          {recording
            ? "Recording"
            : processing
              ? "Processing"
              : "Ready"}
        </span>
      </div>

      <form
        className="meeting-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!recording && !processing) {
            startMeeting();
          }
        }}
      >
        <label htmlFor="recorder-title">Meeting title *</label>

        <input
          id="recorder-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Final Year Project Review"
          maxLength={200}
          required
          disabled={recording || processing}
        />

        <label htmlFor="recorder-description">
          Description (optional)
        </label>

        <textarea
          id="recorder-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What is this meeting about?"
          rows={2}
          disabled={recording || processing}
        />

        {recording && (
          <div
            style={{
              padding: 18,
              borderRadius: 10,
              background: "#fff1f2",
              color: "#9f1239",
              margin: "12px 0",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28 }}>●</div>
            <strong>Recording in progress</strong>
            <p style={{ fontSize: 24, margin: "8px 0" }}>
              {formatDuration(elapsed)}
            </p>
            <p>Keep this page open while recording.</p>
          </div>
        )}

        <div
          className="form-actions"
          style={{ justifyContent: "flex-start", marginTop: 16 }}
        >
          {!recording ? (
            <button
              type="submit"
              className="button primary-button"
              disabled={processing}
            >
              {processing ? "Processing audio..." : "● Start Recording"}
            </button>
          ) : (
            <button
              type="button"
              className="button primary-button"
              onClick={stopMeeting}
              style={{ background: "#b91c1c" }}
            >
              ■ Stop & Transcribe
            </button>
          )}
        </div>
      </form>

      {message && (
        <div className="notice" role="status" style={{ marginTop: 16 }}>
          {message}
        </div>
      )}

      {transcript && (
        <div style={{ marginTop: 24 }}>
          <h3>Generated Transcript</h3>
          <div
            style={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              padding: 16,
              borderRadius: 8,
              background: "#f3f4f6",
              lineHeight: 1.6,
            }}
          >
            {transcript}
          </div>
        </div>
      )}

      <p className="form-hint" style={{ marginTop: 16 }}>
        This records microphone audio only. Other meeting participants
        may not be captured unless their audio reaches your microphone.
        Tell participants that recording is taking place and obtain
        appropriate consent.
      </p>
    </section>
  );
}
