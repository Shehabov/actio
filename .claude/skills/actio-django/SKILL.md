---
name: actio-django
description: Build the Actio back end in Django and Django REST Framework. Use when writing models, migrations, serialisers, views, permissions, background tasks or tests for the Actio API, and when reviewing back-end code.
---

# Django and DRF for Actio

Conventions for this product, not general Django advice. The domain model and the system
invariants live in `actio-architecture`. This skill is how they are expressed in code.

---

## Layout

```
actio/
├── config/                settings, urls, asgi, celery
│   └── settings/          base.py · dev.py · prod.py
├── core/                  shared: base models, enums, exceptions, timezone helpers
├── organisations/         Organisation, Site, tenant configuration
├── people/                Employee, tenure bands, single-name support
├── surveys/               Cycle, Response, Cohort, the reporting threshold
├── issues/                Issue, Lane, Owner, Evidence, the state machine
├── protected/             ProtectedCase. Separate app, separate store, separate permission.
└── messaging/             WhatsApp, SMS, templates, delivery, idempotency
```

`protected/` is a separate app deliberately. A protected case is not an `Issue` with a
flag, because a flag can be forgotten in a filter and a separate model cannot.

---

## Fat models, thin views, rules in services

| Layer | Holds | Never holds |
|---|---|---|
| Model | Field-level invariants, `clean()`, guarded transitions, managers and querysets | Cross-entity orchestration, external calls |
| Manager / queryset | Every reporting and visibility rule, including the threshold | Presentation concerns |
| Service | Business operations that touch more than one model, or the outside world | HTTP concerns |
| Serialiser | Shape and validation of the wire format | Business rules |
| View | Auth, permission, delegate to a service, return | Anything a reader would call logic |

A view longer than about twenty lines is a finding. A business rule in a serialiser is a
finding, because serialisers are skipped by management commands and background tasks.

---

## The threshold, enforced in the query layer

**I1 and I2.** The rule is not "the view checks the threshold". The rule is that data
below the threshold cannot be reached at all, by any caller, through any code path.

```python
# surveys/managers.py
from django.db import models
from django.db.models import Count

REPORTING_FLOOR = 5   # constant, not a column. See ADR-004.


class CohortQuerySet(models.QuerySet):
    def reportable(self, organisation):
        """Cohorts large enough to report on, for this organisation.

        The organisation may raise its threshold, never lower it.
        """
        threshold = max(REPORTING_FLOOR, organisation.reporting_threshold)
        return (
            self.annotate(_size=Count("responses"))
            .filter(_size__gte=threshold)
        )


class CohortManager(models.Manager.from_queryset(CohortQuerySet)):
    def get_queryset(self):
        # No unfiltered default. A caller must choose reportable() or
        # for_employee(), so nobody reaches the full set by accident.
        return super().get_queryset().none()

    def all_unfiltered(self):
        """Only for migrations and the privacy invariant tests."""
        return CohortQuerySet(self.model, using=self._db)
```

A default manager returning `none()` is deliberate. `Cohort.objects.all()` returning
everything is exactly the mistake this product cannot afford, and making it fail loudly
beats documenting it.

Filter validation for I2, server side, never trusting the client:

```python
# surveys/services/reporting.py
def validate_filters(organisation, cycle, filters):
    """A manager may not narrow to a cohort below the threshold."""
    resulting = Cohort.objects.all_unfiltered().for_cycle(cycle).narrow(filters)
    threshold = max(REPORTING_FLOOR, organisation.reporting_threshold)
    if resulting.aggregate(n=Count("responses"))["n"] < threshold:
        # Do not say which filter caused it. That leaks the shape of the data.
        raise BelowThreshold()
```

The error does not name the offending filter. Telling a manager *which* filter dropped the
cohort below five lets them binary-search their way to an individual.

---

## The issue state machine

**I5 and I6.** Closure requires evidence. Assignment requires authority. Both are guarded
transitions on the model, not conventions in a view.

