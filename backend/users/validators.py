from __future__ import annotations

import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class PasswordComplexityValidator:
    """
    Validates that a password meets complexity requirements:
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """

    SPECIAL_CHARACTERS = r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]"

    def validate(self, password: str, user: object = None) -> None:
        errors = []

        if not re.search(r"[A-Z]", password):
            errors.append(
                _("Password must contain at least one uppercase letter.")
            )

        if not re.search(r"[a-z]", password):
            errors.append(
                _("Password must contain at least one lowercase letter.")
            )

        if not re.search(r"\d", password):
            errors.append(
                _("Password must contain at least one digit.")
            )

        if not re.search(self.SPECIAL_CHARACTERS, password):
            errors.append(
                _("Password must contain at least one special character.")
            )

        if errors:
            raise ValidationError(errors)

    def get_help_text(self) -> str:
        return _(
            "Your password must contain at least one uppercase letter, "
            "one lowercase letter, one digit, and one special character."
        )
