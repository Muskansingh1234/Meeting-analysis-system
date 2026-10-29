
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    meeting_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(30), default="scheduled")
    transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
