import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SignUpForm, validateSignUp } from '@/features/auth/SignUpForm';
import { ApiRequestError } from '@/lib/api/client';

const valid = {
  email: 'ana@example.com',
  password: 'violet-harbor-lantern',
  confirm: 'violet-harbor-lantern',
  terms: true,
};

describe('validateSignUp', () => {
  it('accepts valid input', () => expect(validateSignUp(valid)).toEqual({}));
  it('reports each rule in Portuguese', () => {
    expect(validateSignUp({ ...valid, email: 'x' }).email).toBe('Digite um e-mail válido.');
    expect(validateSignUp({ ...valid, password: 'short1', confirm: 'short1' }).password).toBe(
      'A senha precisa ter ao menos 10 caracteres.',
    );
    expect(
      validateSignUp({ ...valid, password: 'Password123', confirm: 'Password123' }).password,
    ).toBe('Essa senha é muito comum. Escolha outra.');
    expect(validateSignUp({ ...valid, confirm: 'different-one' }).confirm).toBe(
      'As senhas não coincidem.',
    );
    expect(validateSignUp({ ...valid, terms: false }).terms).toMatch(/Aceite os Termos/);
  });
});

describe('SignUpForm', () => {
  beforeEach(() => jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation());
  afterEach(() => jest.restoreAllMocks());

  const setup = async (onSubmit: jest.Mock<Promise<void>> = jest.fn(async () => undefined)) => {
    await render(<SignUpForm onSubmit={onSubmit} onBack={jest.fn()} />);
    return onSubmit;
  };

  it('validates a field inline when the user leaves it', async () => {
    await setup();
    await fireEvent.changeText(screen.getByTestId('sign-up-password'), 'short');
    expect(screen.queryByTestId('sign-up-password-error')).toBeNull(); // not while typing
    await fireEvent(screen.getByTestId('sign-up-password'), 'blur');
    expect(screen.getByTestId('sign-up-password-error')).toHaveTextContent(
      /ao menos 10 caracteres/,
    );
    await fireEvent.changeText(screen.getByTestId('sign-up-password'), 'violet-harbor-lantern');
    expect(screen.queryByTestId('sign-up-password-error')).toBeNull(); // clears live once touched
  });

  it('blocks submit until everything is valid, including the terms switch', async () => {
    const onSubmit = await setup();
    await fireEvent.changeText(screen.getByTestId('sign-up-email'), valid.email);
    await fireEvent.changeText(screen.getByTestId('sign-up-password'), valid.password);
    await fireEvent.changeText(screen.getByTestId('sign-up-confirm'), valid.confirm);
    await fireEvent.press(screen.getByTestId('sign-up-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('sign-up-terms-error')).toBeTruthy();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).toBeChecked();
    await fireEvent.press(screen.getByTestId('sign-up-submit'));
    expect(onSubmit).toHaveBeenCalledWith({
      email: valid.email,
      password: valid.password,
      acceptTerms: true,
    });
  });

  it('shows EMAIL_TAKEN on the email field', async () => {
    await setup(
      jest.fn(async () => {
        throw new ApiRequestError('EMAIL_TAKEN', 'taken', 409);
      }),
    );
    await fireEvent.changeText(screen.getByTestId('sign-up-email'), valid.email);
    await fireEvent.changeText(screen.getByTestId('sign-up-password'), valid.password);
    await fireEvent.changeText(screen.getByTestId('sign-up-confirm'), valid.confirm);
    await fireEvent.press(screen.getByRole('switch'));
    await fireEvent.press(screen.getByTestId('sign-up-submit'));
    expect(await screen.findByTestId('sign-up-email-error')).toHaveTextContent(/já tem uma conta/);
  });
});
