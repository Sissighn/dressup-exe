from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FOLDER = os.path.join(BASE_DIR, "../database")
os.makedirs(DB_FOLDER, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(DB_FOLDER, 'closet.db')}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Das Datenbank-Modell
class ClothingItem(Base):
    __tablename__ = "clothes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String)  # 'TOPS', 'BOTTOMS', 'SHOES', 'BAGS'
    image_path = Column(String)


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
