from abc import ABC, abstractmethod


class NotificationProvider(ABC):
    @abstractmethod
    def send_email(self, to: str, subject: str, body: str) -> bool: ...

    @abstractmethod
    def send_sms(self, to: str, message: str) -> bool: ...


class MockNotificationProvider(NotificationProvider):
    """Logs to stdout. Replace with Twilio/SendGrid by subclassing."""

    def send_email(self, to: str, subject: str, body: str) -> bool:
        print(f"[MOCK EMAIL] To={to} | Subject={subject}")
        print(f"             Body={body[:120]}")
        return True

    def send_sms(self, to: str, message: str) -> bool:
        print(f"[MOCK SMS] To={to} | {message[:120]}")
        return True
