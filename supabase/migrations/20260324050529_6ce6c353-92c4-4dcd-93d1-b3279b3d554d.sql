CREATE OR REPLACE FUNCTION public.enforce_free_enrollment()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.payment_status := 'free';
  NEW.payment_mode := NULL;
  NEW.paid_at := NULL;
  NEW.payment_amount := NULL;
  NEW.razorpay_payment_id := NULL;
  NEW.razorpay_order_id := NULL;
  RETURN NEW;
END;
$$;