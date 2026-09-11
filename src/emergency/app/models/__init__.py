"""Import all models so SQLAlchemy registers them with Base.metadata."""

from app.models.user import User  # noqa: F401
from app.models.course import Category, Course, CourseSection, CourseLesson  # noqa: F401
from app.models.enrollment import Enrollment, LessonProgress  # noqa: F401
from app.models.article import Article  # noqa: F401
from app.models.dictionary import DictionaryTerm  # noqa: F401
from app.models.workshop import Workshop  # noqa: F401
from app.models.product import Product, Order, OrderItem  # noqa: F401
from app.models.notification import Notification  # noqa: F401
