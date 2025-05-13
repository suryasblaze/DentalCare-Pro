ALTER TABLE public.inventory_adjustment_requests
ADD COLUMN custom_approver_emails TEXT[] NULL;

COMMENT ON COLUMN public.inventory_adjustment_requests.custom_approver_emails
IS 'Array of email addresses for custom approvers of this request.';
