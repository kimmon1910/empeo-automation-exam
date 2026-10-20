import { expect, type Locator, type Page } from '@playwright/test';

export const TEST_CONFIG = {
  baseUrl: 'https://portal.uat.gofive.co.th/Register/empeo',
  fixedData: {
    companyName: 'Gofive Company Limited',
    firstName: 'Somchai',
    lastName: 'Jaidee',
    email: 'somchai.test@gmail.com',
    businessType: 'เทคโนโลยี',
    userSize: '1-20',
    phone: '0967690708',
    otp: '123456',
    promoCode: 'FREE15DAY',
  },
  errorMessages: {
    companyRequired: 'กรุณากรอกเลขประจำตัวผู้เสียภาษีหรือชื่อบริษัท',
    companyRequiredGeneric: 'กรุณากรอกข้อมูลที่จำเป็นทั้งหมด',
    businessTypeRequired: 'กรุณากรอกประเภทธุรกิจ',
    userSizeRequired: 'กรุณากรอกผู้ใช้งาน',
    emailRequired: 'กรุณากรอกอีเมล',
    emailInvalid: 'กรุณาใส่อีเมลที่ถูกต้อง',
    firstNameRequired: 'กรุณากรอกชื่อ',
    lastNameRequired: 'กรุณากรอกนามสกุล',
    phoneRequired: 'กรุณากรอกเบอร์โทรศัพท์มือถือ',
    phoneInvalid: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง',
    termsRequired:
      'กรุณารับทราบนโยบายความเป็นส่วนตัว และข้อกำหนดและเงื่อนไขการใช้งาน',
    promoInvalid: 'คูปองโค้ดไม่ถูกต้อง',
  },
};

type RegistrationOverrides = Partial<{
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  businessType: string;
  userSize: string;
  phone: string;
  promoCode: string;
  acceptTerms: boolean;
}>;

export class EmpeoRegisterPage {
  readonly page: Page;
  readonly headerTitle: Locator;
  readonly companyNameInput: Locator;
  readonly otherCompanyRadio: Locator;
  readonly businessTypeDropdown: Locator;
  readonly userSizeDropdown: Locator;
  readonly emailInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly phoneInput: Locator;
  readonly promoTriggerLink: Locator;
  readonly promoInput: Locator;
  readonly promoApplyButton: Locator;
  readonly termsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly otpDialog: Locator;
  readonly otpInputs: Locator;
  readonly otpVerifyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.headerTitle = page.getByText('ทดลองใช้งาน empeo ฟรี!');

    this.companyNameInput = page.locator(
      'input[placeholder="ชื่อบริษัท*"]:visible, ' +
        'input[placeholder="กรอกเลขประจำตัวผู้เสียภาษี หรือ ชื่อบริษัท"]:visible',
    );
    this.otherCompanyRadio = page.getByRole('radio').nth(1);

    this.businessTypeDropdown = page
      .locator('.go5-dropdown-selection-input')
      .filter({ hasText: 'ประเภทธุรกิจ*' });
    this.userSizeDropdown = page
      .locator('.go5-dropdown-selection-input')
      .filter({ hasText: 'ผู้ใช้งาน*' });

    this.emailInput = page.getByPlaceholder('อีเมล*');
    this.firstNameInput = page.getByPlaceholder('ชื่อ*', { exact: true });
    this.lastNameInput = page.getByPlaceholder('นามสกุล*');
    this.phoneInput = page.getByPlaceholder('เบอร์มือถือ*');

    this.promoTriggerLink = page.getByText('ใช้โค้ดส่วนลด');
    this.promoInput = page.getByPlaceholder('รหัสส่วนลด');
    this.promoApplyButton = page
      .getByRole('button', { name: 'ใช้โค้ด' })
      .or(page.getByText('ใช้โค้ด', { exact: true }));

    this.termsCheckbox = page.getByTestId(
      'input_checkbox_registration_checkbox',
    );
    this.submitButton = page.getByTestId(
      'button_submit_registration_try_for_free',
    );

