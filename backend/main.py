
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from database import Base, engine, get_db
from models import Meeting
from schemas import MeetingCreate, MeetingUpdate, MeetingResponse
from services.transcription import transcribe_audio


UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_AUDIO_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".m4a",
    ".flac",
    ".ogg",
    ".webm",
    ".mp4",
    ".mpeg",
    ".mpga",
}

MAX_AUDIO_SIZE = 100 * 1024 * 1024  # 100 MB


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Intelligent Meeting Analysis System",
    description="API for meeting management and AI analysis",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Meeting Intelligence System API is running!"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post(
    "/meetings",
    response_model=MeetingResponse,
    status_code=201,
)
def create_meeting(
    meeting_data: MeetingCreate,
    db: Session = Depends(get_db),
):
    meeting = Meeting(**meeting_data.model_dump(exclude_unset=True))

    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    return meeting


@app.get("/meetings", response_model=list[MeetingResponse])
def get_meetings(db: Session = Depends(get_db)):
    return db.query(Meeting).order_by(Meeting.id.desc()).all()


@app.get("/meetings/{meeting_id}", response_model=MeetingResponse)
def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id
    ).first()

    if meeting is None:
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )

    return meeting


@app.patch(
    "/meetings/{meeting_id}",
    response_model=MeetingResponse,
)
def update_meeting(
    meeting_id: int,
    meeting_data: MeetingUpdate,
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id
    ).first()

    if meeting is None:
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )

    changes = meeting_data.model_dump(exclude_unset=True)

    for field, value in changes.items():
        setattr(meeting, field, value)

    db.commit()
    db.refresh(meeting)

    return meeting


@app.delete("/meetings/{meeting_id}", status_code=204)
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id
    ).first()

    if meeting is None:
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )

    db.delete(meeting)
    db.commit()

    return Response(status_code=204)


@app.post(
    "/meetings/{meeting_id}/transcribe",
    response_model=MeetingResponse,
)
async def upload_and_transcribe(
    meeting_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id
    ).first()

    if meeting is None:
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )

    extension = Path(file.filename or "").suffix.lower()

    if extension not in ALLOWED_AUDIO_EXTENSIONS:
        await file.close()
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio format.",
        )

    saved_path = UPLOAD_DIR / f"{uuid.uuid4().hex}{extension}"

    try:
        size = 0

        with saved_path.open("wb") as destination:
            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                size += len(chunk)

                if size > MAX_AUDIO_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Audio file exceeds the 100 MB limit.",
                    )

                destination.write(chunk)

        if size == 0:
            raise HTTPException(
                status_code=400,
                detail="The uploaded audio file is empty.",
            )

        transcript = await run_in_threadpool(
            transcribe_audio,
            str(saved_path),
        )

        meeting.transcript = transcript
        meeting.status = "transcribed"

        db.commit()
        db.refresh(meeting)

        return meeting

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Transcription failed. Check the backend terminal "
                "for details and verify that the audio file is valid."
            ),
        ) from exc

    finally:
        await file.close()

        # Keep the uploaded audio in backend/uploads for now.
        # This lets you retain the original recording for your project.
