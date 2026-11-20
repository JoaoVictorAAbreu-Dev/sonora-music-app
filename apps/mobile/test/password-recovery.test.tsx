import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ForgotPasswordForm, RESEND_SECONDS } from '@/features/auth/ForgotPasswordForm';
import { ResetPasswordForm } from '@/features/auth/ResetPasswordForm';
import { ApiRequestError } from '@/lib/api/client';

const TOKEN = 'x'.repeat(43);

describe('T04 Recuperar senha', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('validates the e-mail before sending', async () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    await render(<ForgotPasswordForm onSubmit={onSubmit} onBack={jest.fn()} />);
    await fireEvent.changeText(screen.getByTestId('forgot-email'), 'ana@');
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('⚠ Digite um e-mail válido.')).toBeOnTheScreen();
  });

  it('shows "Verifique seu e-mail" and unlocks resend after the countdown', async () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    await render(<ForgotPasswordForm onSubmit={onSubmit} onBack={jest.fn()} />);
    await fireEvent.changeText(screen.getByTestId('forgot-email'), ' ana@exemplo.com ');
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(onSubmit).toHaveBeenCalledWith('ana@exemplo.com');
    expect(await screen.findByTestId('forgot-sent')).toBeOnTheScreen();
    expect(screen.getByText(`Reenviar em ${RESEND_SECONDS} s`)).toBeOnTheScreen();
    expect(screen.getByTestId('forgot-resend')).toBeDisabled();
    for (let i = 0; i < RESEND_SECONDS; i += 1) {
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(screen.getByTestId('forgot-resend')).not.toBeDisabled();
    await fireEvent.press(screen.getByTestId('forgot-resend'));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('shows rate limiting from the API', async () => {
    const onSubmit = jest.fn(() => Promise.reject(new ApiRequestError('RATE_LIMITED', 'x', 429)));
    await render(<ForgotPasswordForm onSubmit={onSubmit} onBack={jest.fn()} />);
    await fireEvent.changeText(screen.getByTestId('forgot-email'), 'ana@exemplo.com');
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(await screen.findByText(/Muitas tentativas/)).toBeOnTheScreen();
  });
});

describe('Nova senha (reset link)', () => {
  const setup = async (token: string | undefined, onSubmit = jest.fn(() => Promise.resolve())) => {
    const onDone = jest.fn();
    const onRequestNewLink = jest.fn();
    await render(
      <ResetPasswordForm
        token={token}
        onSubmit={onSubmit}
        onDone={onDone}
        onRequestNewLink={onRequestNewLink}
      />,
    );
    return { onSubmit, onDone, onRequestNewLink };
  };

  it('checks the rules and the confirmation, then saves', async () => {
    const { onSubmit, onDone } = await setup(TOKEN);
    await fireEvent.changeText(screen.getByTestId('reset-password'), 'violet-harbor-lantern-42');
    await fireEvent.changeText(screen.getByTestId('reset-confirm'), 'violet-harbor-lantern-43');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(screen.getByText('⚠ As senhas não coincidem.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('reset-confirm'), 'violet-harbor-lantern-42');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(onSubmit).toHaveBeenCalledWith(TOKEN, 'violet-harbor-lantern-42');
    expect(onDone).toHaveBeenCalled();
  });

  it('offers a new link when the token is missing or expired', async () => {
    const expired = jest.fn(() =>
      Promise.reject(new ApiRequestError('RESET_TOKEN_INVALID', 'x', 400)),
    );
    const { onRequestNewLink } = await setup(TOKEN, expired);
    await fireEvent.changeText(screen.getByTestId('reset-password'), 'violet-harbor-lantern-42');
    await fireEvent.changeText(screen.getByTestId('reset-confirm'), 'violet-harbor-lantern-42');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(await screen.findByTestId('reset-expired')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('reset-new-link'));
    expect(onRequestNewLink).toHaveBeenCalled();
  });

  it('starts expired without a token', async () => {
    await setup(undefined);
    expect(screen.getByTestId('reset-expired')).toBeOnTheScreen();
  });
});
