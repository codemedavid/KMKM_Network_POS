#!/bin/bash

# Script to run the database migration for adding unique constraint to reference_number

echo "Running migration: Add unique constraint to reference_number..."

# You'll need to run this against your Supabase database
# Replace with your actual database connection details

# For Supabase CLI (if you have it installed):
# supabase db push --include-all

# For direct SQL execution (you'll need to run this in your Supabase dashboard):
echo "Please run the following SQL in your Supabase SQL Editor:"
echo ""
cat scripts/013_add_unique_constraint_to_reference_number.sql
echo ""
echo "Or copy the contents of scripts/013_add_unique_constraint_to_reference_number.sql"
echo "and paste it into your Supabase SQL Editor."
