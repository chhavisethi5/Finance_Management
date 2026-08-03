import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Database connection configuration. Use DATABASE_URL from the environment if set, otherwise fall back to a local SQLite database for development and testing.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./finance.db")

connect_args = {} if not DATABASE_URL.startswith("sqlite") else {"check_same_thread": False}

# Create the SQLAlchemy engine with pool configurations for reliability
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,       # Enable connection health checks on checkout
    pool_recycle=3600,        # Recycle connections after 1 hour to avoid timeouts
    echo=False,               # Set to True if database query logging is needed
)

# Create a local session class bound to our engine
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for declarative database models
Base = declarative_base()

# FastAPI dependency function to yield database sessions per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
