export const USERNAME_MIN_BYTES = 3;
export const USERNAME_MAX_BYTES = 64;
export const EMAIL_MAX_BYTES = 254;
export const PASSWORD_MIN_BYTES = 6;
export const PASSWORD_MAX_BYTES = 1024;

export type AccountValidationError = 'username' | 'email' | 'password';

export const utf8ByteLength = (value: string): number => new TextEncoder().encode(value).length;

export const validateRegistrationFields = (username: string, password: string, email: string): AccountValidationError | null => {
	const usernameBytes = utf8ByteLength(username.trim());
	if (usernameBytes < USERNAME_MIN_BYTES || usernameBytes > USERNAME_MAX_BYTES) return 'username';
	const emailValue = email.trim();
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (utf8ByteLength(emailValue) > EMAIL_MAX_BYTES || !emailRegex.test(emailValue)) return 'email';
	const passwordBytes = utf8ByteLength(password);
	if (passwordBytes < PASSWORD_MIN_BYTES || passwordBytes > PASSWORD_MAX_BYTES) return 'password';
	return null;
};

export const validateLoginFields = (username: string, password: string): AccountValidationError | null => {
	if (utf8ByteLength(username.trim()) > USERNAME_MAX_BYTES) return 'username';
	if (utf8ByteLength(password) > PASSWORD_MAX_BYTES) return 'password';
	return null;
};
