# Agent Interaction Consumption — Admin Visibility (Prototype)

Interactive React prototype of the **Agent Consumption Admin** spec (V1 + V2 preview), built to walk through with engineering. All data is mocked (69 licensed users, 5,000-interaction lifetime pool, deterministic per load).

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## What's implemented

**Consumption tab (V1)**
- **US-1 KPI tiles**: users used / licenses bought; interactions consumed / pool with % and remaining (colour bands at 75% / 90% — mock data sits at 91%, red); avg interactions per active user. Percentages shown large in brackets beside the numbers.
- **US-2 main list**: every licensed user including zero-usage rows; sortable columns (default consumption desc); re-pivot rows by user / user group / super group (group views show licences bought and active users); filters by date range, super group, group, individual user; pagination at 25/50/100 rows; CSV export of the full (filtered, pivoted) list.
- US-3 (non-user list) was dropped from this prototype per review.

**Controls tab (V2 preview — mocked)**
- US-4 per-user caps with blocked status when the cap is reached.
- US-5 enable/disable toggle per user with admin-configurable blocked-state message demo.
- US-6 threshold alerts noted as TBD.

## Open product questions surfaced in the prototype

1. **Avg-per-user denominator** — currently active users (spec flags "confirm").
2. **Pool tile vs. date filter** — the pool-consumption tile always shows *lifetime* position (allocation is a lifetime pool), while the other tiles/lists respect the date filter. Confirm this interpretation.
