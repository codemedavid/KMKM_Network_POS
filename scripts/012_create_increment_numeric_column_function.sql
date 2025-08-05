-- Create a function to atomically increment a numeric column
CREATE OR REPLACE FUNCTION public.increment_numeric_column(
    table_name TEXT,
    column_name TEXT,
    row_id UUID,
    increment_value NUMERIC,
    id_column_name TEXT DEFAULT 'id'
)
RETURNS NUMERIC AS $$
DECLARE
    current_value NUMERIC;
    query TEXT;
BEGIN
    -- Get the current value of the column
    EXECUTE format('SELECT %I FROM public.%I WHERE %I = %L FOR UPDATE', column_name, table_name, id_column_name, row_id)
    INTO current_value;

    -- If the row or column doesn't exist, or current_value is null, initialize it to 0
    IF current_value IS NULL THEN
        current_value := 0;
    END IF;

    -- Increment the value
    current_value := current_value + increment_value;

    -- Update the column with the new value
    EXECUTE format('UPDATE public.%I SET %I = %L WHERE %I = %L', table_name, column_name, current_value, id_column_name, row_id);

    RETURN current_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