```python
# issues/models.py
class Lane(models.TextChoices):
    TEAM_LEAD = "team_lead", "Team lead"
    OPERATIONS = "operations", "Operations"
    LEADERSHIP = "leadership", "Leadership"
    PROTECTED = "protected", "Protected"


class Status(models.TextChoices):
    OPEN = "open", "Open"
    IN_PROGRESS = "in_progress", "In progress"
    OVERDUE = "overdue", "Overdue"
    CLOSED = "closed", "Closed"


TRANSITIONS = {
    Status.OPEN: {Status.IN_PROGRESS},
    Status.IN_PROGRESS: {Status.OVERDUE, Status.CLOSED},
    Status.OVERDUE: {Status.CLOSED},
    Status.CLOSED: set(),          # terminal. Reopening is a new transition, audited.
}

# Which lane can change which category. Routing to a lane without authority
# is the failure the product exists to prevent.
LANE_AUTHORITY = {
    Lane.TEAM_LEAD: {"workload", "one_to_ones", "local_practice"},
    Lane.OPERATIONS: {"rosters", "staffing", "shift_structure", "process"},
    Lane.LEADERSHIP: {"pay", "career", "policy", "budget"},
}


class Issue(models.Model):
    ...

    def assign(self, *, lane, owner, due, by):
        if self.category not in LANE_AUTHORITY.get(lane, set()):
            raise LaneLacksAuthority(category=self.category, lane=lane)
        if owner is None:
            raise OwnerRequired()          # a lane is not an owner
        self.lane, self.owner, self.due = lane, owner, due
        self.transition(Status.IN_PROGRESS, by=by)

    def close(self, *, by, at):
        if not self.evidence.exists():
            raise EvidenceRequired()       # I5. The product's entire claim.
        self.transition(Status.CLOSED, by=by)
        Closure.objects.create(
            issue=self, closed_by=by, closed_at=at,
            days_late=max(0, (at.date() - self.due).days),
        )

    def transition(self, to, *, by):
        if to not in TRANSITIONS[self.status]:
            raise IllegalTransition(self.status, to)
        self.status = to
        self.save(update_fields=["status", "lane", "owner", "due"])
```

`Closure` is a separate immutable record, not three columns on `Issue`, because I7 asks
for an audit trail and an audit trail that can be overwritten is not one.

---

## Serialisers

- Shape and validation only. No business rules.
- Free text is reworded at serialisation, never at storage, so the raw text stays
  available to the protected-case channel and never leaves through the engagement API.

```python
class ResponseSerializer(serializers.ModelSerializer):
    free_text = serializers.SerializerMethodField()

    def get_free_text(self, obj):
        # I3. The raw text never crosses this boundary.
        return reword_and_strip_names(obj.free_text)
```

- Error bodies carry a code, never a sentence. Copy belongs to `ux-writer`.

```python
{"detail": "below_threshold"}
{"detail": "evidence_required"}
{"detail": "cycle_closed", "closed_on": "2026-03-14"}
```

- Times are ISO 8601 UTC. The site time zone is a separate labelled field. The client
  never guesses, because a deadline in the reader's time zone is the wrong deadline.

---

## Permissions

Object level, never view level alone. A view-level check answers "may this role use this
endpoint"; the question that matters is "may this person see this row".

```python
class CanSeeIssue(BasePermission):
    def has_object_permission(self, request, view, obj):
        if obj.lane == Lane.PROTECTED:
            return False        # I4. Not visible here at all, to anyone.
        return obj.owner_id == request.user.id or obj.site_id in request.user.site_ids
```

Every endpoint is tested for its negative case. An endpoint without a 403 test is an
endpoint nobody has checked.

---

## Migrations

| Rule | Why |
|---|---|
| Reversible, or the irreversibility is stated in the migration docstring | A deploy that cannot roll back is a deploy nobody can risk |
| No `ALTER TABLE` that takes an exclusive lock on a large live table | It takes the product down mid-shift |
| Add a column nullable, backfill in a separate migration, then make it non-null | Three deploys, no lock |
| Add indexes `CONCURRENTLY` on Postgres, with `atomic = False` | An index build that locks writes is an outage |
| Data migrations are idempotent and chunked | They get re-run. Plan for it. |
| Never import a model directly in a data migration | Use `apps.get_model`. Direct imports break on replay. |

```python
class Migration(migrations.Migration):
    atomic = False
    operations = [
        migrations.AddIndex(
            model_name="issue",
            index=models.Index(fields=["site", "status", "due"], name="issue_queue_idx"),
        ),
    ]
```

