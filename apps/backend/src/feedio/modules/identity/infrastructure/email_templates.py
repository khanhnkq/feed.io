from html import escape

EMAIL_HEADER = (
    "<!DOCTYPE html>\n"
    '<html lang="en">\n'
    "<head>\n"
    '  <meta charset="utf-8">\n'
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    "  <title>{heading}</title>\n"
    "</head>\n"
    '<body style="margin: 0; padding: 0; background-color: #f7f8f1; '
    "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; "
    'color: #141512;">\n'
    '  <table width="100%" cellpadding="0" cellspacing="0" border="0" '
    'style="background-color: #f7f8f1; padding: 40px 16px;">\n'
    "    <tr>\n"
    '      <td align="center">\n'
    '        <table width="100%" cellpadding="0" cellspacing="0" border="0" '
    'style="max-width: 580px; background-color: #ffffff; border-radius: 14px; '
    'border: 1px solid #e3e5db; overflow: hidden; box-shadow: 0 8px 30px rgba(20,21,18,0.04);">\n'
    "          <tr>\n"
    '            <td style="background-color: #141512; padding: 28px 36px;">\n'
    '              <table cellpadding="0" cellspacing="0" border="0">\n'
    "                <tr>\n"
    '                  <td style="background-color: #d8ff43; width: 28px; height: 28px; '
    "border-radius: 7px 3px 7px 3px; text-align: center; vertical-align: middle; "
    "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; "
    'font-size: 15px; font-weight: 900; color: #141512; line-height: 28px;">\n'
    "                    F\n"
    "                  </td>\n"
    '                  <td style="padding-left: 12px; font-family: -apple-system, '
    "BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 19px; "
    'font-weight: 800; color: #ffffff; letter-spacing: -0.6px;">\n'
    "                    feed.io\n"
    "                  </td>\n"
    "                </tr>\n"
    "              </table>\n"
    "            </td>\n"
    "          </tr>\n"
    "          <tr>\n"
    '            <td style="padding: 36px 36px 28px 36px;">\n'
    "              <div style=\"font-family: 'SFMono-Regular', Consolas, monospace; "
    "font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; "
    'color: #777b70; margin-bottom: 12px;">\n'
    "                {step_badge}\n"
    "              </div>\n"
    "              <h1 style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', "
    "Roboto, sans-serif; font-size: 24px; font-weight: 800; color: #141512; "
    'line-height: 1.2; margin: 0 0 16px 0; letter-spacing: -0.6px;">\n'
    "                {heading}\n"
    "              </h1>\n"
    "              <p style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', "
    "Roboto, sans-serif; font-size: 14px; line-height: 1.65; color: #43463e; "
    'margin: 0 0 28px 0;">\n'
    "                {message_body}\n"
    "              </p>\n"
    '              <table cellpadding="0" cellspacing="0" border="0" '
    'style="margin: 28px 0 32px 0;">\n'
    "                <tr>\n"
    '                  <td align="center" style="background-color: #141512; '
    'border-radius: 8px; box-shadow: 3px 3px 0 #d8ff43;">\n'
    '                    <a href="{action_url}" target="_blank" style="display: inline-block; '
    "padding: 13px 26px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', "
    "Roboto, sans-serif; font-size: 13px; font-weight: 700; color: #ffffff; "
    'text-decoration: none; border-radius: 8px;">\n'
    "                      {action_label} &rarr;\n"
    "                    </a>\n"
    "                  </td>\n"
    "                </tr>\n"
    "              </table>\n"
    "              <p style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', "
    "Roboto, sans-serif; font-size: 12px; color: #888b80; margin: 24px 0 0 0; "
    'line-height: 1.5;">\n'
    "                {footer_note}\n"
    "              </p>\n"
    "            </td>\n"
    "          </tr>\n"
    "          <tr>\n"
    '            <td style="background-color: #fafbf7; border-top: 1px solid #e3e5db; '
    'padding: 22px 36px; text-align: center;">\n'
    "              <p style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', "
    'Roboto, sans-serif; font-size: 11px; color: #999c92; margin: 0; line-height: 1.6;">\n'
    '                <strong style="color: #606359;">Feed.io</strong> &bull; '
    "Creative Review Platform<br>\n"
    "                Feedback that keeps the cut moving.\n"
    "              </p>\n"
    "            </td>\n"
    "          </tr>\n"
    "        </table>\n"
    "      </td>\n"
    "    </tr>\n"
    "  </table>\n"
    "</body>\n"
    "</html>"
)


def render_email_html(
    *,
    step_badge: str,
    heading: str,
    message_body: str,
    action_label: str,
    action_url: str,
    footer_note: str,
    escape_body: bool = True,
) -> str:
    return EMAIL_HEADER.format(
        step_badge=escape(step_badge),
        heading=escape(heading),
        message_body=escape(message_body) if escape_body else message_body,
        action_label=escape(action_label),
        action_url=escape(action_url),
        footer_note=escape(footer_note),
    )


def render_verification_email(
    *,
    display_name: str,
    action_url: str,
) -> tuple[str, str]:
    text_content = (
        f"Hi {display_name},\n\n"
        f"Welcome to Feed.io! Please verify your email address to activate your account:\n"
        f"{action_url}\n\n"
        f"This link expires in 24 hours. If you did not create an account, ignore this email.\n\n"
        f"— The Feed.io Team"
    )

    html_content = render_email_html(
        step_badge="EMAIL VERIFICATION",
        heading=f"Welcome, {display_name}",
        message_body=(
            "Thank you for signing up for Feed.io. Please verify your email address to activate "
            "your account, set up your creative organization, and start collaborating."
        ),
        action_label="Verify Email Address",
        action_url=action_url,
        footer_note=(
            "This verification link will expire in 24 hours. "
            "If you did not create a Feed.io account, no action is needed."
        ),
    )

    return text_content, html_content


def render_password_reset_email(
    *,
    display_name: str,
    action_url: str,
) -> tuple[str, str]:
    text_content = (
        f"Hi {display_name},\n\n"
        f"We received a request to reset your Feed.io password:\n"
        f"{action_url}\n\n"
        f"This link expires in 60 minutes. If you did not request a reset, ignore this email.\n\n"
        f"— The Feed.io Team"
    )

    html_content = render_email_html(
        step_badge="PASSWORD RECOVERY",
        heading="Reset your password",
        message_body=(
            f"Hi {display_name}, we received a request to reset your password. "
            "Click the button below to choose a strong new password and secure your account."
        ),
        action_label="Reset Password",
        action_url=action_url,
        footer_note=(
            "This link will expire in 60 minutes. If you did not request a password reset, "
            "please ignore this email or reach out to support if you have questions."
        ),
    )

    return text_content, html_content
