import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsMenu } from "./SettingsMenu";

const render = (props: Parameters<typeof SettingsMenu>[0]) => renderToStaticMarkup(createElement(SettingsMenu, props));

describe("SettingsMenu", () => {
  it("shows who is signed in and links to the Auth0 logout route", () => {
    const html = render({ name: "Alice", email: "alice@example.com", canLogOut: true });
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain("Signed in as");
    expect(html).toContain("Alice");
    expect(html).toContain("alice@example.com");
    expect(html).toContain('href="/auth/logout"');
  });

  it("uses the email when there is no name, without repeating it", () => {
    const html = render({ name: null, email: "bob@example.com", canLogOut: true });
    expect(html.match(/bob@example\.com/g)).toHaveLength(1);
  });

  it("disables logging out when login is off in local dev", () => {
    const html = render({ name: "Local Dev", email: "dev@localhost", canLogOut: false });
    expect(html).not.toContain("/auth/logout");
    expect(html).toContain("Login is off in local dev.");
  });
});