---

## Queries

| Defect | Fix |
|---|---|
| N+1 on a queue view | `select_related` for forward FK, `prefetch_related` for reverse and M2M |
| Unbounded queryset | Every list endpoint is paginated. Cursor pagination, because queues are long and rows move. |
| Missing index on a filter or sort column | The queue sorts by status then due, filtered by site. Index the composite. |
| Count in a loop | Annotate once |
| `len(queryset)` | `.count()` when you need the number, iteration when you need the rows, never both |

Assert query counts in tests for the hot paths. `assertNumQueries` turns a silent
regression into a failing build.

```python
def test_queue_is_two_queries(self):
    with self.assertNumQueries(2):
        self.client.get("/api/issues/?site=whb")
```

---

## Messaging and idempotency

WhatsApp and SMS are billed per message, so a retry that duplicates a send costs money as
well as trust.

- Every outbound send takes an idempotency key derived from `(employee, cycle, template,
  stage)`. Two attempts with the same key send once.
- Webhooks are idempotent on the provider's message id. Providers redeliver, routinely.
- Templates are submitted as **utility**, not marketing. Utility is roughly six to eight
  times cheaper in Indonesia. The category is decided by the platform, not by us, and it
  moves unit economics directly.
- Retries use exponential backoff with a cap and a dead-letter queue. A message that
  cannot be delivered is surfaced, never silently dropped.

```python
@shared_task(bind=True, max_retries=5, retry_backoff=True, retry_backoff_max=600)
def send_survey_invite(self, employee_id, cycle_id):
    key = idempotency_key("invite", employee_id, cycle_id)
    if Delivery.objects.filter(key=key).exists():
        return
    ...
```

---

## Settings and secrets

- Split settings: `base`, `dev`, `prod`. Never one file with `if DEBUG`.
- Every secret from the environment. No secret in the repository, no secret in a log line,
  no personal data in a URL or a query string.
- `ALLOWED_HOSTS`, `SECURE_*`, `CSRF_TRUSTED_ORIGINS` set explicitly in `prod`.

---

## Tests

| Module | Covers |
|---|---|
| `tests/test_privacy_invariants.py` | **Its own module, deliberately.** I1 to I4. This is the product's core claim and it gets a file anyone can open and read as a specification. |
| `tests/test_state_machine.py` | I5 to I7. Every legal transition, every illegal one, closure without evidence, assignment to a lane without authority. |
| `tests/test_permissions.py` | Every endpoint's negative case |
| `tests/test_contracts.py` | Response shape against the architect's brief |
| `tests/test_queries.py` | `assertNumQueries` on the hot paths |

The privacy invariant module reads as a specification, not as test plumbing:

```python
class ReportingThreshold(TestCase):
    def test_cohort_of_four_never_reports(self):
        cohort = make_cohort(size=4)
        self.assertNotIn(cohort, Cohort.objects.reportable(self.org))

    def test_cohort_of_five_reports(self):
        cohort = make_cohort(size=5)
        self.assertIn(cohort, Cohort.objects.reportable(self.org))

    def test_manager_cannot_filter_below_threshold(self):
        with self.assertRaises(BelowThreshold):
            validate_filters(self.org, self.cycle, {"tenure_band": "0_30", "shift": "night"})

    def test_below_threshold_error_does_not_name_the_filter(self):
        try:
            validate_filters(self.org, self.cycle, {"tenure_band": "0_30", "shift": "night"})
        except BelowThreshold as e:
            self.assertNotIn("tenure_band", str(e))
            self.assertNotIn("shift", str(e))

    def test_free_text_is_reworded_at_the_boundary(self):
        r = make_response(free_text="Budi said the roster is late")
        self.assertNotIn("Budi", ResponseSerializer(r).data["free_text"])

    def test_protected_case_absent_from_engagement_queue(self):
        case = make_protected_case()
        self.assertNotIn(case.id, [i["id"] for i in self.client.get("/api/issues/").json()["results"]])
```

An organisation-level default manager that returns `none()` will make some tests read
oddly the first time. That is the cost of making the dangerous path loud, and it is worth
paying.
