# Supabase Setup for TapTapSend

## Email OTP Configuration

To enable 6-digit OTP codes instead of confirmation links, you need to configure Supabase:

### 1. Enable Email OTP in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Providers** > **Email**
3. Enable **"Enable email confirmations"** 
4. Set **"Confirm email"** to `false` (we'll handle verification via OTP)
5. Enable **"Enable custom SMTP"** if you want to customize email templates

### 2. Configure Email Template (Optional)

1. Go to **Authentication** > **Email Templates**
2. Select **"Magic Link"** template (this is used for OTP)
3. Customize the email template to show the 6-digit code clearly
4. The OTP code will be available in the template as `{{ .Token }}` or `{{ .TokenHash }}`

### 3. Environment Variables

Make sure your `.env` file contains:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup

Run the SQL in `supabase_schema.sql` to create the profiles table:

```sql
-- Run this in Supabase SQL Editor
-- See supabase_schema.sql for full SQL
```

### 5. How It Works

1. User enters email and password in Steps 1-2
2. System sends OTP code via `signInWithOtp` (creates user if doesn't exist)
3. User enters 6-digit OTP code in Step 3
4. System verifies OTP with `verifyOtp`
5. After verification, password is set and profile is created

### Notes

- The OTP code is sent via email automatically by Supabase
- OTP codes expire after a set time (default: 1 hour)
- Users can request a new code using the "Resend Code" button
- The password is set after OTP verification to ensure email ownership

