"""
Unit tests for database models
"""
import pytest
from datetime import datetime, date
from app.models.user import User
from app.models.tank import Tank
from app.models.note import Note
from app.models.maintenance import MaintenanceReminder
from app.models.livestock import Livestock
from app.core.security import get_password_hash


@pytest.mark.unit
class TestUserModel:
    """Test User model"""

    def test_create_user(self, db_session, fake):
        """Test creating a user"""
        user = User(
            email=fake.email(),
            username=fake.user_name(),
            hashed_password=get_password_hash("password123")
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.id is not None
        assert user.email is not None
        assert user.username is not None
        assert user.hashed_password is not None
        assert user.created_at is not None
        assert isinstance(user.created_at, datetime)

    def test_user_unique_email(self, db_session, fake):
        """Test that email must be unique"""
        email = fake.email()

        user1 = User(
            email=email,
            username=fake.user_name(),
            hashed_password=get_password_hash("password123")
        )
        db_session.add(user1)
        db_session.commit()

        # Try to create another user with same email
        user2 = User(
            email=email,
            username=fake.user_name(),
            hashed_password=get_password_hash("password456")
        )
        db_session.add(user2)

        with pytest.raises(Exception):  # Should raise IntegrityError
            db_session.commit()


@pytest.mark.unit
class TestTankModel:
    """Test Tank model"""

    def test_create_tank(self, db_session, test_user, fake):
        """Test creating a tank"""
        tank = Tank(
            user_id=test_user.id,
            name=fake.word(),
            display_volume_liters=100.0,
            setup_date=date.today()
        )
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        assert tank.id is not None
        assert tank.user_id == test_user.id
        assert tank.name is not None
        assert tank.display_volume_liters == 100.0
        assert tank.created_at is not None

    def test_tank_user_relationship(self, db_session, test_user, fake):
        """Test tank belongs to user"""
        tank = Tank(
            user_id=test_user.id,
            name=fake.word(),
            display_volume_liters=50.0
        )
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        # Check relationship
        assert tank.owner.id == test_user.id
        assert tank in test_user.tanks


@pytest.mark.unit
class TestNoteModel:
    """Test Note model"""

    def test_create_note(self, db_session, test_user, fake):
        """Test creating a note"""
        tank = Tank(
            user_id=test_user.id,
            name=fake.word(),
            display_volume_liters=50.0
        )
        db_session.add(tank)
        db_session.commit()

        note = Note(
            user_id=test_user.id,
            tank_id=tank.id,
            content=fake.text()
        )
        db_session.add(note)
        db_session.commit()
        db_session.refresh(note)

        assert note.id is not None
        assert note.user_id == test_user.id
        assert note.tank_id == tank.id
        assert note.content is not None
        assert note.created_at is not None


@pytest.mark.unit
class TestMaintenanceReminderModel:
    """Test MaintenanceReminder model"""

    def test_create_reminder(self, db_session, test_user, fake):
        """Test creating a maintenance reminder"""
        tank = Tank(
            user_id=test_user.id,
            name=fake.word(),
            display_volume_liters=50.0
        )
        db_session.add(tank)
        db_session.commit()

        reminder = MaintenanceReminder(
            user_id=test_user.id,
            tank_id=tank.id,
            title="Water Change",
            reminder_type="water_change",
            frequency_days=7,
            next_due=datetime.utcnow()
        )
        db_session.add(reminder)
        db_session.commit()
        db_session.refresh(reminder)

        assert reminder.id is not None
        assert reminder.title == "Water Change"
        assert reminder.frequency_days == 7
        assert reminder.is_active is True


@pytest.mark.unit
class TestLivestockModel:
    """Test Livestock model"""

    def test_create_livestock(self, db_session, test_user, fake):
        """Test creating livestock"""
        tank = Tank(
            user_id=test_user.id,
            name=fake.word(),
            display_volume_liters=50.0
        )
        db_session.add(tank)
        db_session.commit()

        livestock = Livestock(
            user_id=test_user.id,
            tank_id=tank.id,
            species_name="Amphiprion ocellaris",
            common_name="Clownfish",
            type="fish",
            added_date=date.today()
        )
        db_session.add(livestock)
        db_session.commit()
        db_session.refresh(livestock)

        assert livestock.id is not None
        assert livestock.species_name == "Amphiprion ocellaris"
        assert livestock.type == "fish"
