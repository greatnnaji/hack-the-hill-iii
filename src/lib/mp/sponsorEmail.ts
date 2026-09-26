import type { Mp } from "@/lib/mp/types";
import { fullRequest } from "@/lib/petition";

type LetterInput = {
  mp: Pick<Mp, "name" | "riding">;
  title: string;
  /** True only when the MP was found from the user's own postal code in this visit. */
  constituent: boolean;
};

export function buildLetter({ mp, title, constituent }: LetterInput): string {
  const intro = constituent
    ? `I'm a constituent in ${mp.riding}. I've drafted an e-petition, "${title}," and I'm asking you to authorize it for publication on the House of Commons website.`
    : `I've drafted an e-petition, "${title}," and I'm asking you to authorize it for publication on the House of Commons website.`;
  return [
    `Dear ${mp.name},`,
    "",
    intro,
    "",
    "Sponsoring does not mean you endorse it. It allows constituents to sign and, with 500 signatures, have it presented in the House.",
    "",
    "Thank you,",
    "[Your name], [Postal code]",
  ].join("\n");
}

type PetitionText = { title: string; issue: string; request: string };

export function buildEmail({ letter, petition }: { letter: string; petition: PetitionText }) {
  return {
    subject: `Request to sponsor an e-petition: ${petition.title}`,
    body: [letter, "", "---", "", petition.title, "", petition.issue, "", fullRequest(petition.request)].join(
      "\n",
    ),
  };
}

export type ComposeLinks = { gmail: string; outlook: string; mailto: string };

export function composeLinks({ to, subject, body }: { to: string; subject: string; body: string }): ComposeLinks {
  const e = encodeURIComponent;
  return {
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${e(to)}&su=${e(subject)}&body=${e(body)}`,
    outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${e(to)}&subject=${e(subject)}&body=${e(body)}`,
    mailto: `mailto:${to}?subject=${e(subject)}&body=${e(body)}`,
  };
}
