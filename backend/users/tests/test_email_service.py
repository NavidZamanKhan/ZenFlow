from unittest.mock import MagicMock, patch

from django.core.mail import BadHeaderError
from django.test import TestCase

from users.services.email_service import (
    BrevoEmailService,
    ResendEmailService,
    SMTPEmailService,
    _reminder_plain_text,
    _render_reminder_email,
)


class ReminderEmailSecurityTests(TestCase):
    """Regression tests for reminder email rendering and subject-line security."""

    def test_reminder_title_html_is_escaped(self):
        """Verify that HTML tags in the reminder title are escaped."""
        raw_title = '<script>alert("xss")</script> & <b>test</b>'
        html = _render_reminder_email(
            full_name="Alice",
            title=raw_title,
            message="Check report",
            due_label="Tomorrow at 9:00 AM",
        )

        self.assertNotIn("<script>", html)
        self.assertNotIn("<b>test</b>", html)
        self.assertIn("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;", html)
        self.assertIn("&amp;", html)
        self.assertIn("&lt;b&gt;test&lt;/b&gt;", html)

    def test_reminder_message_html_is_escaped(self):
        """Verify that HTML tags and attributes in the reminder message are escaped."""
        raw_message = '<img src=x onerror="alert(1)"> Click <a href="https://phish.com">here</a>!'
        html = _render_reminder_email(
            full_name="Alice",
            title="Security Review",
            message=raw_message,
            due_label="Tomorrow at 9:00 AM",
        )

        self.assertNotIn("<img", html)
        self.assertNotIn("<a href=", html)
        self.assertIn("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;", html)
        self.assertIn("&lt;a href=&quot;https://phish.com&quot;&gt;here&lt;/a&gt;!", html)

    def test_recipient_name_html_is_escaped(self):
        """Verify that HTML tags in the recipient name are escaped."""
        raw_name = '<svg onload="alert(1)">Admin'
        html = _render_reminder_email(
            full_name=raw_name,
            title="Clean Title",
            message="Clean Message",
            due_label="Tomorrow",
        )

        self.assertNotIn("<svg", html)
        self.assertIn("&lt;svg onload=&quot;alert(1)&quot;&gt;Admin", html)

    def test_multiline_message_preserves_line_breaks(self):
        """Verify that newlines in multiline messages are converted to <br> for email client rendering."""
        message = "Paragraph 1\nParagraph 2\r\nParagraph 3"
        html = _render_reminder_email(
            full_name="Alice",
            title="Meeting",
            message=message,
            due_label="Tomorrow",
        )

        self.assertIn("Paragraph 1<br>Paragraph 2<br>Paragraph 3", html)
        self.assertIn("white-space: pre-wrap", html)

    def test_due_label_html_is_escaped(self):
        """Verify that HTML tags in the due_label are also escaped."""
        raw_due = '<span style="color:red">Urgent</span>'
        html = _render_reminder_email(
            full_name="Alice",
            title="Task",
            message="Do it",
            due_label=raw_due,
        )

        self.assertNotIn('<span style="color:red">', html)
        self.assertIn("&lt;span style=&quot;color:red&quot;&gt;Urgent&lt;/span&gt;", html)

    def test_empty_message_renders_without_message_paragraph(self):
        """Verify that omitting message renders cleanly without empty message markup."""
        html = _render_reminder_email(
            full_name="Alice",
            title="No Message Reminder",
            message="",
            due_label="Tomorrow",
        )

        self.assertIn("No Message Reminder", html)
        self.assertNotIn('font-size: 14px; line-height: 1.6; color: #e2e8f0;', html)

    @patch("users.services.email_service.send_mail")
    def test_smtp_normalizes_title_and_prevents_header_injection(self, mock_send_mail):
        """Verify that SMTP adapter strips CR/LF from subject line and calls send_mail safely."""
        service = SMTPEmailService()
        title_with_newlines = "Quarterly Review\r\nBcc: evil@attacker.com\nDetails"

        service.send_reminder_email(
            to_email="user@example.com",
            full_name="Alice User",
            title=title_with_newlines,
            message="Please prepare slides.",
            due_label="Monday 10:00 AM",
        )

        mock_send_mail.assert_called_once()
        _, kwargs = mock_send_mail.call_args
        subject = kwargs["subject"]

        self.assertEqual(
            subject, "ZenFlow reminder: Quarterly Review Bcc: evil@attacker.com Details"
        )
        self.assertNotIn("\r", subject)
        self.assertNotIn("\n", subject)
        self.assertEqual(kwargs["recipient_list"], ["user@example.com"])
        self.assertIn("Quarterly Review", kwargs["message"])

    def test_resend_normalizes_title_and_sends_safe_payload(self):
        """Verify that Resend adapter normalizes title in subject and provides safe HTML/plain bodies."""
        service = ResendEmailService(api_key="resend-test-key")
        mock_response = MagicMock(status_code=200, text="ok")

        with patch.object(service._requests, "post", return_value=mock_response) as mock_post:
            title_with_newlines = "Sprint Planning\r\n\tRoom 402"
            service.send_reminder_email(
                to_email="user@example.com",
                full_name="Bob User <script>",
                title=title_with_newlines,
                message="Bring <b>laptop</b> & notebook.\nBring charger.",
                due_label="Friday 2:00 PM",
            )

            mock_post.assert_called_once()
            _, kwargs = mock_post.call_args
            payload = kwargs["json"]

            # Subject is normalized
            self.assertEqual(payload["subject"], "ZenFlow reminder: Sprint Planning Room 402")
            self.assertNotIn("\r", payload["subject"])
            self.assertNotIn("\n", payload["subject"])

            # HTML is escaped and formatted
            html_body = payload["html"]
            self.assertNotIn("<script>", html_body)
            self.assertIn("&lt;script&gt;", html_body)
            self.assertNotIn("<b>laptop</b>", html_body)
            self.assertIn("&lt;b&gt;laptop&lt;/b&gt;", html_body)
            self.assertIn("<br>Bring charger.", html_body)

            # Plain text preserves readable unescaped content
            text_body = payload["text"]
            self.assertIn("Bring <b>laptop</b> & notebook.", text_body)
            self.assertIn("Sprint Planning\r\n\tRoom 402", text_body)

    def test_brevo_normalizes_title_and_sends_safe_payload(self):
        """Verify that Brevo adapter normalizes title in subject and provides safe HTML/plain bodies."""
        service = BrevoEmailService(api_key="brevo-test-key")
        mock_response = MagicMock(status_code=200, text="ok")

        with patch.object(service._requests, "post", return_value=mock_response) as mock_post:
            title_with_newlines = "Tax Filing\n\nDeadline"
            service.send_reminder_email(
                to_email="user@example.com",
                full_name="Carol User",
                title=title_with_newlines,
                message="Submit <form> before midnight.",
                due_label="April 15",
            )

            mock_post.assert_called_once()
            _, kwargs = mock_post.call_args
            payload = kwargs["json"]

            # Subject is normalized
            self.assertEqual(payload["subject"], "ZenFlow reminder: Tax Filing Deadline")
            self.assertNotIn("\r", payload["subject"])
            self.assertNotIn("\n", payload["subject"])

            # HTML content is escaped
            html_content = payload["htmlContent"]
            self.assertNotIn("<form>", html_content)
            self.assertIn("&lt;form&gt;", html_content)

            # Plain text content
            text_content = payload["textContent"]
            self.assertIn("Submit <form> before midnight.", text_content)

    def test_plain_text_helper_preserves_readable_text_without_html_encoding(self):
        """Verify that plain-text body helper formats cleanly without HTML entities."""
        plain = _reminder_plain_text(
            full_name="Alice & Bob",
            title="Review <PR>",
            message="Check line 1\nCheck line 2",
            due_label="Today",
        )
        self.assertIn("Hi Alice & Bob,", plain)
        self.assertIn("Reminder: Review <PR>", plain)
        self.assertIn("Check line 1\nCheck line 2", plain)
        self.assertNotIn("&amp;", plain)
        self.assertNotIn("&lt;", plain)
