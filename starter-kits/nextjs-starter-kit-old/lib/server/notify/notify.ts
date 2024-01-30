type NotifyContent =
  | {
      html: string;
      text?: never;
    }
  | {
      html?: never;
      text: string;
    };

type NotifyProps = NotifyContent & {
  from?: string;
  subject: string;
  to: string;
};

const DEFAULT_SENDER = "noreply@example.com";

/**
 * Simulate sending an email to a newly invited user
 * For example with SendGrid:
 * https://github.com/sendgrid/sendgrid-nodejs/tree/main/packages/mail
 * @param to - The email receiver
 * @param [from] - The email sender
 * @param subject - The title of the email
 * @param [text] - The text content of the email
 * @param [html] - The HTML content of the email
 */
export async function notify({
  to,
  from = DEFAULT_SENDER,
  subject,
  text,
  html,
}: NotifyProps): Promise<boolean> {
  const msg = { to, from, subject, text, html };

  // Send email message
  // @sendgrid/mail example:
  /*
  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error(error);

    if (error.response) {
      console.error(error.response.body)
    }
  }
  */

  return true;
}
