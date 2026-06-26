import DOMPurify from 'dompurify';

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input - The user input to sanitize
 * @returns Sanitized string safe for rendering
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // FIX: Sanitize user input to prevent XSS attacks
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], // Remove all HTML tags
    ALLOWED_ATTR: [] // Remove all attributes
  });
};

/**
 * Sanitizes HTML content while preserving safe formatting
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML safe for rendering
 */
export const sanitizeHTML = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // FIX: Sanitize HTML while preserving safe formatting
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};
