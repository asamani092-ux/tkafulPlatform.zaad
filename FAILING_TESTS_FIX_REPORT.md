# Failing tests fix report (`fix/failing-tests`)

## Verdict

All **3** failures were **stale tests** after the configurable platform model (Zaad defaults: GPS off, payments off). **No ownership/IDOR regression** in `PaymentViewSet.get_queryset`. Full suite: **0 failures**.

| Test | Root cause | Classification | Fix |
|------|------------|----------------|-----|
| `UploadValidationTests.test_reject_invalid_gps` | Docs create skips GPS when `sponsorship_gps_documentation=False` (Zaad); invalid lat returned **201** | **Stale test** | Enable GPS flag in test; expect **400** when gated on |
| `PrivateMediaAndUploadPhase2Tests.test_gps_validators_unit_and_api` | Same gate | **Stale test** | Same |
| `SponsorshipIdorPhase2Tests.test_donor_b_cannot_get_donor_a_payment_list_item` | `pay/` returns **403** when `sponsorship_payments_enabled=False`; assertion never reached IDOR | **Stale test setup** (pay gate), ownership filter OK | Enable payments in class `setUp`; assert owner **200** + peer **403/404**; harden `check_object_permissions` |

## Decisions (config model)

1. **GPS** — config-gated via `sponsorship_gps_documentation` (`core.runtime_config.gps_documentation_enabled`). Zaad=off → coords stripped, no validation. When on → `validate_gps` must reject out-of-range. Tests enable the flag to assert the security path.
2. **Payments IDOR** — `pay/` correctly refuses when payments disabled. Ownership was already `qs.filter(sponsorship__donor=u)` for donors. Failure was inability to create a payment under Zaad defaults. Tests enable payments (same pattern as `ConcurrentPaymentTests`). Added explicit `check_object_permissions` defense-in-depth on `PaymentViewSet`.

## Security guarantees kept

- Invalid GPS rejected when documentation GPS is enabled.
- Donor B cannot retrieve donor A’s payment (`403`/`404`); donor A can (`200`).
- Payments remain off by default for Zaad; enabling is test-only / admin config.
