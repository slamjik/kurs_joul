import factory
from django.contrib.auth import get_user_model

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    """Фабрика для создания тестовых пользователей."""

    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user_{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@misis.ru")
    first_name = factory.Faker("first_name", locale="ru_RU")
    last_name = factory.Faker("last_name", locale="ru_RU")
    role = "teacher"
    is_active = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Гарантирует корректное хеширование пароля при создании."""
        password = kwargs.pop("password", "TestPassword123!")
        user = super()._create(model_class, *args, **kwargs)
        user.set_password(password)
        user.raw_password = password
        user.save()
        return user
