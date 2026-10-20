# empeo Registration — Playwright Tests

Automated UI tests for the empeo UAT registration page using Playwright Test, TypeScript, and the Page Object Model (POM).

**Target URL:** https://portal.uat.gofive.co.th/Register/empeo

## Project structure

```text
empeo-automation/
├── pages/
│   └── RegisterPage.ts
├── tests/
│   └── register.spec.ts
├── package.json
├── playwright.config.ts
├── README.md
└── TEST_CASES.md
```

`RegisterPage.ts` contains page locators and reusable actions. `register.spec.ts` contains the automated tests and imports the page object from `../pages/RegisterPage`.

> The file must be named `register.spec.ts` (dot, not underscore). Playwright's default `testMatch` only picks up files ending in `.spec.ts` / `.test.ts`, so `register_spec.ts` would not be discovered.
> `package.json` and `playwright.config.ts` are part of the intended structure but are not included in the supplied files — create them in your project.

## Test cases

Test IDs in the spec, this README, and `TEST_CASES.md` are identical.

| ID | Scenario | Type |
|---|---|---|
| REG-001 | Submit with blank mandatory fields (terms accepted) → all required-field messages appear | UAT UI |
| REG-002 | Invalid email `invalid-email` → browser validity rejects it, or the app shows the invalid-email message | UAT UI |
| REG-003 | Phone too short `0967690` | UAT UI |
| REG-004 | Phone too long `09676907088` | UAT UI |
| REG-005 | Invalid phone pattern `1234567890` | UAT UI |
| REG-006 | Phone with letters `abcd-phone` | UAT UI |
| REG-007 | Invalid/expired promo code `EXPIRED2023` | Mocked promo API |
| REG-008 | Previously redeemed promo code `USEDCODE` | Mocked promo API |
| REG-009 | Incorrect OTP `999999` | UAT UI |
| REG-010 | Expired OTP (verification response mocked as expired) | Mocked OTP API |
| REG-011 | Valid details + `FREE15DAY` promo + terms + OTP `123456` → registration completes | UAT UI |

REG-010 mocks the API response so the test does not wait for a real countdown; it tests expired-token handling, not the countdown display.

### Notes about the supplied UAT page

- Validation and rejected-promo messages are checked in Thai, matching the UI strings in `RegisterPage.ts`.
- The form has no Password field, so no Password-required assertion is included.
- REG-007 / REG-008 / REG-010 mock API rejections. Confirm the route matchers against the real endpoints if the UAT backend uses paths that do not contain `promo`, `coupon`, `discount` (promo) or `otp`, `verification`, `verify` (OTP) under `/api/`.
- **Email:** every registration flow, including REG-011, uses a generated plus-addressed alias (`somchai.test+<label>.<runId>@gmail.com`) to avoid duplicate-email collisions. The base address `somchai.test@gmail.com` stays in `TEST_CONFIG` only as the page object's default. If UAT rejects plus-addressed emails, change `uniqueEmail()` in the spec.
- The company is entered through the manual `อื่นๆ` mode (see `TEST_CASES.md`).
- If UAT blocks reusing the same phone number after a successful registration, reset the test account/state before re-running REG-011.

## Prerequisites

- Node.js (LTS recommended)
- npm

```bash
npm install
npx playwright install chromium
```

For a new project without Playwright installed:

```bash
npm install --save-dev @playwright/test typescript @types/node
npx playwright install chromium
```

## Run the tests

```bash
npx playwright test tests/register.spec.ts              # registration tests only
npx playwright test                                      # all tests
npx playwright test tests/register.spec.ts --headed      # visible browser
npx playwright test tests/register.spec.ts --ui          # UI mode
npx playwright test tests/register.spec.ts --grep "REG-011"   # a single test by ID
npx playwright test tests/register.spec.ts --grep "REG-00[3-6]"  # the four phone tests
npx playwright show-report                               # open the HTML report
```

## Important

These are end-to-end tests against a UAT website. Results depend on the current UI, test-account state, OTP behavior, and API endpoint names. Run the suite locally to confirm that selectors and mocked routes match the live UAT implementation.
