import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models.user import User, Ward
from backend.app.core.security import get_password_hash, create_access_token
from backend.app.services.seeder import seed_database

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    # Seed basic demo records
    seed_database(session)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def get_auth_token_for(user: User) -> str:
    return create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})

@pytest.fixture
def admin_headers(db):
    admin = db.query(User).filter(User.role == "admin").first()
    token = get_auth_token_for(admin)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def supervisor_headers(db):
    supervisor = db.query(User).filter(User.role == "supervisor").first()
    token = get_auth_token_for(supervisor)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def worker_headers(db):
    worker = db.query(User).filter(User.role == "worker").first()
    token = get_auth_token_for(worker)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def citizen_headers(db):
    citizen = db.query(User).filter(User.role == "citizen").first()
    token = get_auth_token_for(citizen)
    return {"Authorization": f"Bearer {token}"}
