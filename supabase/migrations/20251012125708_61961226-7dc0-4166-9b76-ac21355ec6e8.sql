-- Normalize agent_collections due_amount to 90% of booking total and fix status with proper enum casts
WITH totals AS (
  SELECT ac.id,
         COALESCE(SUM(bi.amount), 0) AS booking_total
  FROM public.agent_collections ac
  JOIN public.bookings b ON b.id = ac.booking_id
  LEFT JOIN public.booking_items bi ON bi.booking_id = b.id
  GROUP BY ac.id
), new_values AS (
  SELECT t.id,
         ROUND(t.booking_total * 0.90, 2) AS new_due
  FROM totals t
)
UPDATE public.agent_collections ac
SET due_amount = nv.new_due,
    status = CASE WHEN ac.paid_amount >= nv.new_due THEN 'PAID'::collection_status ELSE 'PENDING'::collection_status END,
    paid_on = CASE WHEN ac.paid_amount >= nv.new_due THEN COALESCE(ac.paid_on, now()) ELSE NULL END
FROM new_values nv
WHERE ac.id = nv.id;