    this.otpDialog = page.locator('.otp-modal');
    this.otpInputs = page
      .getByTestId('input_text_registration_otp_Config')
      .locator('input.otp-input');
    this.otpVerifyButton = page.getByTestId(
      'button_button_registration_verify',
    );
  }

  async goto() {
    await this.page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'domcontentloaded' });
    await expect(this.headerTitle).toBeVisible({ timeout: 15000 });
  }

  private async typeInto(locator: Locator, fieldName: string, value: string) {
    await expect(locator, `${fieldName} input should be visible`).toBeVisible({
      timeout: 10000,
    });
    await locator.fill(value);
  }

  private async firstVisible(locator: Locator): Promise<Locator | null> {
    const count = await locator.count();
    for (let index = count - 1; index >= 0; index--) {
      const candidate = locator.nth(index);
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }
    return null;
  }

  private async clickExactTextWithRetry(
    text: string,
    description: string,
    attempts = 4,
  ) {
    const textLocator = this.page.getByText(text, { exact: true });
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const candidate = await this.firstVisible(textLocator);
      if (candidate) {
        try {
          await candidate.click({ timeout: 2500 });
          return;
        } catch (error) {
          lastError = error;
        }
      }
      if (attempt < attempts) await this.page.waitForTimeout(200);
    }

    throw new Error(
      `Could not click ${description} "${text}". Last error: ${String(lastError)}`,
    );
  }

  private async selectCustomDropdown(
    dropdown: Locator,
    optionText: string,
    fieldName: string,
  ) {
    const selectedControl = this.page
      .locator('.go5-dropdown-selection-input')
      .filter({ hasText: optionText });

    if (await selectedControl.isVisible().catch(() => false)) return;

    await expect(dropdown, `${fieldName} dropdown should be visible`).toBeVisible({
      timeout: 10000,
    });
    await dropdown.click();

    const roleOption = this.page.getByRole('option', {
      name: optionText,
      exact: true,
    });
    let lastError: unknown;

    for (let attempt = 1; attempt <= 4; attempt++) {
      const visibleRoleOption = await this.firstVisible(roleOption);

      try {
        if (visibleRoleOption) {
          await visibleRoleOption.click({ timeout: 2500 });
        } else {
          await this.clickExactTextWithRetry(optionText, `${fieldName} option`, 2);
        }
        await expect(selectedControl).toBeVisible({ timeout: 2500 });
        return;
      } catch (error) {
        lastError = error;
        if (await selectedControl.isVisible().catch(() => false)) return;
        if (attempt < 4) {
          const optionVisible = await this.firstVisible(
            this.page.getByText(optionText, { exact: true }),
          );
          if (!optionVisible && await dropdown.isVisible().catch(() => false)) {
            await dropdown.click().catch(() => undefined);
          }
          await this.page.waitForTimeout(200);
        }
      }
    }

    throw new Error(
      `${fieldName} option "${optionText}" could not be selected. ` +
        `Last error: ${String(lastError)}`,
    );
  }

  async selectBusinessType(optionText: string) {
    await this.selectCustomDropdown(
      this.businessTypeDropdown,
      optionText,
      'Business Type',
    );
  }

  async selectUserSize(sizeText: string) {
    await this.selectCustomDropdown(this.userSizeDropdown, sizeText, 'User Size');
  }

  async selectOtherCompanyMode() {
    await expect(this.otherCompanyRadio).toBeVisible({ timeout: 10000 });
    if (!(await this.otherCompanyRadio.isChecked().catch(() => false))) {
      await this.otherCompanyRadio.check();
    }
    await expect(this.otherCompanyRadio).toBeChecked();
  }

  async fillCompanyName(companyName: string) {
    await this.typeInto(this.companyNameInput, 'Company Name', companyName);
    await this.companyNameInput.press('Tab');
    await expect(this.companyNameInput).toHaveValue(companyName);
  }

  async applyPromoCode(code: string) {
    if (!(await this.promoInput.isVisible().catch(() => false))) {
      await expect(this.promoTriggerLink).toBeVisible({ timeout: 10000 });
      await this.promoTriggerLink.click();
    }

    await this.typeInto(this.promoInput, 'Promo Code', code);
    await expect(this.promoApplyButton).toBeVisible({ timeout: 10000 });
    await this.promoApplyButton.click();

    const appliedCode = this.page.getByText(code, { exact: true }).first();
    const promoError = this.page
      .getByText(TEST_CONFIG.errorMessages.promoInvalid, { exact: true })
      .first();

    await expect
      .poll(
        async () =>
          (await appliedCode.isVisible().catch(() => false)) ||
          (await promoError.isVisible().catch(() => false)),
        { timeout: 10000 },
      )
      .toBe(true);
  }

  async acceptTerms() {
    if (!(await this.termsCheckbox.isChecked().catch(() => false))) {
      await this.termsCheckbox.check();
    }
    await expect(this.termsCheckbox).toBeChecked();
  }

  async fillRegistrationForm(overrides: RegistrationOverrides = {}) {
    const data = {
      companyName: TEST_CONFIG.fixedData.companyName,
      firstName: TEST_CONFIG.fixedData.firstName,
      lastName: TEST_CONFIG.fixedData.lastName,
      email: TEST_CONFIG.fixedData.email,
      businessType: TEST_CONFIG.fixedData.businessType,
      userSize: TEST_CONFIG.fixedData.userSize,
      phone: TEST_CONFIG.fixedData.phone,
      acceptTerms: true,
      ...overrides,
    };

    await this.selectOtherCompanyMode();
    await this.selectBusinessType(data.businessType);
    await this.selectUserSize(data.userSize);
    await this.typeInto(this.emailInput, 'Email', data.email);
    await this.typeInto(this.firstNameInput, 'First Name', data.firstName);
    await this.typeInto(this.lastNameInput, 'Last Name', data.lastName);
    await this.typeInto(this.phoneInput, 'Phone Number', data.phone);

    if (data.promoCode) await this.applyPromoCode(data.promoCode);
    if (data.acceptTerms) await this.acceptTerms();

    await this.fillCompanyName(data.companyName);
    await expect(this.companyNameInput).toHaveValue(data.companyName);
  }

  async submitForm() {
    await expect(this.termsCheckbox).toBeChecked();
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
  }

  async waitForOtpVerification() {
    const validationTexts = [
      TEST_CONFIG.errorMessages.companyRequired,
      TEST_CONFIG.errorMessages.companyRequiredGeneric,
      TEST_CONFIG.errorMessages.businessTypeRequired,
      TEST_CONFIG.errorMessages.userSizeRequired,
      TEST_CONFIG.errorMessages.emailRequired,
      TEST_CONFIG.errorMessages.firstNameRequired,
      TEST_CONFIG.errorMessages.lastNameRequired,
      TEST_CONFIG.errorMessages.phoneRequired,
    ];

    await expect
      .poll(
        async () => {
          if (await this.otpDialog.isVisible().catch(() => false)) return 'otp';
          for (const message of validationTexts) {
            if (
              await this.page
                .getByText(message, { exact: true })
                .first()
                .isVisible()
                .catch(() => false)
            ) {
              return `validation:${message}`;
            }
          }
          return 'waiting';
        },
        { timeout: 15000 },
      )
      .not.toBe('waiting');

    if (!(await this.otpDialog.isVisible().catch(() => false))) {
      const visibleErrors: string[] = [];
      for (const message of validationTexts) {
        if (
          await this.page
            .getByText(message, { exact: true })
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          visibleErrors.push(message);
        }
      }
      throw new Error(
        'OTP popup did not open. Registration validation: ' +
          (visibleErrors.join('; ') || 'No known validation message detected.'),
      );
    }

    await expect(this.otpInputs).toHaveCount(6, { timeout: 10000 });
    await expect(this.otpInputs.first()).toBeVisible();
  }

  async enterOtp(otp: string) {
    if (!/^\d{6}$/.test(otp)) {
      throw new Error('OTP must contain exactly six digits.');
    }

    await this.waitForOtpVerification();

    for (let index = 0; index < 6; index++) {
      const input = this.otpInputs.nth(index);
      await input.click();
      await input.pressSequentially(otp[index], { delay: 80 });
    }

    for (let index = 0; index < 6; index++) {
      await expect(this.otpInputs.nth(index)).toHaveValue(otp[index]);
    }

    await expect(this.otpVerifyButton).toBeEnabled({ timeout: 10000 });
    await this.otpVerifyButton.click();
  }
}
