/**
 * Validates email address
 * @param email - Email to validate
 * @returns True if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Simple email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validates password strength
 * @param password - Password to validate
 * @returns Object with validation result and error message
 */
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'كلمة السر مطلوبة' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'كلمة السر يجب أن تكون 8 أحرف على الأقل' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'كلمة السر يجب أن تحتوي على حرف كبير واحد على الأقل' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'كلمة السر يجب أن تحتوي على حرف صغير واحد على الأقل' };
  }

  if (!/\d/.test(password)) {
    return { isValid: false, error: 'كلمة السر يجب أن تحتوي على رقم واحد على الأقل' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'كلمة السر يجب أن تحتوي على رمز خاص واحد على الأقل' };
  }

  return { isValid: true };
};

/**
 * Validates Saudi phone number
 * @param phone - Phone number to validate
 * @returns True if phone is valid Saudi number
 */
export const isValidSaudiPhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // FIX: Improved Saudi phone validation
  const cleanPhone = phone.replace(/\D/g, '');
  return /^9665\d{8}$/.test(cleanPhone) || /^5\d{8}$/.test(cleanPhone);
};

/**
 * Validates Saudi National ID
 * @param nationalId - National ID to validate
 * @returns True if National ID is valid
 */
export const isValidSaudiNationalId = (nationalId: string): boolean => {
  if (!nationalId || typeof nationalId !== 'string') {
    return false;
  }
  
  // FIX: Improved National ID validation
  const cleanId = nationalId.replace(/\D/g, '');
  return /^\d{10}$/.test(cleanId);
};
