import { describe, expect, it } from "vitest";
import { buildEmail, buildLetter, composeLinks } from "./sponsorEmail";

const MP = { name: "Yasir Naqvi", riding: "Ottawa Centre" };
const PETITION = {
  title: "Review the use of executive aircraft",
  issue: "Whereas the Government spent $42 million;",
  request: "publish per-trip costs.",
};

describe("buildLetter", () => {
  it("writes as a constituent when the MP came from the user's postal code", () => {
    const letter = buildLetter({ mp: MP, title: PETITION.title, constituent: true });
    expect(letter).toBe(
      [
        "Dear Yasir Naqvi,",
        "",
        `I'm a constituent in Ottawa Centre. I've drafted an e-petition, "Review the use of executive aircraft," and I'm asking you to authorize it for publication on the House of Commons website.`,
        "",
        "Sponsoring does not mean you endorse it. It allows constituents to sign and, with 500 signatures, have it presented in the House.",
        "",
        "Thank you,",
        "[Your name], [Postal code]",
      ].join("\n"),
    );
  });

  it("does not claim to be a constituent without a postal code", () => {
    const letter = buildLetter({ mp: MP, title: PETITION.title, constituent: false });
    expect(letter).not.toContain("constituent in");
    expect(letter).toContain("[Your name], [Postal code]");
  });
});

describe("buildEmail", () => {
  it("puts the full petition text under the letter", () => {
    const { subject, body } = buildEmail({ letter: "Dear MP,", petition: PETITION });
    expect(subject).toBe("Request to sponsor an e-petition: Review the use of executive aircraft");
    expect(body).toBe(
      [
        "Dear MP,",
        "",
        "---",
        "",
        "Review the use of executive aircraft",
        "",
        "Whereas the Government spent $42 million;",
        "",
        "We, the undersigned, call upon the Government of Canada to publish per-trip costs.",
      ].join("\n"),
    );
  });
});

describe("composeLinks", () => {
  const links = composeLinks({ to: "mp@parl.gc.ca", subject: "A & B", body: "Line 1\nLine 2" });

  it("builds a Gmail compose link", () => {
    expect(links.gmail).toBe(
      "https://mail.google.com/mail/?view=cm&fs=1&to=mp%40parl.gc.ca&su=A%20%26%20B&body=Line%201%0ALine%202",
    );
  });

  it("builds an Outlook web compose link", () => {
    expect(links.outlook).toBe(
      "https://outlook.live.com/mail/0/deeplink/compose?to=mp%40parl.gc.ca&subject=A%20%26%20B&body=Line%201%0ALine%202",
    );
  });

  it("builds a mailto link", () => {
    expect(links.mailto).toBe("mailto:mp@parl.gc.ca?subject=A%20%26%20B&body=Line%201%0ALine%202");
  });
});
