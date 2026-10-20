import { test, expect, type Page } from '@playwright/test';
import { EmpeoRegisterPage, TEST_CONFIG } from '../pages/RegisterPage';

// Test IDs (REG-001 ... REG-011) match TEST_CASES.md and README.md one-to-one.

const VALID_REGISTRATION = {
  companyName: TEST_CONFIG.fixedData.companyName,
  firstName: TEST_CONFIG.fixedData.firstName,
  lastName: TEST_CONFIG.fixedData.lastName,
  businessType: TEST_CONFIG.fixedData.businessType,
  userSize: TEST_CONFIG.fixedData.userSize,
  phone: TEST_CONFIG.fixedData.phone,
};

// Plus-addressed Gmail alias, unique per run, to avoid duplicate-email collisions.
function uniqueEmail(label: string) {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `somchai.test+${label}.${runId}@gmail.com`;
}

function registrationData(label: string) {
  return { ...VALID_REGISTRATION, email: uniqueEmail(label) };
}

test.describe('empeo Registration', () => {
  let registerPage: EmpeoRegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new EmpeoRegisterPage(page);
    await registerPage.goto();
  });

  test('REG-001: Show required-field validation when mandatory fields are blank', async ({ page }) => {
    await expect(registerPage.termsCheckbox).not.toBeChecked();
    await registerPage.acceptTerms();
    await registerPage.submitButton.click();

    const companyError = page
      .getByText(TEST_CONFIG.errorMessages.companyRequired, { exact: true })
      .or(
        page.getByText(TEST_CONFIG.errorMessages.companyRequiredGeneric, {
          exact: true,
        }),
      );
    await expect(companyError.first()).toBeVisible();

    const requiredMessages = [
      TEST_CONFIG.errorMessages.businessTypeRequired,
      TEST_CONFIG.errorMessages.userSizeRequired,
      TEST_CONFIG.errorMessages.emailRequired,
      TEST_CONFIG.errorMessages.firstNameRequired,
      TEST_CONFIG.errorMessages.lastNameRequired,
      TEST_CONFIG.errorMessages.phoneRequired,
    ];
    for (const message of requiredMessages) {
      await expect(page.getByText(message, { exact: true }).first()).toBeVisible();
    }
  });

  test('REG-002: Reject an invalid email format', async ({ page }) => {
    await registerPage.fillRegistrationForm({
      ...registrationData('invalid-email'),
      email: 'invalid-email',
      acceptTerms: true,
    });

    // Either the browser's built-in validity blocks the value,
    // or the app shows its own invalid-email message.
    const emailIsValid = await registerPage.emailInput.evaluate(
      (element) => (element as HTMLInputElement).checkValidity(),
    );

    if (!emailIsValid) {
      expect(emailIsValid).toBe(false);
      return;
    }

    await registerPage.submitForm();
    await expect(
      page.getByText(TEST_CONFIG.errorMessages.emailInvalid, { exact: true }),
    ).toBeVisible();
  });

  const invalidPhones = [
    { id: 'REG-003', phone: '0967690', label: 'too short' },
    { id: 'REG-004', phone: '09676907088', label: 'too long' },
    { id: 'REG-005', phone: '1234567890', label: 'invalid pattern' },
    { id: 'REG-006', phone: 'abcd-phone', label: 'contains letters' },
  ];

  for (const { id, phone, label } of invalidPhones) {
    test(`${id}: Reject phone number ${label} ("${phone}")`, async ({ page }) => {
      await registerPage.fillRegistrationForm({
        ...registrationData('invalid-phone'),
        phone,
        acceptTerms: true,
      });
      await registerPage.submitForm();

      const phoneError = page
        .getByText(TEST_CONFIG.errorMessages.phoneInvalid, { exact: true })
        .or(
          page.getByText(TEST_CONFIG.errorMessages.phoneRequired, {
            exact: true,
          }),
        );
      await expect(phoneError.first()).toBeVisible();
    });
  }

  test('REG-007: Reject an invalid or expired promo code (mocked API)', async ({ page }) => {
    await mockPromoRejection(page, 'PROMO_EXPIRED');
    await registerPage.applyPromoCode('EXPIRED2023');
    await expect(
      page.getByText(TEST_CONFIG.errorMessages.promoInvalid, { exact: true }).first(),
    ).toBeVisible();
  });

  test('REG-008: Reject a previously redeemed promo code (mocked API)', async ({ page }) => {
    await mockPromoRejection(page, 'PROMO_ALREADY_USED');
    await registerPage.applyPromoCode('USEDCODE');
    await expect(
      page.getByText(TEST_CONFIG.errorMessages.promoInvalid, { exact: true }).first(),
    ).toBeVisible();
  });

  test('REG-009: Show an error for an incorrect OTP', async ({ page }) => {
    await registerPage.fillRegistrationForm({
      ...registrationData('invalid-otp'),
      acceptTerms: true,
    });
    await registerPage.submitForm();
    await registerPage.enterOtp('999999');

    // Generic wording is only accepted inside the OTP dialog, so unrelated
    // form-validation messages cannot make this test pass by accident.
    const otpError = registerPage.otpDialog
      .getByText(/ไม่ถูกต้อง|invalid|incorrect/i)
      .or(
        page.getByText(
          /รหัส OTP ไม่ถูกต้อง|OTP ไม่ถูกต้อง|Invalid OTP(?: code)?|Incorrect OTP/i,
        ),
      );
    await expect(otpError.first()).toBeVisible({ timeout: 10000 });
  });

  test('REG-010: Show an error for an expired OTP (mocked API)', async ({ page }) => {
    await registerPage.fillRegistrationForm({
      ...registrationData('expired-otp'),
      acceptTerms: true,
    });
    await registerPage.submitForm();
    await registerPage.waitForOtpVerification();

    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const url = request.url().toLowerCase();

      if (
        request.method() === 'POST' &&
        (url.includes('otp') || url.includes('verification') || url.includes('verify'))
      ) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            errorCode: 'OTP_EXPIRED',
            message: 'รหัส OTP หมดอายุ กรุณาขอรหัสใหม่อีกครั้ง',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await registerPage.enterOtp(TEST_CONFIG.fixedData.otp);

    const expiredError = registerPage.otpDialog
      .getByText(/หมดอายุ|expired/i)
      .or(
        page.getByText(
          /รหัส OTP หมดอายุ|หมดอายุ.*OTP|OTP.*หมดอายุ|OTP has expired|expired.*code/i,
        ),
      );
    await expect(expiredError.first()).toBeVisible({ timeout: 10000 });
  });

  test('REG-011: Register with valid details and FREE15DAY promo code', async ({ page }) => {
    const registration = registrationData('success');

    await registerPage.fillRegistrationForm({
      ...registration,
      promoCode: TEST_CONFIG.fixedData.promoCode,
      acceptTerms: true,
    });

    await expect(
      page.getByText(TEST_CONFIG.fixedData.promoCode, { exact: true }).first(),
    ).toBeVisible();
    await expect(registerPage.companyNameInput).toHaveValue(
      registration.companyName,
    );
    await expect(registerPage.termsCheckbox).toBeChecked();

    const registrationPath = new URL(TEST_CONFIG.baseUrl).pathname.toLowerCase();
    const successMessage = page.getByText(
      /สมัครสมาชิกสำเร็จ|ลงทะเบียนสำเร็จ|ยืนยันตัวตนสำเร็จ|ยินดีต้อนรับ|registration successful|successfully registered|welcome/i,
    );

    await registerPage.submitForm();
    await registerPage.enterOtp(TEST_CONFIG.fixedData.otp);

    await expect(registerPage.otpDialog).toBeHidden({ timeout: 15000 });
    await expect
      .poll(
        async () => {
          const currentPath = new URL(page.url()).pathname.toLowerCase();
          const redirected = currentPath !== registrationPath;
          const confirmationVisible = await successMessage
            .first()
            .isVisible()
            .catch(() => false);
          return redirected || confirmationVisible;
        },
        { timeout: 15000 },
      )
      .toBe(true);
  });
});

async function mockPromoRejection(page: Page, errorCode: string) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = request.url().toLowerCase();

    if (
      request.method() !== 'GET' &&
      (url.includes('promo') || url.includes('coupon') || url.includes('discount'))
    ) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: TEST_CONFIG.errorMessages.promoInvalid,
          code: errorCode,
        }),
      });
    } else {
      await route.continue();
    }
  });
}