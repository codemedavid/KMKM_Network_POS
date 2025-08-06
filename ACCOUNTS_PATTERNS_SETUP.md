# Accounts & Patterns Setup Guide

This guide explains how to set up and use the new multiple accounts and custom extraction patterns feature.

## 🚀 Database Setup

Run the following SQL scripts in your Supabase database:

### 1. Create Payment Accounts Table
```bash
# Run this script in Supabase SQL Editor
./scripts/011_create_payment_accounts_table.sql
```

### 2. Create Extraction Patterns Table
```bash
# Run this script in Supabase SQL Editor
./scripts/012_create_extraction_patterns_table.sql
```

## 📱 Accessing the Management Interface

1. Log in as an **Admin** user
2. Navigate to **Accounts** in the main navigation
3. You'll see two tabs:
   - **Payment Accounts**: Manage GCash, bank accounts, etc.
   - **Extraction Patterns**: Customize OCR patterns

## 💳 Managing Payment Accounts

### Adding a New Account

1. Click **"Add Account"** button
2. Fill in the details:
   - **Account Type**: Choose from GCash, PayMaya, Bank Transfer, etc.
   - **Account Name**: Display name (e.g., "Business GCash")
   - **Account Number**: Phone number or account number
   - **Account Holder Name**: Name on the account
   - **Active**: Enable/disable the account
   - **Primary**: Set as primary account for this type

### Account Types Supported

- **GCash**: Mobile wallet payments
- **PayMaya**: Digital wallet
- **GrabPay**: Ride-hailing wallet
- **Bank Transfer**: Traditional bank accounts
- **Cryptocurrency**: Digital currency payments
- **Other**: Custom payment methods

## 🎯 Managing Extraction Patterns

### Adding a Custom Pattern

1. Go to **Extraction Patterns** tab
2. Click **"Add Pattern"** button
3. Configure the pattern:
   - **Pattern Name**: Descriptive name
   - **Account Type**: Which payment method this pattern handles
   - **Provider Name**: Specific provider (optional)
   - **Priority**: Lower number = higher priority
   - **Description**: When to use this pattern

### Regex Patterns

Configure these regex patterns for data extraction:

- **Amount Pattern**: `(?:Amount|Total)\\s*[£₱]?\\s*([0-9,]+\\.?[0-9]*)`
- **Reference Pattern**: `(?:Ref No\\.|Reference)\\s*([0-9]+)`
- **Date Pattern**: `([A-Za-z]{3}\\s+[0-9]{1,2},\\s+[0-9]{4}\\s+[0-9]{1,2}:[0-9]{2}\\s*[AP]M)`
- **Sender Pattern**: `(?:From|Sender)[:\\s]*([A-Za-z\\s]+)`
- **Receiver Pattern**: `(?:To|Receiver)[:\\s]*([A-Za-z\\s]+)`
- **Phone Pattern**: `(\\+63\\s*[0-9]{3}\\s*[0-9]{3}\\s*[0-9]{4}|09[0-9]{9})`

### Default Patterns Included

The system comes with pre-configured patterns for:

1. **GCash Standard Format** (Priority: 10)
2. **Bank Transfer Format** (Priority: 20)  
3. **PayMaya Format** (Priority: 15)

## 🔄 How It Works

### Receipt Processing Flow

1. **Image Capture**: User scans receipt with mobile camera
2. **OCR Processing**: Text extraction using Tesseract.js
3. **Pattern Matching**: System tries each active pattern by priority
4. **Account Validation**: Checks if extracted account matches configured accounts
5. **Data Display**: Shows matched pattern and account information
6. **Commission Calculation**: Uses standard rates with extracted data

### Enhanced Features

- **Multi-Provider Support**: Handle receipts from different payment providers
- **Smart Validation**: Automatic account verification against your configured accounts
- **Pattern Priority**: Higher priority patterns are tried first
- **Detailed Feedback**: Shows which pattern and account were matched
- **Fallback Support**: Falls back to basic extraction if no patterns match

## 🛠️ Advanced Configuration

### Custom Account Types

You can add custom account types by:
1. Adding them to the `accountTypes` array in the component
2. Creating corresponding extraction patterns
3. Testing with real receipts

### Pattern Testing

1. Add a test pattern with high priority
2. Use the mobile interface to scan a receipt
3. Check the "Detection Info" panel to see which pattern was used
4. Adjust regex patterns as needed

### Performance Optimization

- **Disable unused patterns** to improve processing speed
- **Set appropriate priorities** to try most likely patterns first
- **Use specific patterns** for known receipt formats

## 🔍 Troubleshooting

### Pattern Not Matching

1. Check if the pattern is **Active**
2. Verify the **regex syntax** is correct
3. Test the pattern with actual receipt text
4. Adjust the **priority** if needed

### Account Not Validating

1. Ensure the account is **Active**
2. Check the **account number format** matches exactly
3. Verify the **account type** matches the pattern type

### Poor OCR Results

1. Ensure good lighting when scanning
2. Hold the camera steady
3. Try manual entry if OCR fails
4. Consider creating more specific patterns for your receipt formats

## 📊 Benefits

- **Flexibility**: Support multiple payment methods
- **Accuracy**: Better validation with account matching
- **Scalability**: Easy to add new providers and formats
- **Transparency**: Clear feedback on what was detected
- **Control**: Full admin control over supported accounts and patterns