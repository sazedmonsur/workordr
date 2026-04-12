"""
Notification event dispatcher.
Call notify() after key domain events.
Provider is swappable — swap MockNotificationProvider for Twilio/SendGrid later.
"""
import json
from sqlalchemy.orm import Session
from app.models import NotificationLog
from app.notifications.provider import MockNotificationProvider

_provider = MockNotificationProvider()

_TEMPLATES: dict[str, dict] = {
    "booking_created": {
        "subject": "Booking Received — WorkOrdr",
        "email": lambda d: (
            f"Hi {d.get('customer_name')},\n\n"
            f"We received your booking request for {d.get('service_name')}.\n"
            f"We will confirm your appointment shortly.\n\nThank you!"
        ),
        "sms": lambda d: f"WorkOrdr: Booking received for {d.get('service_name')}. We'll confirm soon.",
    },
    "booking_confirmed": {
        "subject": "Appointment Confirmed — WorkOrdr",
        "email": lambda d: (
            f"Hi {d.get('customer_name')},\n\n"
            f"Your appointment for {d.get('service_name')} is confirmed for {d.get('scheduled_at')}.\n\nSee you then!"
        ),
        "sms": lambda d: f"WorkOrdr: Confirmed for {d.get('service_name')} on {d.get('scheduled_at')}.",
    },
    "technician_assigned": {
        "subject": "Technician Assigned — WorkOrdr",
        "email": lambda d: (
            f"Hi {d.get('customer_name')},\n\n"
            f"{d.get('technician_name')} has been assigned to your job on {d.get('scheduled_at')}."
        ),
        "sms": lambda d: f"WorkOrdr: {d.get('technician_name')} assigned for {d.get('scheduled_at')}.",
    },
    "job_completed": {
        "subject": "Job Completed — WorkOrdr",
        "email": lambda d: (
            f"Hi {d.get('customer_name')},\n\n"
            f"Your job has been completed. Invoice #{d.get('invoice_id')} is ready.\n"
            f"Total due: ${d.get('total', '0.00')}"
        ),
        "sms": lambda d: f"WorkOrdr: Job done. Invoice ready. Total: ${d.get('total', '0.00')}.",
    },
    "invoice_generated": {
        "subject": "Invoice Ready — WorkOrdr",
        "email": lambda d: (
            f"Hi {d.get('customer_name')},\n\nYour invoice for ${d.get('total', '0.00')} is ready.\n"
            f"Pay online: {d.get('pay_url', '')}"
        ),
        "sms": lambda d: f"WorkOrdr: Invoice ${d.get('total', '0.00')} ready. {d.get('pay_url', '')}",
    },
    "payment_received": {
        "subject": "Payment Confirmed — WorkOrdr",
        "email": lambda d: (
            f"Hi {d.get('customer_name')},\n\nPayment of ${d.get('amount', '0.00')} received. Thank you!"
        ),
        "sms": lambda d: f"WorkOrdr: Payment of ${d.get('amount', '0.00')} confirmed. Thank you!",
    },
    "reminder_sent": {
        "subject": "Appointment Reminder — WorkOrdr",
        "email": lambda d: (
            f"Hi {d.get('customer_name')},\n\nReminder: your appointment for {d.get('service_name')} "
            f"is tomorrow at {d.get('scheduled_at')}."
        ),
        "sms": lambda d: f"WorkOrdr: Reminder — {d.get('service_name')} tomorrow at {d.get('scheduled_at')}.",
    },
}


def notify(
    db: Session,
    event_type: str,
    recipient_email: str | None = None,
    recipient_phone: str | None = None,
    data: dict | None = None,
) -> None:
    """Fire a notification event, log result in notification_logs."""
    if data is None:
        data = {}

    template = _TEMPLATES.get(event_type)
    payload_str = json.dumps(data)

    def _log_and_send(channel: str, recipient: str):
        log = NotificationLog(
            event_type=event_type,
            recipient_email=recipient if channel == "email" else None,
            recipient_phone=recipient if channel == "sms" else None,
            channel=channel,
            status="pending",
            payload=payload_str,
        )
        db.add(log)
        db.flush()
        try:
            if channel == "email":
                ok = _provider.send_email(
                    to=recipient,
                    subject=template["subject"] if template else event_type,
                    body=template["email"](data) if template else payload_str,
                )
            else:
                ok = _provider.send_sms(
                    to=recipient,
                    message=template["sms"](data) if template else payload_str,
                )
            log.status = "sent" if ok else "failed"
        except Exception as exc:
            log.status = "failed"
            log.error_message = str(exc)

    if recipient_email:
        _log_and_send("email", recipient_email)
    if recipient_phone:
        _log_and_send("sms", recipient_phone)

    db.commit()
