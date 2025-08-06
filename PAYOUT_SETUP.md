# Payout Confirmation Feature Setup

## Overview
The payout confirmation feature has been added to provide detailed tracking and confirmation for agent commission payouts.

## Database Setup Required

Run the following SQL script in your Supabase SQL editor to set up the payouts table:

```sql
-- Create a table for tracking commission payouts
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payout_amount numeric NOT NULL,
  payout_method text NOT NULL,
  reference_number text NOT NULL,
  payout_date timestamp with time zone NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL -- Admin who processed the payout
);

-- Enable Row Level Security (RLS) for the payouts table
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Policy for agents: can view their own payouts
CREATE POLICY "Agents can view their own payouts."
  ON public.payouts FOR SELECT
  USING (auth.uid() = agent_id);

-- Policy for admins: can view all payouts and create new ones
CREATE POLICY "Admins can view all payouts."
  ON public.payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND (raw_app_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "Admins can create payouts."
  ON public.payouts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND (raw_app_meta_data->>'role')::text = 'admin'
    )
  );

-- Add indexes for better performance
CREATE INDEX ON public.payouts (agent_id);
CREATE INDEX ON public.payouts (payout_date);
CREATE INDEX ON public.payouts (created_at);
```

## Features Added

### 1. Payout Confirmation Dialog
- **Location**: `components/payout-confirmation-dialog.tsx`
- **Purpose**: Provides a detailed form for confirming commission payouts
- **Features**:
  - Payout amount (pre-filled with total commission)
  - Payment method selection (GCash, Bank Transfer, Cash, PayMaya, Other)
  - Reference number (required)
  - Payout date and time
  - Optional notes
  - Form validation and error handling
  - Success confirmation

### 2. Enhanced Analytics Dashboard
- **Updated**: `components/analytics-dashboard.tsx`
- **Changes**:
  - "Mark as Paid" button now opens confirmation dialog
  - Detailed payout tracking with audit trail
  - Better error handling

### 3. Enhanced Server Actions
- **Updated**: `actions/admin.ts`
- **New Functions**:
  - `markAgentCommissionPaid()` - Enhanced with payout details
  - `markAgentCommissionPaidSimple()` - Legacy simple version
  - `getAgentPayoutHistory()` - Retrieve payout history
- **Features**:
  - Creates detailed payout records
  - Tracks who processed the payout (admin)
  - Maintains audit trail

### 4. Database Schema
- **New Table**: `payouts`
- **Purpose**: Track all commission payouts with full audit trail
- **Fields**:
  - `id` - Unique payout identifier
  - `agent_id` - Reference to the agent
  - `payout_amount` - Amount paid out
  - `payout_method` - Payment method used
  - `reference_number` - Transaction reference
  - `payout_date` - When the payout was made
  - `notes` - Optional notes
  - `created_at` - When the record was created
  - `created_by` - Admin who processed the payout

## Usage

### For Admins:
1. Go to Analytics Dashboard
2. View the "Agent Earnings" table
3. Click "Mark as Paid" for any agent with pending commission
4. Fill out the payout confirmation form:
   - Verify payout amount
   - Select payment method
   - Enter reference number (transaction ID, etc.)
   - Set payout date/time
   - Add optional notes
5. Click "Confirm Payout"
6. The system will:
   - Create a payout record
   - Mark all unpaid commissions as paid
   - Update the dashboard

### For Agents:
- Agents can view their payout history (future feature)
- Commission status automatically updates when payout is confirmed

## Security Features
- Row Level Security (RLS) policies ensure data isolation
- Only admins can create payout records
- Agents can only view their own payout history
- Full audit trail with admin tracking

## Future Enhancements
- Payout history view for agents
- Bulk payout processing
- Export payout reports
- Email notifications for payout confirmations
- Integration with accounting systems