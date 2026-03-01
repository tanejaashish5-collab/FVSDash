"""
Email Digest Service — weekly pipeline summary emails.

Transports (in priority order):
  1. SendGrid  — set SENDGRID_API_KEY
  2. SMTP      — set SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS
  3. Dev mode  — logs to console, no email sent

Weekly digest job is wired into APScheduler in publishing_scheduler.py.
Users opt in via Settings page (weeklyDigest: true in user_settings collection).
"""
import os
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

FROM_EMAIL = os.getenv("DIGEST_FROM_EMAIL", "digest@forgevoice.studio")
FROM_NAME  = os.getenv("DIGEST_FROM_NAME",  "ForgeVoice Studio")
APP_URL    = os.getenv("APP_URL", "https://app.forgevoice.studio")


# ──────────────────────────────────────────────────────────────────────────────
# HTML template
# ──────────────────────────────────────────────────────────────────────────────

def _build_html(stats: dict) -> str:
    pipeline      = stats.get("pipeline", {})
    published     = stats.get("published_this_week", 0)
    pending       = stats.get("pending_actions", 0)
    top_sub       = stats.get("top_submission", {})
    by_status     = pipeline.get("by_status", {})
    total         = pipeline.get("total", 0)
    date_str      = datetime.now(timezone.utc).strftime("%B %d, %Y")

    status_rows = "".join(
        f'<tr><td style="padding:6px 0;color:#9ca3af;font-size:13px;">{s}</td>'
        f'<td style="padding:6px 0;color:#fff;font-weight:700;font-size:13px;text-align:right;">{c}</td></tr>'
        for s, c in by_status.items()
    )
    top_line = (
        f'<p style="font-size:13px;color:#9ca3af;margin:0 0 20px;">🔥 Top this week: '
        f'<strong style="color:#fff;">{top_sub.get("title","")}</strong></p>'
        if top_sub else ""
    )

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0B1120;color:#e4e4e7;margin:0;padding:0;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 4px;">Weekly Pipeline Digest</h1>
  <p style="color:#71717a;font-size:13px;margin:0 0 28px;">{date_str}</p>

  <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
    <tr>
      <td width="32%" style="background:#1F2937;border-radius:10px;padding:16px;margin-right:8px;">
        <div style="font-size:28px;font-weight:800;color:#6366f1;">{published}</div>
        <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Published this week</div>
      </td>
      <td width="4%"></td>
      <td width="32%" style="background:#1F2937;border-radius:10px;padding:16px;">
        <div style="font-size:28px;font-weight:800;color:#6366f1;">{pending}</div>
        <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Pending actions</div>
      </td>
      <td width="4%"></td>
      <td width="32%" style="background:#1F2937;border-radius:10px;padding:16px;">
        <div style="font-size:28px;font-weight:800;color:#6366f1;">{total}</div>
        <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Total in pipeline</div>
      </td>
    </tr>
  </table>

  <div style="background:#1F2937;border-radius:10px;padding:20px;margin-bottom:28px;">
    <p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 12px;">Pipeline Breakdown</p>
    <table width="100%" cellspacing="0" cellpadding="0">
      {status_rows}
    </table>
  </div>

  {top_line}

  <a href="{APP_URL}/dashboard/submissions"
     style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
    View Pipeline →
  </a>

  <p style="color:#52525b;font-size:11px;margin-top:32px;">
    You're receiving this because weekly digests are enabled in your ForgeVoice Studio settings.
    <a href="{APP_URL}/dashboard/settings" style="color:#6366f1;">Manage preferences</a>
  </p>
</div>
</body></html>"""


# ──────────────────────────────────────────────────────────────────────────────
# Send helpers
# ──────────────────────────────────────────────────────────────────────────────

async def send_digest_email(to_email: str, client_id: str, stats: dict) -> bool:
    """Send a weekly digest email. Returns True on success."""
    html    = _build_html(stats)
    week    = datetime.now(timezone.utc).strftime("%b %d")
    subject = f"Your Weekly Pipeline Digest — {stats.get('published_this_week', 0)} published ({week})"

    sg_key = os.getenv("SENDGRID_API_KEY")
    if sg_key:
        return await _send_sendgrid(to_email, subject, html, sg_key)

    smtp_host = os.getenv("SMTP_HOST")
    if smtp_host:
        return await _send_smtp(to_email, subject, html)

    # Dev / no-config mode — log and succeed silently
    logger.info("[EMAIL DIGEST — dev] Would send to %s: %s", to_email, subject)
    return True


async def _send_sendgrid(to_email: str, subject: str, html: str, api_key: str) -> bool:
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": FROM_EMAIL, "name": FROM_NAME},
                    "subject": subject,
                    "content": [{"type": "text/html", "value": html}],
                },
                timeout=15,
            )
            res.raise_for_status()
            return True
    except Exception as e:
        logger.error("SendGrid error: %s", e)
        return False


async def _send_smtp(to_email: str, subject: str, html: str) -> bool:
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html, "html"))

        host     = os.getenv("SMTP_HOST", "")
        port     = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_pass = os.getenv("SMTP_PASS", "")

        with smtplib.SMTP(host, port) as server:
            server.ehlo()
            server.starttls()
            if smtp_user:
                server.login(smtp_user, smtp_pass)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        logger.error("SMTP error: %s", e)
        return False


# ──────────────────────────────────────────────────────────────────────────────
# APScheduler job — called weekly
# ──────────────────────────────────────────────────────────────────────────────

async def build_and_send_weekly_digests() -> None:
    """
    Fetch all opted-in users, compute their pipeline stats, and send digest emails.
    Called by APScheduler every Monday at 08:00 UTC.
    """
    try:
        from db.mongo import get_db
        db = get_db()

        users = await db.user_settings.find(
            {"weeklyDigest": True, "digestEmail": {"$exists": True, "$ne": ""}},
            {"_id": 0, "userId": 1, "clientId": 1, "digestEmail": 1},
        ).to_list(500)

        if not users:
            logger.info("Weekly digest: no opted-in users")
            return

        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

        for cfg in users:
            try:
                client_id = cfg.get("clientId")
                to_email  = cfg.get("digestEmail")
                if not client_id or not to_email:
                    continue

                subs = await db.submissions.find(
                    {"clientId": client_id, "status": {"$ne": "DELETED"}},
                    {"_id": 0, "status": 1, "title": 1, "updatedAt": 1},
                ).to_list(1000)

                by_status: dict[str, int] = {}
                published_this_week = 0
                pending_actions = 0
                top_sub = None

                for s in subs:
                    st = s.get("status", "INTAKE")
                    by_status[st] = by_status.get(st, 0) + 1
                    if st == "PUBLISHED":
                        if s.get("updatedAt", "") >= week_ago:
                            published_this_week += 1
                            if not top_sub:
                                top_sub = s
                    if st in ("INTAKE", "EDITING", "DESIGN"):
                        pending_actions += 1

                stats = {
                    "pipeline": {"total": len(subs), "by_status": by_status},
                    "published_this_week": published_this_week,
                    "pending_actions": pending_actions,
                    "top_submission": top_sub or {},
                }

                ok = await send_digest_email(to_email, client_id, stats)
                if ok:
                    logger.info("Weekly digest sent to %s", to_email)
            except Exception as e:
                logger.error("Digest failed for %s: %s", cfg.get("userId"), e)

    except Exception as e:
        logger.error("Weekly digest job error: %s", e)
