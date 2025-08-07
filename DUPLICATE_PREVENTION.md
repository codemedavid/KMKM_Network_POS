# Duplicate Receipt Prevention

This document explains the duplicate prevention system implemented for receipt uploads in the GCash POS application.

## Overview

The system prevents duplicate receipts by ensuring that each reference number can only be used once across all agents. This prevents:

1. **Accidental duplicate uploads** - Same receipt uploaded multiple times
2. **Cross-agent duplicates** - Different agents uploading the same receipt
3. **Data integrity issues** - Inconsistent commission calculations

## Implementation

### Database Level

1. **Unique Constraint**: Added a unique constraint on the `reference_number` column in the `receipts` table
2. **Index**: Added an index for faster lookups by reference number
3. **Migration**: Created migration script `scripts/013_add_unique_constraint_to_reference_number.sql`

### Application Level

1. **Real-time Validation**: Checks reference numbers as users type (with 500ms debounce)
2. **Pre-save Validation**: Double-checks for duplicates before saving
3. **Error Handling**: Graceful handling of database constraint violations
4. **User Feedback**: Clear visual indicators and error messages

## Features

### Real-time Reference Number Checking

- **Visual Indicators**: 
  - Green checkmark for available reference numbers
  - Red warning for duplicate reference numbers
  - Loading spinner while checking
- **Status Messages**: Clear feedback about reference number availability
- **Debounced**: Waits 500ms after user stops typing to avoid excessive API calls

### Duplicate Detection

- **Own Receipts**: Detects if the current user has already uploaded the same receipt
- **Other Agents**: Detects if another agent has already uploaded the same receipt
- **Different Messages**: Provides appropriate feedback based on the type of duplicate

### Save Prevention

- **Disabled Button**: Save button is disabled when a duplicate is detected
- **Pre-save Check**: Additional validation before attempting to save
- **Database Error Handling**: Handles race conditions and constraint violations

## Database Migration

To apply the database changes:

1. **Run the migration script**:
   ```bash
   ./scripts/run_migration_013.sh
   ```

2. **Or manually execute** in your Supabase SQL Editor:
   ```sql
   -- Copy contents from scripts/013_add_unique_constraint_to_reference_number.sql
   ```

## User Experience

### When Uploading a New Receipt

1. **Type Reference Number**: User enters the reference number
2. **Real-time Check**: System checks availability after 500ms
3. **Visual Feedback**: 
   - ✅ Green border and checkmark for available numbers
   - ⚠️ Red border and warning for duplicates
4. **Save Button**: Enabled only for valid, non-duplicate reference numbers

### When Duplicate is Detected

1. **Own Receipt**: "You have already uploaded this receipt"
2. **Other Agent**: "This reference number has already been used by another agent"
3. **Save Blocked**: Save button remains disabled
4. **Clear Option**: User can clear and try a different receipt

### Error Handling

1. **Network Issues**: Graceful fallback if real-time check fails
2. **Race Conditions**: Database constraint handles simultaneous uploads
3. **Clear Messages**: User-friendly error messages for all scenarios

## Technical Details

### Database Schema Changes

```sql
-- Add unique constraint
ALTER TABLE public.receipts 
ADD CONSTRAINT receipts_reference_number_unique 
UNIQUE (reference_number);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_receipts_reference_number 
ON public.receipts (reference_number);
```

### Component State

```typescript
interface ReferenceNumberStatus {
  checking: boolean
  isDuplicate: boolean
  message: string
}
```

### API Endpoints Used

- `GET /receipts?reference_number=eq.{ref}` - Check for existing reference numbers
- `POST /receipts` - Save new receipt (with constraint validation)

## Benefits

1. **Data Integrity**: Prevents duplicate entries in the database
2. **User Experience**: Clear feedback prevents confusion
3. **Performance**: Efficient checking with debouncing and indexing
4. **Reliability**: Multiple layers of validation (client + server + database)
5. **Scalability**: Works across multiple agents and concurrent uploads

## Future Enhancements

1. **Bulk Upload**: Support for checking multiple receipts at once
2. **Advanced Matching**: Fuzzy matching for similar reference numbers
3. **Audit Trail**: Track duplicate attempts for analytics
4. **Admin Override**: Allow admins to handle edge cases
5. **Notification System**: Alert users about potential duplicates before upload
