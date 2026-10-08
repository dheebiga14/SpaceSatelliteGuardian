# Database setup

The website supports the PostgreSQL schema in `c:\Users\rubik\Downloads\satcollis.sql` through Supabase.

## 1. Create the database

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Open `c:\Users\rubik\Downloads\satcollis.sql`, copy its contents, and run it in the SQL Editor.

The script creates and seeds these tables:

- `space_objects`: satellite and debris catalog records.
- `orbital_elements`: append-only orbital measurements for each object.
- `propagated_positions`: calculated position and velocity samples.
- `conjunctions`: predicted close approaches and collision risk.
- `maneuver_plans`: proposed collision-avoidance burns.
- `data_imports`: history of catalog imports.

## 2. Connect the website

Copy `.env.example` to `.env.local` and replace the values with the Supabase project URL and anon key from **Project Settings > API**:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Restart the Vite server after changing environment variables.

When these values exist, the dashboard reads from the database and refreshes every 60 seconds. Without them, it continues to use the CelesTrak and local JSON fallback.

## 3. Add live conjunction data

The supplied seed script adds space objects and orbital elements. The dashboard will show conjunctions after rows are inserted into `conjunctions`, with `primary_object_id` and `secondary_object_id` referencing `space_objects`. Both objects must be different, and `risk_level` must be `low`, `medium`, or `high`.