# Phase 8 — Google login and data in Supabase

Objective: she signs in with Google and her recipes, categories and ingredients live in Supabase (per business, ready for more members), so every device sees the same data; the first upload from the phone is manual; recipe photos become Cloudinary URLs.
Branch: `feat/phase-8-supabase` from main@10c696f. Delivery: single-pr (user choice, L3). Runner: `pnpm test` (Vitest, node + jsdom projects).

## Specs

- S1 Login: "que pueda tener un logueo con google y que pueda guardar las recetas e ingredientes para que pueda acceder desde varios dispositivos y no perder nada". The app requires signing in with Google (Supabase Auth); signed out it shows only the login screen. Signing out is available from the sidebar.
- S2 Business with members: "solo ella por ahora, pero dejalo preparado para sumar a alguien mas, ya que a veces la ayudo yo". All data belongs to a business; `business_members` links users to it; RLS lets only members read/write a business's rows. The first sign-in creates the user's business with them as owner. No invite UI in this phase.
- S3 Cloud is the source of truth: "como sera una app en linea si o si necesitara conexion para acceder a ella, asi que no hay problema". After sign-in the business data is loaded from Supabase; every change is saved to Supabase (edits typed in a field are grouped, not one write per keystroke); returning to the tab reloads the data so changes from another device show up. A failed save is shown in the top bar.
- S4 Manual first upload: "me gustaria que la primera carga sea manual, por si ella lo tiene abierto en una compu, no se le suba algo viejo." Settings offers "Subir los datos de este dispositivo" with a summary (recipes, ingredients, categories, last change date) and a confirmation; only while the business in the cloud is empty; the upload is all-or-nothing. Nothing is uploaded on sign-in.
- S5 Photos by URL: "lo unico que cambiaria serian las fotos, las pondria para que se agreguen mediante url. Actualmente ella esta utilizando cloudinary para su catalogo, se podria usar lo mismo." A recipe photo is an https URL (Cloudinary) pasted in the editor, previewed, removable. The IndexedDB photo storage, its storage panel and orphan cleanup are removed; local photos are not uploaded (the summary says so).
- S6 Backups keep working: export/import against the cloud data; old backups (with or without embedded photos) still import (embedded photos are ignored). Importing a category whose name already exists reuses it instead of duplicating it (phase 7 advisory).
- Assumptions: recipe items stay an ordered JSON array on the recipe row (always edited as a whole; Postgres can still read it for phase 11); ids stay text so existing ids (`cookies`, uuids) upload unchanged; custom order is a `position` column.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T8.1 | S2, S4 (SQL) | inline | todo | |
| T8.2 | S3, S6 | inline | todo | |
| T8.3 | S1, S2 (client) | inline | todo | |
| T8.4 | S4, S6 (dedupe) | inline | todo | |
| T8.5 | S5, S6 (photos) | inline | todo | |

Route evidence: the tasks share the store, backup and settings files, so they are not disjoint units; parent writes inline in order. Risk: items 1 (stored data moves to a new backend), 2 (auth, RLS), 5 (new dependency `@supabase/supabase-js@2.117.3`, env vars, Vercel) → independent verifier at the end; RLS can only be proven against the real project once the user runs the SQL.

## Log

- L1 (2026-10-23, user): "que pueda tener un logueo con google y que pueda guardar las recetas e ingredientes para que pueda acceder desde varios dispositivos y no perder nada" / "genial, me gusta mas supabase, como sera una app en linea si o si necesitara conexion para acceder a ella, asi que no hay problema." / "solo ella por ahora, pero dejalo preparado para sumar a alguien mas, ya que a veces la ayudo yo" / "bien, por el momento la usa siempre en el celu, ya que es lo que tiene a mano, pero me gustaria que la primera carga sea manual, por si ella lo tiene abierto en una compu, no se le suba algo viejo." / "perfecto, lo unico que cambiaria serian las fotos, las pondria para que se agreguen mediante url. Actualmente ella esta utilizando cloudinary para su catalogo, se podria usar lo mismo." / "listo! mergeado y deployado. sigamos".
- L2 Setup steps given to the user (Supabase project, Google OAuth web client with the Supabase callback URL, Site URL + redirect URLs for localhost and Vercel previews, `.env.local` + Vercel env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). Keys are never pasted in chat; the Google client secret only goes into the Supabase dashboard.
- L3 (2026-10-23, user, via question "¿Cómo entregamos la fase 8?"): "Un solo PR".
