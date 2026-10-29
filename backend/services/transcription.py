
from functools import lru_cache

from faster_whisper import WhisperModel


@lru_cache(maxsize=1)
def get_model():
    """
    Load the Whisper model once and reuse it for future transcriptions.
    Uses CPU mode for compatibility with most Windows computers.
    """
    return WhisperModel(
        "small",
        device="cpu",
        compute_type="int8",
    )


def transcribe_audio(file_path: str) -> str:
    """
    Transcribe an audio file and return the recognized speech as text.
    """
    model = get_model()

    segments, info = model.transcribe(
        file_path,
        beam_size=5,
        vad_filter=True,
    )

    transcript_parts = []

    for segment in segments:
        text = segment.text.strip()

        if text:
            transcript_parts.append(text)

    return " ".join(transcript_parts)
