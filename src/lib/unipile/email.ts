import { unipileClient, isUnipileConfigured } from "./client";

export interface SendEmailParams {
  accountId: string;
  to: string;
  toName?: string;
  subject: string;
  body: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; trackingId?: string }> {
  if (!isUnipileConfigured()) {
    throw new Error("Unipile non configuré");
  }

  const result = await unipileClient.email.send({
    account_id: params.accountId,
    to: [{ identifier: params.to, display_name: params.toName }],
    subject: params.subject,
    body: params.body,
  });

  return {
    success: true,
    trackingId: result.tracking_id,
  };
}
