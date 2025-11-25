# Security Policy

## Supported Versions

We support the latest version of NearbyChat with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Email security@nearbychat.app (or use your contact method)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Features

NearbyChat implements several security measures:

### Content Security Policy (CSP)
- Strict CSP headers prevent XSS attacks
- Script sources limited to self and inline (necessary for PWA)
- External resources blocked by default

### Input Validation & Sanitization
- All user inputs are validated and sanitized
- HTML tags are stripped from messages
- Length limits enforced (280 characters)
- Basic profanity filtering

### Rate Limiting
- Message sending rate limited to prevent spam
- Maximum 10 messages per minute per user
- 2-second minimum between messages

### Data Privacy
- All data stored locally in browser
- No server-side data collection
- Location data never transmitted externally
- Messages are ephemeral (24-hour retention)

### Authentication & Authorization
- No user accounts required (privacy-focused)
- Location permission explicitly requested
- User can opt for anonymous messaging

## Known Limitations

### Not Suitable for Production Without Backend
This is a frontend-only demonstration app. For production use, you would need:

1. **Proper Authentication System**
2. **Server-side Message Validation**
3. **Real-time Communication Infrastructure**
4. **Proper Content Moderation**
5. **HTTPS/TLS Encryption**
6. **Database Security**

### Browser Security Dependencies
- Relies on browser security sandbox
- Service worker security model
- Local storage encryption (limited)

## Recommended Security Enhancements

For production deployment, implement:

1. **End-to-end Encryption** for messages
2. **Server-side Content Filtering**
3. **User Reporting/Blocking System**
4. **IP-based Rate Limiting**
5. **CAPTCHA for Abuse Prevention**
6. **Audit Logging**
7. **Regular Security Audits**

## Compliance

Current implementation considers:
- GDPR (minimal data collection)
- COPPA (no age verification implemented)
- Local privacy laws (location data handling)

For commercial use, conduct proper legal review.