import { describe, expect, it } from "vitest";
import { createAdminSignupEmail } from "./admin-signup-email";
import { createApprovalEmail } from "./approval-email";
import { createRejectionEmail } from "./rejection-email";

/**
 * Email is write-once in practice: a template that renders wrong is discovered by
 * a recipient, not by a page refresh. These tests cover the things that are
 * silent when they break — an unescaped address becoming markup, a template that
 * grew a call to action it is not supposed to have, and the singular/plural of
 * the queue line.
 */

describe("createApprovalEmail", () => {
  it("greets by first name only", () => {
    const { html } = createApprovalEmail({ name: "Rahul Sharma" });
    expect(html).toContain("Rahul, you");
    expect(html).not.toContain("Rahul Sharma");
  });

  it("falls back to a nameless greeting rather than an awkward one", () => {
    const withNull = createApprovalEmail({ name: null });
    const withBlank = createApprovalEmail({ name: "   " });
    for (const email of [withNull, withBlank]) {
      expect(email.text.startsWith("You're in.")).toBe(true);
    }
  });

  it("carries exactly one link, to the sign-in page", () => {
    const { html, text } = createApprovalEmail({ name: "Rahul" });
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    expect(hrefs).toHaveLength(1);
    expect(hrefs[0]).toMatch(/\/login$/);
    // The plain-text part has to carry the URL too — a text-only client would
    // otherwise be told to press a button that is not there.
    expect(text).toMatch(/\/login/);
  });

  it("spells the URL out as well as linking it", () => {
    const { html } = createApprovalEmail({ name: null });
    // Belt and braces for clients that strip the anchor: the address is visible
    // as copy, not only as an href.
    expect(html.match(/\/login/g)?.length).toBeGreaterThan(1);
  });
});

describe("createRejectionEmail", () => {
  it("has no call to action, because there is nothing to do", () => {
    const { html } = createRejectionEmail({ name: "Rahul" });
    expect(html).not.toContain("href=");
  });

  it("gives no reason and does not invite a retry", () => {
    const { text } = createRejectionEmail({ name: "Rahul" });
    expect(text).not.toMatch(/try again|reapply|sign ?up again/i);
  });

  it("keeps the outcome out of the inbox preview line", () => {
    const { html } = createRejectionEmail({ name: null });
    const preheader = html.slice(html.indexOf("mso-hide:all;"), html.indexOf("&zwnj;"));
    expect(preheader).not.toMatch(/not able|declin|reject/i);
  });
});

describe("createAdminSignupEmail", () => {
  it("puts the address in the subject so the inbox is triageable", () => {
    const { subject } = createAdminSignupEmail({
      signupEmail: "rahul@example.com",
      signupName: "Rahul",
      pendingCount: 1,
    });
    expect(subject).toContain("rahul@example.com");
  });

  it("links to the console", () => {
    const { html } = createAdminSignupEmail({
      signupEmail: "rahul@example.com",
      signupName: null,
      pendingCount: 1,
    });
    expect(html).toMatch(/href="[^"]*\/admin"/);
  });

  it("escapes the address and name, which are attacker-controlled input", () => {
    const { html } = createAdminSignupEmail({
      signupEmail: '"><script>alert(1)</script>@example.com',
      signupName: '<img src=x onerror="alert(1)">',
      pendingCount: 1,
    });

    /*
     * The property that matters is that no *tag* and no *attribute* can form —
     * not that the substring "onerror=" is absent. Escaping leaves it in the
     * document as inert text (`onerror=&quot;`), which is correct and harmless,
     * so asserting on the bare substring would fail on safe output.
     */
    expect(html).not.toContain("<script");
    // Payload-specific: the shell legitimately renders its own logo <img>, so a
    // bare "<img" assertion would fail on the template's own correct markup.
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain('onerror="');
    // And the payload is present, escaped, rather than silently dropped.
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("says nothing else is waiting when this is the only one", () => {
    const { text } = createAdminSignupEmail({
      signupEmail: "a@example.com",
      signupName: null,
      pendingCount: 1,
    });
    expect(text).toContain("Nothing else is waiting.");
  });

  it("counts the others, and agrees with itself on singular and plural", () => {
    const two = createAdminSignupEmail({
      signupEmail: "a@example.com",
      signupName: null,
      pendingCount: 2,
    });
    expect(two.text).toContain("1 other account is also waiting.");

    const four = createAdminSignupEmail({
      signupEmail: "a@example.com",
      signupName: null,
      pendingCount: 4,
    });
    expect(four.text).toContain("3 other accounts are also waiting.");
  });
});

describe("every template", () => {
  const emails = [
    createApprovalEmail({ name: "Rahul" }),
    createRejectionEmail({ name: "Rahul" }),
    createAdminSignupEmail({ signupEmail: "a@example.com", signupName: null, pendingCount: 1 }),
  ];

  it("renders a subject, a text part and a complete html document", () => {
    for (const email of emails) {
      expect(email.subject.length).toBeGreaterThan(0);
      expect(email.text.length).toBeGreaterThan(0);
      expect(email.html.startsWith("<!doctype html>")).toBe(true);
      expect(email.html).toContain("</html>");
    }
  });

  it("leaves no unreplaced template expression behind", () => {
    for (const email of emails) {
      expect(email.html).not.toContain("${");
      expect(email.text).not.toContain("${");
      expect(email.subject).not.toContain("${");
    }
  });
});
