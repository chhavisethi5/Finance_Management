from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Database connection configuration using pymysql driver
DATABASE_URL = "mysql+pymysql://root:abcd%401234@localhost:3306/finance_db"

# Create the SQLAlchemy engine with pool configurations for reliability
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Enable connection health checks on checkout
    pool_recycle=3600,        # Recycle connections after 1 hour to avoid timeouts
    echo=False                # Set to True if database query logging is needed
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
