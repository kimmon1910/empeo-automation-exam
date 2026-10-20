# empeo Registration — Test Case Design

**Target:** `https://portal.uat.gofive.co.th/Register/empeo`  
**Framework:** Playwright Test + TypeScript  
**Spec:** `tests/register.spec.ts` (test titles start with the ID below, e.g. `REG-011: ...`)

## Test cases

| ID | Scenario | Test data / action | Expected result | Test type |
|---|---|---|---|---|
| REG-001 | Required-field validation | Leave required fields blank, accept terms, then submit | Validation appears for company, business type, user size, email, first name, last name, and phone | UAT UI |
| REG-002 | Invalid email format | Enter `invalid-email` | Browser validity rejects the value, or the app displays its invalid-email message | UAT UI / browser validity |
| REG-003 | Phone number too short | Phone `0967690` | Phone-invalid or phone-required message appears | UAT UI |
| REG-004 | Phone number too long | Phone `09676907088` | Phone-invalid or phone-required message appears | UAT UI |
| REG-005 | Invalid phone number pattern | Phone `1234567890` | Phone-invalid or phone-required message appears | UAT UI |
| REG-006 | Phone contains letters | Phone `abcd-phone` | Phone-invalid or phone-required message appears | UAT UI |
| REG-007 | Invalid or expired promo code | Apply `EXPIRED2023` | UI displays the invalid promo-code message | Mocked promo API rejection |
| REG-008 | Previously redeemed promo code | Apply `USEDCODE` | UI displays the invalid promo-code message | Mocked promo API rejection |
| REG-009 | Incorrect OTP | Submit a valid form and enter `999999` | OTP error message appears in the OTP dialog | UAT UI; depends on UAT OTP behavior |
| REG-010 | Expired OTP | Submit the form and enter `123456` while the verification response is mocked as expired | UI displays the expired-OTP message | Mocked OTP API response |
| REG-011 | Registration with valid details and promo | Enter valid details, apply `FREE15DAY`, accept terms, submit OTP `123456` | Promo is shown as applied, OTP dialog closes, and a redirect or success-specific message is detected | UAT UI |

## Assumptions and limitations

- The manual company mode (`อื่นๆ`) is used because `Gofive Company Limited` was not found as a Thai-registered-company autocomplete suggestion. The test enters the name in the visible `ชื่อบริษัท*` field.
- Phone, OTP, and the successful promo code follow the exam brief. Every registration flow (including REG-011) uses a generated plus-addressed Gmail alias to reduce duplicate-email collisions; the fixed `somchai.test@gmail.com` is only the page object's default. Confirm that UAT accepts plus-addressed aliases.
- REG-007, REG-008, and REG-010 mock API responses. They validate UI handling of those responses; they do not verify the live backend's rules for expired or redeemed codes.
- Route mocks assume the relevant endpoints are under `/api/` and their URLs contain expected keywords. Check the actual UAT Network requests if a mock does not trigger.
- REG-009 and REG-010 accept generic wording ("ไม่ถูกต้อง", "หมดอายุ") only inside the OTP dialog, so unrelated validation messages elsewhere on the page cannot make them pass.
- REG-011 intentionally does not use the static marketing copy `ลงทะเบียนเรียบร้อย ใช้งานได้ทันที` as proof of success. It requires the OTP dialog to close and then a redirect or success-specific message. Update the success-message locator if the real post-registration UI uses different wording.
- REG-002 passes as soon as the browser's built-in validity check rejects the value; it only checks the app's own message when the browser accepts it.
- Only one phone number is supplied in the brief. If UAT prevents reusing it after a successful registration, reset the test account/state before re-running the full suite.
- Run the suite against UAT before submission. The files were built from the supplied DOM snapshots and logs; server-side behavior has not been verified.
