import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { LoginForm } from '@/features/auth/LoginForm';
import { ApiRequestError } from '@/lib/api/client';

function renderForm(onSubmit: jest.Mock<Promise<void>> = jest.fn(async () => undefined)) {
  return {
    onSubmit,
    view: render(<LoginForm onSubmit={onSubmit} onBack={jest.fn()} onCreateAccount={jest.fn()} />),
  };
}

describe('LoginForm', () => {
  beforeEach(() => jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation());
  afterEach(() => jest.restoreAllMocks());

  it('validates empty and malformed fields before calling the API', async () => {
    const { onSubmit, view } = renderForm();
    await view;
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(screen.getByText('⚠ Digite seu e-mail.')).toBeTruthy();
    expect(screen.getByText('⚠ Digite sua senha.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('login-email'), 'ana@');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'whatever');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(screen.getByText('⚠ Digite um e-mail válido.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Digite um e-mail válido.',
    );
  });

  it('shows the invalid-credentials error state, announces it and re-enables the form', async () => {
    const onSubmit = jest.fn(async () => {
      throw new ApiRequestError('INVALID_CREDENTIALS', 'nope', 401);
    });
    const { view } = renderForm(onSubmit);
    await view;
    await fireEvent.changeText(screen.getByTestId('login-email'), 'ana@example.com');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'wrong-password');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'wrong-password' });
    expect(await screen.findByTestId('login-password-error')).toHaveTextContent(
      '⚠ E-mail ou senha incorretos',
    );
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'E-mail ou senha incorretos',
    );
    expect(screen.getByTestId('login-submit')).not.toBeDisabled();
  });

  it('disables the form while signing in', async () => {
    let finish!: () => void;
    const onSubmit = jest.fn(() => new Promise<void>((r) => (finish = r)));
    const { view } = renderForm(onSubmit);
    await view;
    await fireEvent.changeText(screen.getByTestId('login-email'), 'ana@example.com');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'secret-password');
    // Not awaited: the press handler stays pending until the sign-in resolves.
    const pressed = fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(screen.getByTestId('login-submit')).toBeDisabled());
    expect(screen.getByTestId('login-submit')).toBeBusy();
    expect(screen.getByTestId('login-email').props.editable).toBe(false);
    finish();
    await pressed;
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('toggles password visibility with an accessible control', async () => {
    const { view } = renderForm();
    await view;
    expect(screen.getByTestId('login-password').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByLabelText('Mostrar senha'));
    expect(screen.getByTestId('login-password').props.secureTextEntry).toBe(false);
    expect(screen.getByLabelText('Ocultar senha')).toBeTruthy();
  });

  it('maps rate limiting and offline errors', async () => {
    const errors = [
      new ApiRequestError('RATE_LIMITED', 'x', 429),
      new ApiRequestError('NETWORK_ERROR', 'x', 0),
    ];
    const onSubmit = jest.fn(async () => {
      throw errors.shift();
    });
    const { view } = renderForm(onSubmit);
    await view;
    await fireEvent.changeText(screen.getByTestId('login-email'), 'ana@example.com');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'secret-password');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText(/Muitas tentativas/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText(/Sem conexão/)).toBeTruthy();
  });
});
