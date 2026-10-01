// Gold Elite "document delivery" Gmail draft for the Docs workspace.
//
// Built from the Gold Elite v2 skeleton (Playground\TEMPLATES\_gold_elite_generic_gmail_template v2,
// BLI Gmail core structure v3) and kept in step with PDF Studio's approved delivery email
// (LIVE repo pdf-tools/index.html #emailTpl, 2026-10-01): hidden spacer line + 1px 600-wide PNG FIRST
// in <body> (the "invisible line" that keeps Gmail full width on a phone), fluid container
// (width="100%" attribute + max-width:600px, never an inline width:100%), inline styles only,
// ASCII-only source. Texts go to (336) 827-9065; calls to (336) 835-1993.
//
// Pure (no DOM) so it is unit-tested in node; the browser fills it and posts it to the
// BLI Mail Gateway (services/mailGateway.ts), which creates the draft in Bill's Gmail.

import { docType, firstNameOf, tidyCustomerName } from './docLinks.ts';
import type { DocTypeId } from './docLinks.ts';

export const MAX_EMAIL_HTML_BYTES = 102400; // Gmail clips message bodies over ~102 KB

const TEMPLATE = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Document Delivery - Bill Layne Insurance</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<style>table{border-collapse:collapse}</style>
<![endif]-->
<style>
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0;mso-table-rspace:0}
img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
body{margin:0;padding:0;width:100%!important;background-color:#f1efe9}
@media only screen and (max-width:620px){
.email-container{width:100%!important;padding:0 8px!important}
.card-pad{padding:22px 18px!important}
.hero-pad{padding:26px 18px!important}
.full-btn{width:100%!important;text-align:center!important}
}
</style>
</head>
<body style="margin:0;padding:0;width:100%!important;background-color:#f1efe9">
<div style="display:none;white-space:nowrap;font:15px courier;color:#f1efe9;line-height:0;width:600px!important;min-width:600px!important;max-width:600px!important">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" width="600" height="1" alt="" style="display:block;width:600px!important;min-width:600px!important;max-width:600px!important;height:1px!important;line-height:1px;font-size:0;border:0">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">{{HEADLINE}} - attached and ready to view online.&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<!--[if mso]>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td>
<![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="center" style="padding:20px 0">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-container" style="max-width:600px;margin:0 auto">

<!-- ===== HEADER ===== -->
<tr><td style="padding-bottom:4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;border-radius:16px 16px 0 0">
<tr><td style="background-color:#000000;padding:18px 24px;border-bottom:4px solid #D4A843;border-radius:16px 16px 0 0">
<img src="https://img.billlayneinsurance.com/cdn-cgi/image/width=380,format=png/i/2026/08/bli-agency-logo-4jqj2j.png" alt="Bill Layne Insurance Agency" width="190" style="display:block;width:190px;max-width:190px;height:auto">
</td></tr></table>
</td></tr>

<!-- ===== HERO ===== -->
<tr><td style="padding-bottom:4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e3dccd">
<tr><td class="hero-pad" style="padding:30px 20px 26px 20px;text-align:center">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;font-weight:bold;letter-spacing:1.6px;text-transform:uppercase;color:#8a6d2f;-webkit-text-size-adjust:100%">Document delivery</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:33px;color:#000000;padding-top:12px;-webkit-text-size-adjust:100%">{{HEADLINE}}</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#374151;padding-top:14px;-webkit-text-size-adjust:100%">{{INTRO_LINE}}</div>
</td></tr></table>
</td></tr>

<!-- ===== DETAILS: attachment + view online ===== -->
<tr><td style="padding-bottom:4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fdfbf6;border:1px solid #e3dccd">
<tr><td class="card-pad" style="padding:24px 20px 20px 20px">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:15px;font-weight:bold;letter-spacing:1.6px;text-transform:uppercase;color:#8a6d2f;padding-bottom:14px;-webkit-text-size-adjust:100%">Attached to this email</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif">
<tr><td valign="top" style="padding:0 0 14px 0">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:21px;color:#000000;font-weight:bold;word-break:break-all;-webkit-text-size-adjust:100%">&#128206; {{ATTACHMENT_NAME}}</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#555555;padding-top:4px;-webkit-text-size-adjust:100%">{{FILE_META}}</div>
</td></tr>
<tr><td style="padding:0 0 14px 0;border-top:1px solid #ece3d2"></td></tr>
<tr><td valign="top" style="padding:0 0 16px 0">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#555555;-webkit-text-size-adjust:100%">Tap the attachment at the bottom of this email to open it, or view it online on any phone or computer &mdash; you can download or share it from there too.</div>
</td></tr>
<tr><td class="full-btn" align="center" style="background-color:#D4A843;border-radius:6px"><a href="{{DOC_URL}}" style="display:block;padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#000000;text-decoration:none">View it online</a></td></tr>
</table>
</td></tr></table>
</td></tr>

<!-- {{IF_NOTE_START}} -->
<!-- ===== NOTE ===== -->
<tr><td style="padding-bottom:4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fdfbf6;border:1px solid #e3dccd">
<tr><td class="card-pad" style="padding:24px 20px">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:15px;font-weight:bold;letter-spacing:1.6px;text-transform:uppercase;color:#8a6d2f;padding-bottom:10px;-webkit-text-size-adjust:100%">A note from Bill</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#333333;-webkit-text-size-adjust:100%">{{NOTE_BODY}}</div>
</td></tr></table>
</td></tr>
<!-- {{IF_NOTE_END}} -->

<!-- ===== SIGNOFF (new compose drafts carry no Gmail signature) ===== -->
<tr><td style="padding-bottom:4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e3dccd">
<tr><td class="card-pad" style="padding:18px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="4" style="width:4px;background-color:#D4A843;font-size:0;line-height:0">&nbsp;</td>
<td style="padding:0 0 0 16px">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:22px;color:#000000;font-weight:bold;-webkit-text-size-adjust:100%">Bill Layne</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:18px;color:#555555;padding-top:2px;-webkit-text-size-adjust:100%">Agent &amp; Owner &middot; Bill Layne Insurance Agency</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#333333;padding-top:6px;-webkit-text-size-adjust:100%">Call <a href="tel:+13368351993" style="color:#000000;text-decoration:none;font-weight:bold">(336) 835-1993</a> &middot; Text <a href="sms:+13368279065" style="color:#000000;text-decoration:none;font-weight:bold">(336) 827-9065</a><br><a href="mailto:Save&#64;BillLayneInsurance&#46;com" style="color:#000000;text-decoration:none;font-weight:bold">Save&#64;BillLayneInsurance&#46;com</a></div>
</td></tr></table>
</td></tr></table>
</td></tr>

<!-- ===== CTA ===== -->
<tr><td style="padding-bottom:4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;border-left:5px solid #D4A843">
<tr><td class="card-pad" style="padding:22px 20px">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:25px;color:#ffffff;-webkit-text-size-adjust:100%">Questions? We&rsquo;re right here.</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#e5e7eb;padding-top:7px;-webkit-text-size-adjust:100%">Give the document a look and tell us if anything needs correcting. We&rsquo;re your independent agent and glad to help.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">
<tr><td class="full-btn" align="center" style="background-color:#D4A843;border-radius:6px"><a href="tel:+13368351993" style="display:block;padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#000000;text-decoration:none">Call (336) 835-1993</a></td></tr>
<tr><td height="8" style="font-size:0;line-height:8px">&nbsp;</td></tr>
<tr><td class="full-btn" align="center" style="border:1px solid #3a3a3a;border-radius:6px"><a href="mailto:Save&#64;BillLayneInsurance&#46;com" style="display:block;padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none">Email us</a></td></tr>
<tr><td align="center" style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:18px;color:#c9c9c9;-webkit-text-size-adjust:100%">Prefer to text? <a href="sms:+13368279065" style="color:#D4A843;text-decoration:none;font-weight:bold">(336) 827-9065</a></td></tr>
</table>
</td></tr></table>
</td></tr>

<!-- ===== FOOTER ===== -->
<tr><td>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;border-radius:0 0 16px 16px">
<tr><td class="card-pad" style="padding:26px 20px 30px 20px;text-align:center;border-radius:0 0 16px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 14px auto"><tr><td style="background-color:#ffffff;padding:8px 14px;border-radius:6px"><img src="https://img.billlayneinsurance.com/cdn-cgi/image/width=380,format=png/i/2026/08/bli-agency-logo-4jqj2j.png" alt="Bill Layne Insurance Agency" width="150" style="display:block;width:150px;max-width:150px;height:auto"></td></tr></table>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:20px;color:#ffffff;font-weight:bold;-webkit-text-size-adjust:100%">Bill Layne Insurance Agency</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#D4A843;font-weight:bold;letter-spacing:.5px;padding-top:3px;-webkit-text-size-adjust:100%">Your Neighbor. Your Agent.</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:20px;color:#c9c9c9;padding-top:10px;-webkit-text-size-adjust:100%">
1283 N Bridge St, PO Box 827, Elkin, NC 28621<br>
<a href="tel:+13368351993" style="color:#D4A843;text-decoration:none;font-weight:bold">(336) 835-1993</a> &middot;
<a href="mailto:Save&#64;BillLayneInsurance&#46;com" style="color:#D4A843;text-decoration:none;font-weight:bold">Save&#64;BillLayneInsurance&#46;com</a><br>
<a href="https://www.BillLayneInsurance.com" style="color:#D4A843;text-decoration:none;font-weight:bold">www.BillLayneInsurance.com</a>
</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:20px;color:#ffffff;padding-top:14px;-webkit-text-size-adjust:100%">
<a href="https://www.billlayneinsurance.com/clients/" style="color:#ffffff;text-decoration:none;font-weight:bold">Client Hub</a> &middot;
<a href="https://www.billlayneinsurance.com/service-center#payment-panel" style="color:#ffffff;text-decoration:none;font-weight:bold">Pay</a> &middot;
<a href="https://www.billlayneinsurance.com/service-center#idcard-panel" style="color:#ffffff;text-decoration:none;font-weight:bold">ID Cards</a> &middot;
<a href="https://www.billlayneinsurance.com/claims-center/" style="color:#ffffff;text-decoration:none;font-weight:bold">Claims</a>
</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:20px;padding-top:6px;-webkit-text-size-adjust:100%">
<a href="https://g.page/r/CXGq9B7-jzu7EBM/review" style="color:#D4A843;text-decoration:none;font-weight:bold">&#9733; Review us on Google</a>
</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:20px;color:#D4A843;padding-top:9px;-webkit-text-size-adjust:100%">
<a href="https://www.facebook.com/dollarbillagency" style="color:#D4A843;text-decoration:none;font-weight:bold">Facebook</a> &middot;
<a href="https://www.instagram.com/ncautoandhome" style="color:#D4A843;text-decoration:none;font-weight:bold">Instagram</a> &middot;
<a href="https://www.tiktok.com/@ncautoandhome" style="color:#D4A843;text-decoration:none;font-weight:bold">TikTok</a> &middot;
<a href="https://www.youtube.com/@ncautoandhome" style="color:#D4A843;text-decoration:none;font-weight:bold">YouTube</a> &middot;
<a href="https://x.com/shopsavecompare" style="color:#D4A843;text-decoration:none;font-weight:bold">X</a>
</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;line-height:15px;color:#8a8a8a;padding-top:14px;-webkit-text-size-adjust:100%">NC License #6571216 &middot; Serving North Carolina since 2005</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;line-height:15px;color:#8a8a8a;padding-top:8px;-webkit-text-size-adjust:100%">This message and the attached document are provided for your information and are not a policy or a statement of coverage. Coverage is governed by the terms, conditions, and limits of your policy.</div>
</td></tr></table>
</td></tr>

</table>
</td></tr>
</table>
<!--[if mso]>
</td></tr></table>
</td></tr></table>
<![endif]-->
</body>
</html>`;

const escHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function applyBlock(html: string, marker: string, keep: boolean) {
  const block = new RegExp(`<!-- \\{\\{IF_${marker}_START\\}\\} -->[\\s\\S]*?<!-- \\{\\{IF_${marker}_END\\}\\} -->`, 'g');
  return html.replace(block, chunk => keep ? chunk.replace(new RegExp(`<!-- \\{\\{IF_${marker}_(START|END)\\}\\} -->`, 'g'), '') : '');
}

/** GmailApp corrupts astral (emoji) chars: entity-escape every non-ASCII character, ONCE, last. */
export const toAsciiEntities = (html: string) => html.replace(/[^\x00-\x7F]/gu, ch => '&#x' + ch.codePointAt(0)!.toString(16).toUpperCase() + ';');
/** Subjects can't carry entities: drop astral chars and squeeze spaces. */
export const cleanSubject = (subject: string) => subject.replace(/[\u{10000}-\u{10FFFF}]/gu, '').replace(/\s{2,}/g, ' ').trim();

/** House style (matches PDF Studio): short, lowercase. */
export function draftSubject(typeId: DocTypeId) {
  const noun = typeId === 'general' ? 'documents' : docType(typeId).noun;
  return `your ${noun} from bill layne insurance`.toLowerCase();
}

export function draftHeadline(typeId: DocTypeId) {
  return typeId === 'general' ? 'Your documents are attached' : `Your ${docType(typeId).noun} is ready`;
}

export function draftIntro(typeId: DocTypeId, customer: string) {
  const first = firstNameOf(customer);
  const what = typeId === 'general' ? 'the document you asked about is' : `your ${docType(typeId).noun} is`;
  const sentence = `${what} attached to this email. You can also view it online anytime.`;
  return first ? `Hi ${first}, ${sentence}` : sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export interface DocEmailInput {
  typeId: DocTypeId;
  customer: string;
  fileName: string;
  fileMeta: string; // e.g. "PDF &middot; 185 KB" -- plain text, escaped here
  url: string;      // the docs.billlayneinsurance.com/d/<id> link
  note: string;
}

/** The finished draft body: filled, note block kept or removed, ASCII-only. */
export function buildDocEmailHtml(input: DocEmailInput) {
  let html = applyBlock(TEMPLATE, 'NOTE', Boolean(input.note.trim()));
  const vars: Record<string, string> = {
    HEADLINE: escHtml(draftHeadline(input.typeId)),
    INTRO_LINE: escHtml(draftIntro(input.typeId, tidyCustomerName(input.customer))),
    ATTACHMENT_NAME: escHtml(input.fileName),
    FILE_META: escHtml(input.fileMeta),
    DOC_URL: escHtml(input.url),
    NOTE_BODY: escHtml(input.note.trim()).replace(/\r?\n/g, '<br>'),
  };
  for (const [key, value] of Object.entries(vars)) html = html.split(`{{${key}}}`).join(value);
  return toAsciiEntities(html);
}

/**
 * The v3 gate, run on the exact string that will be posted. Any problem means
 * "do not send this draft" -- it catches template regressions before Gmail does.
 */
export function checkDocEmail(html: string): string[] {
  const problems: string[] = [];
  const bodyTag = html.indexOf('<body');
  const rest = bodyTag < 0 ? '' : html.slice(html.indexOf('>', bodyTag) + 1).trimStart();
  if (!rest.startsWith('<div style="display:none;white-space:nowrap;font:15px courier')) {
    problems.push('The hidden spacer line must be the first thing in the body.');
  }
  const afterSpacer = rest.slice(rest.indexOf('</div>') + 6).trimStart();
  if (!/^<img src="data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQ[^>]*width="600"/.test(afterSpacer)) {
    problems.push('The 600px spacer image (the invisible line) must come right after the hidden spacer line.');
  }
  for (const [, style] of html.matchAll(/style="([^"]*)"/g)) {
    if (/(^|;)\s*width:\s*100%/.test(style) && /max-width:\s*600px/.test(style)) {
      problems.push('A container pairs an inline width:100% with max-width:600px (breaks Gmail on Android).');
      break;
    }
  }
  if ((html.match(/white-space:\s*nowrap/g) || []).length !== 1) problems.push('white-space:nowrap is only allowed on the hidden spacer line.');
  if (html.includes('{{')) problems.push('An unfilled placeholder is left in the email.');
  if (/[^\x00-\x7F]/.test(html)) problems.push('The email must be ASCII-only (Gmail corrupts emoji).');
  if (!html.includes('sms:+13368279065')) problems.push('The text-us line must use (336) 827-9065.');
  if (html.includes('sms:+13368351993')) problems.push('Text links must go to (336) 827-9065, never the office line.');
  if (/text[^<]{0,40}\(336\) 835-1993/i.test(html.replace(/<[^>]+>/g, ''))) problems.push('(336) 835-1993 is for calls only, never "text".');
  if (new TextEncoder().encode(html).length > MAX_EMAIL_HTML_BYTES) problems.push("The email is over Gmail's 102 KB limit.");
  return problems;
}
