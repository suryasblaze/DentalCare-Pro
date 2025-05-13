-- DB Function to generate token and prepare for Edge Function call
CREATE OR REPLACE FUNCTION public.handle_new_adjustment_request_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Important: Needs to operate potentially outside user's direct RLS for selecting approvers
AS $$
DECLARE
    v_raw_token TEXT;
    v_hashed_token TEXT; -- If you decide to hash tokens
    v_token_expiry TIMESTAMPTZ;
    v_approver_emails TEXT[];
    v_payload JSONB;
BEGIN
    -- Generate a unique token (simple UUID for now, consider more secure methods for production)
    v_raw_token := gen_random_uuid()::TEXT;
    -- If hashing: v_hashed_token := crypt(v_raw_token, gen_salt('bf')); -- Example using pgcrypto
    v_token_expiry := timezone('utc'::text, now()) + INTERVAL '48 hours'; -- Token valid for 48 hours

    -- Update the new request with the token and expiry
    UPDATE public.inventory_adjustment_requests
    SET approval_token = v_raw_token, -- Store raw token for simplicity, or v_hashed_token
        approval_token_expires_at = v_token_expiry
    WHERE id = NEW.id;

    -- Get emails of users with 'doctor' or 'owner' roles (or your defined approver roles)
    SELECT array_agg(u.email)
    INTO v_approver_emails
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE p.role IN ('doctor', 'owner'); -- Adjust roles as needed

    IF array_length(v_approver_emails, 1) > 0 THEN
        -- Prepare payload for the Edge Function
        v_payload := jsonb_build_object(
            'request_id', NEW.id,
            'item_name', (SELECT item_name FROM public.inventory_items WHERE id = NEW.inventory_item_id),
            'quantity_to_decrease', NEW.quantity_to_decrease,
            'reason', NEW.reason,
            'requester_name', (SELECT COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') FROM public.profiles WHERE id = NEW.requested_by_user_id),
            'notes', NEW.notes,
            'approval_token', v_raw_token, -- Send raw token for link generation
            'approver_emails', v_approver_emails
        );

        -- Asynchronously invoke the Edge Function
        -- The Edge Function 'send-adjustment-approval-email' needs to be created in your Supabase project
        PERFORM net.http_post(
            url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/send-adjustment-approval-email',
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || '<YOUR_SUPABASE_ANON_OR_SERVICE_ROLE_KEY>',
                'Content-Type', 'application/json'
            ),
            body := v_payload
        );
        -- Note: For net.http_post to work, the 'pg_net' extension must be enabled.
        -- Alternatively, use pg_tle for more robust HTTP calls or a message queue.
        -- A simpler approach if pg_net is complex is to have a listener on your backend (e.g., Node.js)
        -- that picks up new requests and sends emails.
    END IF;

    RETURN NEW;
END;
$$;

-- Drop the trigger if it exists, then recreate it
DROP TRIGGER IF EXISTS trigger_notify_approvers_on_new_adjustment_request ON public.inventory_adjustment_requests;

-- Trigger to call the function after a new adjustment request is inserted
CREATE TRIGGER trigger_notify_approvers_on_new_adjustment_request
AFTER INSERT ON public.inventory_adjustment_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_adjustment_request_notify();

COMMENT ON FUNCTION public.handle_new_adjustment_request_notify() IS 'Generates an approval token and triggers an Edge Function to notify approvers about a new inventory adjustment request.';
COMMENT ON TRIGGER trigger_notify_approvers_on_new_adjustment_request ON public.inventory_adjustment_requests IS 'After a new adjustment request is inserted, generates a token and calls a function to notify approvers.';
