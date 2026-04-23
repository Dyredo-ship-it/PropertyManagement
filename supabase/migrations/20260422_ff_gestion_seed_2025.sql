-- ============================================================
-- Migration: F&F Gestion — seed real data for 2025 (Nov–Dec)
--
-- 1. Creates table `owners` (propriétaires) + adds buildings.owner_id FK
-- 2. Wipes all buildings for the F&F Gestion org (cascades to tenants,
--    transactions, settings). Safe only because the account already
--    agreed to "supprime et recrée propre".
-- 3. Inserts: Jean-Marc Schenker as owner + Gare 27 + Beaux-Arts 9
--    + all tenants + accounting_settings + accounting_transactions
--    for the 01.11.2025–31.12.2025 period.
--
-- Source of truth: "Décompte de gestion 2025" PDFs pour les deux
-- immeubles, fournis par F&F Gestion.
--
-- Usage: Supabase → SQL Editor → paste + Run. Idempotent: safe to
-- re-run (the DELETE/INSERT scope is the F&F org only, detected via
-- the contact.fgestion@gmail.com super admin).
-- ============================================================

-- ─── 1. Schema additions ────────────────────────────────────
create table if not exists owners (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  iban text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists owners_org_idx on owners(organization_id);

alter table owners enable row level security;
drop policy if exists "owners_rw_org" on owners;
create policy "owners_rw_org" on owners
  for all to authenticated
  using (organization_id = (select organization_id from profiles where id = auth.uid()))
  with check (organization_id = (select organization_id from profiles where id = auth.uid()));

alter table buildings
  add column if not exists owner_id uuid references owners(id) on delete set null;
create index if not exists buildings_owner_idx on buildings(owner_id);

-- ─── 2. Resolve F&F Gestion org + wipe previous seed ────────
do $$
declare
  v_org_id uuid;
  v_owner_id uuid;
  v_gare_id uuid;
  v_beaux_id uuid;
  -- Tenant ids for Gare 27
  t_shi uuid; t_brunner uuid; t_richard uuid;
  t_thiebaud uuid; t_hosselet uuid; t_heliel uuid;
  t_libreros uuid; t_mariot uuid; t_wyss uuid;
  t_berger uuid;
  -- Tenant ids for Beaux-Arts 9
  t_poli uuid; t_combe uuid; t_bauer uuid; t_emile uuid;
begin
  -- Resolve the org via the known super-admin email.
  select p.organization_id into v_org_id
  from profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = 'contact.fgestion@gmail.com'
    and p.is_super_admin = true
  limit 1;

  if v_org_id is null then
    raise exception 'Super admin contact.fgestion@gmail.com not found — aborting seed';
  end if;

  raise notice 'Seeding F&F Gestion data into organization %', v_org_id;

  -- Wipe prior buildings for this org (cascade kills tenants, txs,
  -- settings). Safe per user confirmation.
  delete from buildings where organization_id = v_org_id;
  delete from owners    where organization_id = v_org_id;

  -- ─── 3. Owner ──────────────────────────────────────────────
  insert into owners (organization_id, name, email, phone, address, iban, notes)
  values (
    v_org_id,
    'Jean-Marc Schenker',
    null,
    null,
    'Grand''Rue 16, 2012 Auvernier',
    'CH1608401000070450838',
    'Propriétaire des immeubles Gare 27 et Beaux-Arts 9'
  )
  returning id into v_owner_id;

  -- ─── 4. Buildings ──────────────────────────────────────────
  insert into buildings (organization_id, owner_id, name, address, units, occupied_units, monthly_revenue, currency)
  values (v_org_id, v_owner_id, 'Gare 27', 'Rue de la Gare 27, 2012 Auvernier',
          9, 9, 12114.00, 'CHF')
  returning id into v_gare_id;

  insert into buildings (organization_id, owner_id, name, address, units, occupied_units, monthly_revenue, currency)
  values (v_org_id, v_owner_id, 'Beaux-Arts 9', 'Rue des Beaux-Arts 9, 2000 Neuchâtel',
          5, 4, 4569.00, 'CHF')
  returning id into v_beaux_id;

  -- ─── 5. Tenants — Gare 27 ──────────────────────────────────
  -- rent_net = appartement rent; garage/place rents go through
  -- accounting_transactions as rental income with their own unit label.

  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_gare_id, 'Gare 27', 'SHI Zhen & LIANG Wei', '', null, '1er étage, 4.5p', 1551.00, 220.00, '2018-05-15', 'active')
  returning id into t_shi;

  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_gare_id, 'Gare 27', 'Brunner Marie-Anne', '', null, '1er étage, 3.5p', 695.00, 345.00, '2005-07-01', 'active')
  returning id into t_brunner;

  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_gare_id, 'Gare 27', 'Richard Nicolas Olivier', '', null, '1er étage, 2.5p', 1044.00, 150.00, '2025-08-01', 'active')
  returning id into t_richard;

  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_gare_id, 'Gare 27', 'Thiébaud Pierrette', '', null, '2ème étage, 4.5p', 802.00, 400.00, '2005-07-01', 'active')
  returning id into t_thiebaud;

  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_gare_id, 'Gare 27', 'Hosselet Matias Pedro', '', null, '2ème étage, 3.5p', 1283.00, 270.00, '2024-10-01', 'active')
  returning id into t_hosselet;

  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_gare_id, 'Gare 27', 'Heliel Dourado', '', null, '2ème étage, 2.5p', 1010.00, 200.00, '2025-11-08', 'active')
  returning id into t_heliel;

  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_gare_id, 'Gare 27', 'Johnn Libreros', '', null, '3ème étage, 4.5p', 1390.00, 260.00, '2025-11-06', 'active')
  returning id into t_libreros;

  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_gare_id, 'Gare 27', 'Mariot Patrick', '', null, '3ème étage, 3.5p', 1177.00, 250.00, '2025-07-15', 'active')
  returning id into t_mariot;

  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_gare_id, 'Gare 27', 'Wyss Jean-Christophe', '', null, '3ème étage, 2.5p', 947.00, 120.00, '2022-01-01', 'active')
  returning id into t_wyss;

  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_gare_id, 'Gare 27', 'Berger Nicolas Yannis', '', null, 'Garage N°1 + Place ext. N°1', 180.00, 0.00, '2024-09-01', 'active')
  returning id into t_berger;

  -- ─── 6. Tenants — Beaux-Arts 9 ─────────────────────────────
  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_beaux_id, 'Beaux-Arts 9', 'Raffaele POLI', '', null, 'Rez-de-chaussée', 1263.00, 60.00, '2006-04-01', 'active')
  returning id into t_poli;

  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_beaux_id, 'Beaux-Arts 9', 'Sandrine COMBE', '', null, '1er étage', 1506.00, 60.00, '2012-02-01', 'active')
  returning id into t_combe;

  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_beaux_id, 'Beaux-Arts 9', 'Catherine BAUER-HAINARD', '', null, '3ème étage', 1800.00, 55.00, '2024-12-01', 'active')
  returning id into t_bauer;

  insert into tenants (organization_id, building_id, building_name, name, email, phone, unit, rent_net, charges, lease_start, status)
  values (v_org_id, v_beaux_id, 'Beaux-Arts 9', 'Emile FARINE', '', null, '4ème étage', 0.00, 80.00, '2025-02-15', 'active')
  returning id into t_emile;

  -- ─── 7. Accounting settings — Gare 27 ──────────────────────
  -- categories = Swiss gérance chart of accounts, sub_categories = nature of
  -- expense. unit_assignments maps each object to its tenant for multi-unit
  -- accounting (e.g. Brunner has apartment 1er 3.5p + garage N°4).
  insert into accounting_settings (organization_id, building_id, units, categories, sub_categories, unit_assignments, unit_types)
  values (
    v_org_id, v_gare_id,
    to_jsonb(array[
      '1er étage, 4.5p','1er étage, 3.5p','1er étage, 2.5p',
      '2ème étage, 4.5p','2ème étage, 3.5p','2ème étage, 2.5p',
      '3ème étage, 4.5p','3ème étage, 3.5p','3ème étage, 2.5p',
      'Garage N°1','Garage N°2','Garage N°3','Garage N°4','Garage N°5','Garage N°6',
      'Place ext. N°1','Place ext. N°2','Place ext. N°3'
    ]),
    to_jsonb(array[
      '101 — Encaissements loyers',
      '102 — Loyers garages & places de parc',
      '103 — Acomptes de charges',
      '104 — Subventions',
      '105 — Pertes de loyers',
      '201 — Assurances',
      '202 — Entretien appartements',
      '203 — Entretien bâtiment',
      '204 — Entretien espaces verts',
      '205 — Entretien machines immeubles',
      '206 — Frais de chauffage',
      '207 — Frais postaux',
      '208 — Annonces locatives & publicité',
      '209 — Frais de gestion locative',
      '210 — Frais de conciergerie',
      '212 — Frais divers',
      '213 — Électricité',
      '214 — Gaz',
      '215 — Eau',
      '216 — Honoraires de gestion',
      '302 — Isolation (travaux d''enveloppe)',
      '303 — Centralisation du chauffage',
      '401 — Versement au propriétaire'
    ]),
    '[]'::jsonb,
    jsonb_build_object(
      '1er étage, 4.5p',  t_shi::text,
      '1er étage, 3.5p',  t_brunner::text,
      '1er étage, 2.5p',  t_richard::text,
      '2ème étage, 4.5p', t_thiebaud::text,
      '2ème étage, 3.5p', t_hosselet::text,
      '2ème étage, 2.5p', t_heliel::text,
      '3ème étage, 4.5p', t_libreros::text,
      '3ème étage, 3.5p', t_mariot::text,
      '3ème étage, 2.5p', t_wyss::text,
      'Garage N°1',       t_berger::text,
      'Garage N°2',       t_wyss::text,
      'Garage N°3',       t_libreros::text,
      'Garage N°4',       t_brunner::text,
      'Garage N°6',       t_thiebaud::text,
      'Place ext. N°1',   t_berger::text,
      'Place ext. N°2',   t_mariot::text,
      'Place ext. N°3',   t_heliel::text
    ),
    jsonb_build_object(
      '1er étage, 4.5p','appartement','1er étage, 3.5p','appartement','1er étage, 2.5p','appartement',
      '2ème étage, 4.5p','appartement','2ème étage, 3.5p','appartement','2ème étage, 2.5p','appartement',
      '3ème étage, 4.5p','appartement','3ème étage, 3.5p','appartement','3ème étage, 2.5p','appartement',
      'Garage N°1','garage','Garage N°2','garage','Garage N°3','garage',
      'Garage N°4','garage','Garage N°5','garage','Garage N°6','garage',
      'Place ext. N°1','place_de_parc','Place ext. N°2','place_de_parc','Place ext. N°3','place_de_parc'
    )
  );

  -- ─── 8. Accounting settings — Beaux-Arts 9 ─────────────────
  insert into accounting_settings (organization_id, building_id, units, categories, sub_categories, unit_assignments, unit_types)
  values (
    v_org_id, v_beaux_id,
    to_jsonb(array['Rez-de-chaussée','1er étage','2ième étage','3ème étage','4ème étage']),
    to_jsonb(array[
      '101 — Encaissements loyers',
      '103 — Acomptes de charges',
      '202 — Entretien appartements',
      '213 — Électricité',
      '214 — Gaz',
      '215 — Eau',
      '216 — Honoraires de gestion',
      '302 — Rénovation complète appartement 2e étage',
      '303 — Centralisation du chauffage',
      '401 — Versement au propriétaire'
    ]),
    '[]'::jsonb,
    jsonb_build_object(
      'Rez-de-chaussée', t_poli::text,
      '1er étage',       t_combe::text,
      '3ème étage',      t_bauer::text,
      '4ème étage',      t_emile::text
    ),
    jsonb_build_object(
      'Rez-de-chaussée','appartement',
      '1er étage','appartement',
      '2ième étage','appartement',
      '3ème étage','appartement',
      '4ème étage','appartement'
    )
  );

  -- ─── 9. Transactions — Gare 27 (Nov–Dec 2025) ──────────────
  -- CREDIT = recettes (loyers, subventions), DEBIT = dépenses.
  insert into accounting_transactions
    (organization_id, building_id, date_invoice, date_payment, unit, description, category, account_number, debit, credit, status, tenant_name, month)
  values
    -- Loyers appartements
    (v_org_id, v_gare_id, '2025-11-30', '2025-11-30', '2ème étage, 2.5p', 'Novembre 2025 — Heliel Dourado',            '101 — Encaissements loyers', 101, 0, 876.45, 'Payé', 'Heliel Dourado', '2025-11'),
    (v_org_id, v_gare_id, '2025-11-30', '2025-11-25', '2ème étage, 3.5p', 'Novembre 2025 — Hosselet Matias Pedro',     '101 — Encaissements loyers', 101, 0, 1283.00, 'Payé', 'Hosselet Matias Pedro', '2025-11'),
    (v_org_id, v_gare_id, '2025-11-25', '2025-11-25', '2ème étage, 4.5p', 'Novembre 2025 — Thiébaud Pierrette',        '101 — Encaissements loyers', 101, 0, 802.00, 'Payé', 'Thiébaud Pierrette', '2025-11'),
    (v_org_id, v_gare_id, '2025-11-30', '2025-11-30', '3ème étage, 2.5p', 'Novembre 2025 — Wyss Jean-Christophe',      '101 — Encaissements loyers', 101, 0, 947.00, 'Payé', 'Wyss Jean-Christophe', '2025-11'),
    (v_org_id, v_gare_id, '2025-11-26', '2025-11-26', '3ème étage, 3.5p', 'Novembre 2025 — Mariot Patrick',            '101 — Encaissements loyers', 101, 0, 1177.00, 'Payé', 'Mariot Patrick', '2025-11'),
    (v_org_id, v_gare_id, '2025-11-30', '2025-11-30', '3ème étage, 4.5p', 'Novembre 2025 — Johnn Libreros',            '101 — Encaissements loyers', 101, 0, 1251.00, 'Payé', 'Johnn Libreros', '2025-11'),
    (v_org_id, v_gare_id, '2025-12-27', '2025-11-27', '1er étage, 2.5p',  'Décembre 2025 — Richard Nicolas Olivier',   '101 — Encaissements loyers', 101, 0, 1044.00, 'Payé', 'Richard Nicolas Olivier', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-05', '2025-12-05', '1er étage, 3.5p',  'Décembre 2025 — Brunner Marie-Anne',        '101 — Encaissements loyers', 101, 0, 695.00, 'Payé', 'Brunner Marie-Anne', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-28', '2025-11-28', '1er étage, 4.5p',  'Décembre 2025 — SHI Zhen, LIANG Wei',       '101 — Encaissements loyers', 101, 0, 1551.00, 'Payé', 'SHI Zhen & LIANG Wei', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-01', '2025-12-01', '2ème étage, 2.5p', 'Décembre 2025 — Heliel Dourado',            '101 — Encaissements loyers', 101, 0, 1010.00, 'Payé', 'Heliel Dourado', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-12', '2025-12-12', '3ème étage, 2.5p', 'Décembre 2025 — Wyss Jean-Christophe',      '101 — Encaissements loyers', 101, 0, 947.00, 'Payé', 'Wyss Jean-Christophe', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-26', '2025-11-26', '3ème étage, 3.5p', 'Décembre 2025 — Mariot Patrick',            '101 — Encaissements loyers', 101, 0, 1177.00, 'Payé', 'Mariot Patrick', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-31', '2026-01-06', '3ème étage, 4.5p', 'Décembre 2025 — Johnn Libreros',            '101 — Encaissements loyers', 101, 0, 1390.00, 'Payé', 'Johnn Libreros', '2025-12'),
    (v_org_id, v_gare_id, '2025-11-25', '2025-11-25', '2ème étage, 4.5p', 'Décembre 2025 — Thiébaud Pierrette',        '101 — Encaissements loyers', 101, 0, 802.00, 'Payé', 'Thiébaud Pierrette', '2025-12'),
    -- Loyers garages & places (102)
    (v_org_id, v_gare_id, '2025-11-04', '2025-11-04', 'Garage N°1',       'Novembre 2025 — Nicolas BERGER',            '102 — Loyers garages & places de parc', 102, 0, 130.00, 'Payé', 'Berger Nicolas Yannis', '2025-11'),
    (v_org_id, v_gare_id, '2025-11-04', '2025-11-04', 'Place ext. N°1',   'Novembre 2025 — Nicolas BERGER',            '102 — Loyers garages & places de parc', 102, 0, 50.00,  'Payé', 'Berger Nicolas Yannis', '2025-11'),
    (v_org_id, v_gare_id, '2025-11-30', '2025-11-30', 'Garage N°2',       'Novembre 2025 — Wyss Jean-Christophe',      '102 — Loyers garages & places de parc', 102, 0, 130.00, 'Payé', 'Wyss Jean-Christophe', '2025-11'),
    (v_org_id, v_gare_id, '2025-11-26', '2025-11-26', 'Place ext. N°2',   'Décembre 2025 — Mariot Patrick',            '102 — Loyers garages & places de parc', 102, 0, 50.00,  'Payé', 'Mariot Patrick', '2025-12'),
    (v_org_id, v_gare_id, '2025-11-25', '2025-11-25', 'Garage N°6',       'Décembre 2025 — Thiébaud Pierrette',        '102 — Loyers garages & places de parc', 102, 0, 100.00, 'Payé', 'Thiébaud Pierrette', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-05', '2025-12-05', 'Garage N°4',       'Décembre 2025 — Brunner Marie-Anne',        '102 — Loyers garages & places de parc', 102, 0, 110.00, 'Payé', 'Brunner Marie-Anne', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-01', '2025-12-01', 'Place ext. N°3',   'Décembre 2025 — Heliel Dourado',            '102 — Loyers garages & places de parc', 102, 0, 50.00,  'Payé', 'Heliel Dourado', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-12', '2025-12-12', 'Garage N°2',       'Décembre 2025 — Wyss Jean-Christophe',      '102 — Loyers garages & places de parc', 102, 0, 130.00, 'Payé', 'Wyss Jean-Christophe', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-31', '2026-01-06', 'Garage N°3',       'Décembre 2025 — Johnn Libreros',            '102 — Loyers garages & places de parc', 102, 0, 130.00, 'Payé', 'Johnn Libreros', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-31', '2026-01-14', 'Garage N°1',       'Décembre 2025 — Nicolas BERGER',            '102 — Loyers garages & places de parc', 102, 0, 130.00, 'Payé', 'Berger Nicolas Yannis', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-31', '2026-01-14', 'Place ext. N°1',   'Décembre 2025 — Nicolas BERGER',            '102 — Loyers garages & places de parc', 102, 0, 50.00,  'Payé', 'Berger Nicolas Yannis', '2025-12'),
    -- Acomptes de charges (103)
    (v_org_id, v_gare_id, '2025-11-30', '2025-11-30', '2ème étage, 2.5p', 'Novembre 2025 — Heliel Dourado',            '103 — Acomptes de charges', 103, 0, 173.55, 'Payé', 'Heliel Dourado', '2025-11'),
    (v_org_id, v_gare_id, '2025-11-25', '2025-11-25', '2ème étage, 3.5p', 'Novembre 2025 — Hosselet Matias Pedro',     '103 — Acomptes de charges', 103, 0, 270.00, 'Payé', 'Hosselet Matias Pedro', '2025-11'),
    (v_org_id, v_gare_id, '2025-11-25', '2025-11-25', '2ème étage, 4.5p', 'Décembre 2025 — Thiébaud Pierrette',        '103 — Acomptes de charges', 103, 0, 400.00, 'Payé', 'Thiébaud Pierrette', '2025-12'),
    (v_org_id, v_gare_id, '2025-11-30', '2025-11-30', '3ème étage, 2.5p', 'Novembre 2025 — Wyss Jean-Christophe',      '103 — Acomptes de charges', 103, 0, 120.00, 'Payé', 'Wyss Jean-Christophe', '2025-11'),
    (v_org_id, v_gare_id, '2025-11-26', '2025-11-26', '3ème étage, 3.5p', 'Décembre 2025 — Mariot Patrick',            '103 — Acomptes de charges', 103, 0, 250.00, 'Payé', 'Mariot Patrick', '2025-12'),
    (v_org_id, v_gare_id, '2025-11-30', '2025-11-30', '3ème étage, 4.5p', 'Novembre 2025 — Johnn Libreros',            '103 — Acomptes de charges', 103, 0, 233.00, 'Payé', 'Johnn Libreros', '2025-11'),
    (v_org_id, v_gare_id, '2025-11-27', '2025-11-27', '1er étage, 2.5p',  'Décembre 2025 — Richard Nicolas Olivier',   '103 — Acomptes de charges', 103, 0, 150.00, 'Payé', 'Richard Nicolas Olivier', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-05', '2025-12-05', '1er étage, 3.5p',  'Décembre 2025 — Brunner Marie-Anne',        '103 — Acomptes de charges', 103, 0, 345.00, 'Payé', 'Brunner Marie-Anne', '2025-12'),
    (v_org_id, v_gare_id, '2025-11-28', '2025-11-28', '1er étage, 4.5p',  'Décembre 2025 — SHI Zhen, LIANG Wei',       '103 — Acomptes de charges', 103, 0, 220.00, 'Payé', 'SHI Zhen & LIANG Wei', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-01', '2025-12-01', '2ème étage, 2.5p', 'Décembre 2025 — Heliel Dourado',            '103 — Acomptes de charges', 103, 0, 200.00, 'Payé', 'Heliel Dourado', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-12', '2025-12-12', '3ème étage, 2.5p', 'Décembre 2025 — Wyss Jean-Christophe',      '103 — Acomptes de charges', 103, 0, 120.00, 'Payé', 'Wyss Jean-Christophe', '2025-12'),
    (v_org_id, v_gare_id, '2025-12-31', '2026-01-06', '3ème étage, 4.5p', 'Décembre 2025 — Johnn Libreros',            '103 — Acomptes de charges', 103, 0, 260.00, 'Payé', 'Johnn Libreros', '2025-12'),
    -- Subventions
    (v_org_id, v_gare_id, '2025-11-26', '2025-11-26', 'Immeuble',         'État de Neuchâtel — Versement subventions','104 — Subventions', 104, 0, 27780.00, 'Payé', null, '2025-11'),
    -- Isolation (302) — the big chunk
    (v_org_id, v_gare_id, '2024-09-13', '2025-01-01', 'Immeuble', 'Vincent Goullet — Architecte — CECB — Fact. N°2024.09.126',      '302 — Isolation (travaux d''enveloppe)', 302, 1985.00,  0, 'Payé', null, '2025-01'),
    (v_org_id, v_gare_id, '2024-09-27', '2025-01-01', 'Immeuble', 'Vincent Goullet — Architecte — CECB — Fact. N°2024.09.129',      '302 — Isolation (travaux d''enveloppe)', 302, 750.00,   0, 'Payé', null, '2025-01'),
    (v_org_id, v_gare_id, '2024-10-09', '2025-01-01', 'Immeuble', 'Atelier Celsius — Demande CECB pour travaux',                    '302 — Isolation (travaux d''enveloppe)', 302, 2735.00,  0, 'Payé', null, '2025-01'),
    (v_org_id, v_gare_id, '2025-04-17', '2025-04-17', 'Immeuble', 'Assurance pour les travaux d''isolation',                        '302 — Isolation (travaux d''enveloppe)', 302, 1008.00,  0, 'Payé', null, '2025-04'),
    (v_org_id, v_gare_id, '2025-04-22', '2025-04-22', 'Immeuble', 'Mantuano — Acompte n°1 — F/25''032',                             '302 — Isolation (travaux d''enveloppe)', 302, 14500.00, 0, 'Payé', null, '2025-04'),
    (v_org_id, v_gare_id, '2025-04-22', '2025-04-22', 'Immeuble', 'Leutwiler — Pose des barrières — Fact. N°20250205',              '302 — Isolation (travaux d''enveloppe)', 302, 16215.00, 0, 'Payé', null, '2025-04'),
    (v_org_id, v_gare_id, '2025-05-05', '2025-05-05', 'Immeuble', 'Favre — Facture d''acompte N°21748/4916 — 1er Acompte',          '302 — Isolation (travaux d''enveloppe)', 302, 12500.00, 0, 'Payé', null, '2025-05'),
    (v_org_id, v_gare_id, '2025-05-05', '2025-05-05', 'Immeuble', 'Tico — Acompte 9924 — 1er Acompte',                              '302 — Isolation (travaux d''enveloppe)', 302, 40000.00, 0, 'Payé', null, '2025-05'),
    (v_org_id, v_gare_id, '2025-05-21', '2025-05-21', 'Immeuble', 'Tico — Acompte 9933 — 2ième Acompte',                            '302 — Isolation (travaux d''enveloppe)', 302, 40000.00, 0, 'Payé', null, '2025-05'),
    (v_org_id, v_gare_id, '2025-06-17', '2025-06-17', 'Immeuble', 'Schenker Storen — 1er Acompte — Fact. N°720500002126',           '302 — Isolation (travaux d''enveloppe)', 302, 10000.00, 0, 'Payé', null, '2025-06'),
    (v_org_id, v_gare_id, '2025-06-20', '2025-06-20', 'Immeuble', 'Tico — Acompte 9950 — 3ième Acompte',                            '302 — Isolation (travaux d''enveloppe)', 302, 40000.00, 0, 'Payé', null, '2025-06'),
    (v_org_id, v_gare_id, '2025-07-28', '2025-07-28', 'Immeuble', 'Sahli — Raccord électricité gâche porte — RE-00483',             '302 — Isolation (travaux d''enveloppe)', 302, 90.00,    0, 'Payé', null, '2025-07'),
    (v_org_id, v_gare_id, '2025-07-28', '2025-07-28', 'Immeuble', 'Leutwiler — Barrières — Facture finale N°2406089',               '302 — Isolation (travaux d''enveloppe)', 302, 16539.30, 0, 'Payé', null, '2025-07'),
    (v_org_id, v_gare_id, '2025-07-28', '2025-07-28', 'Immeuble', 'Sahli — Fixer sonde, déplacer prises balcon — RE-00473',         '302 — Isolation (travaux d''enveloppe)', 302, 609.00,   0, 'Payé', null, '2025-07'),
    (v_org_id, v_gare_id, '2025-07-28', '2025-07-28', 'Immeuble', 'Mantuano — Acompte N°2',                                         '302 — Isolation (travaux d''enveloppe)', 302, 4500.00,  0, 'Payé', null, '2025-07'),
    (v_org_id, v_gare_id, '2025-07-31', '2025-07-31', 'Immeuble', 'Gottburg — Modification de toiture — Fact. N°21054',             '302 — Isolation (travaux d''enveloppe)', 302, 21000.00, 0, 'Payé', null, '2025-07'),
    (v_org_id, v_gare_id, '2025-07-31', '2025-07-31', 'Immeuble', 'Tico — Isolation — Facture finale N°10147',                      '302 — Isolation (travaux d''enveloppe)', 302, 17062.15, 0, 'Payé', null, '2025-07'),
    (v_org_id, v_gare_id, '2025-07-31', '2025-07-31', 'Immeuble', 'Tico — Toilette de chantier — Fact. N°10145',                    '302 — Isolation (travaux d''enveloppe)', 302, 467.00,   0, 'Payé', null, '2025-07'),
    (v_org_id, v_gare_id, '2025-07-31', '2025-07-31', 'Immeuble', 'Tico — Fourniture et pose de renvoi d''eau — Fact. N°10146',     '302 — Isolation (travaux d''enveloppe)', 302, 1496.10,  0, 'Payé', null, '2025-07'),
    (v_org_id, v_gare_id, '2025-09-02', '2025-09-02', 'Immeuble', 'Sahli — Tableau de chantier — Fact. RE-00406',                   '302 — Isolation (travaux d''enveloppe)', 302, 450.00,   0, 'Payé', null, '2025-09'),
    (v_org_id, v_gare_id, '2025-09-02', '2025-09-02', 'Immeuble', 'Mantuano — Facture finale N°25109',                              '302 — Isolation (travaux d''enveloppe)', 302, 15531.30, 0, 'Payé', null, '2025-09'),
    (v_org_id, v_gare_id, '2025-09-15', '2025-09-15', 'Immeuble', 'Favre — Facture finale N°20811/4916',                            '302 — Isolation (travaux d''enveloppe)', 302, 3722.60,  0, 'Payé', null, '2025-09'),
    (v_org_id, v_gare_id, '2025-09-23', '2025-09-23', 'Immeuble', 'Leutwiler — Porte d''entrée — Fact. N°20250397',                 '302 — Isolation (travaux d''enveloppe)', 302, 6794.10,  0, 'Payé', null, '2025-09'),
    (v_org_id, v_gare_id, '2025-10-07', '2025-11-11', 'Immeuble', 'Schenker Storen — Facture finale N°720000006675',                '302 — Isolation (travaux d''enveloppe)', 302, 36332.95, 0, 'Payé', null, '2025-10'),
    (v_org_id, v_gare_id, '2025-10-23', '2025-10-23', 'Immeuble', 'Leutwiler — Grilles sauts de loup — Fact. N°2406089',            '302 — Isolation (travaux d''enveloppe)', 302, 675.60,   0, 'Payé', null, '2025-10'),
    (v_org_id, v_gare_id, '2025-10-23', '2025-10-23', 'Immeuble', 'Sahli — Porte d''entrée (Gâche) — Fact. RE-00499',               '302 — Isolation (travaux d''enveloppe)', 302, 225.00,   0, 'Payé', null, '2025-10'),
    (v_org_id, v_gare_id, '2025-10-24', '2025-10-24', 'Immeuble', 'Jacot — Installation grilles aération — Fact. N°253009',         '302 — Isolation (travaux d''enveloppe)', 302, 458.95,   0, 'Payé', null, '2025-10'),
    -- Entretien / améliorations appartements (202)
    (v_org_id, v_gare_id, '2024-10-09', '2025-01-01', '3ème étage, 3.5p', 'Idéal Habitat — Peinture contre la moisissure',          '202 — Entretien appartements', 202, 1405.00, 0, 'Payé', null, '2025-01'),
    (v_org_id, v_gare_id, '2025-04-05', '2025-04-05', '1er étage, 2.5p',  'Jumbo — Peinture & Rénovation',                          '202 — Entretien appartements', 202, 42.90,   0, 'Payé', null, '2025-04'),
    (v_org_id, v_gare_id, '2025-04-12', '2025-04-12', '1er étage, 2.5p',  'Jumbo — Peinture Gare 27 1er étage 2.5p',                '202 — Entretien appartements', 202, 62.90,   0, 'Payé', null, '2025-04'),
    (v_org_id, v_gare_id, '2025-04-22', '2025-04-22', '1er étage, 2.5p',  'Tico — Réparation fissures plafond — Fact. 10038',       '202 — Entretien appartements', 202, 953.45,  0, 'Payé', null, '2025-04'),
    (v_org_id, v_gare_id, '2025-05-05', '2025-05-05', '1er étage, 2.5p',  'Jacot — Valve pour radiateur',                           '202 — Entretien appartements', 202, 42.60,   0, 'Payé', null, '2025-05'),
    (v_org_id, v_gare_id, '2025-05-08', '2025-05-08', '1er étage, 2.5p',  'Peinture complète de l''appartement',                    '202 — Entretien appartements', 202, 600.00,  0, 'Payé', null, '2025-05'),
    (v_org_id, v_gare_id, '2025-06-16', '2025-06-16', '1er étage, 2.5p',  'MCM Electroménagers — Filtre lave-vaisselle — N°25000402','202 — Entretien appartements', 202, 121.50,  0, 'Payé', null, '2025-06'),
    (v_org_id, v_gare_id, '2025-06-16', '2025-06-16', '1er étage, 2.5p',  'Fust — Nouveau frigo — Fact. 128169054',                 '202 — Entretien appartements', 202, 977.90,  0, 'Payé', null, '2025-06'),
    (v_org_id, v_gare_id, '2025-07-02', '2025-07-02', '3ème étage, 3.5p', 'Jumbo — Matériel de peinture',                           '202 — Entretien appartements', 202, 181.70,  0, 'Payé', null, '2025-07'),
    (v_org_id, v_gare_id, '2025-07-22', '2025-07-22', '3ème étage, 3.5p', 'Société Technique — Mise à neuf joints — Fact. N°42592', '202 — Entretien appartements', 202, 1572.85, 0, 'Payé', null, '2025-07'),
    (v_org_id, v_gare_id, '2025-07-22', '2025-07-22', '3ème étage, 3.5p', 'Francisco Figueiredo — Peinture complète appartement',   '202 — Entretien appartements', 202, 1500.00, 0, 'Payé', null, '2025-07'),
    (v_org_id, v_gare_id, '2025-07-22', '2025-07-22', '3ème étage, 3.5p', 'Dylan Figueiredo — Peinture complète appartement',       '202 — Entretien appartements', 202, 1500.00, 0, 'Payé', null, '2025-07'),
    (v_org_id, v_gare_id, '2025-09-27', '2025-09-27', '3ème étage, 4.5p', 'Ticket Landi — Matériel de peinture',                    '202 — Entretien appartements', 202, 64.00,   0, 'Payé', null, '2025-09'),
    (v_org_id, v_gare_id, '2025-10-02', '2025-11-18', '2ème étage, 2.5p', 'Fust — Nouveau lave-vaisselle — Fact. N°5025851422',     '202 — Entretien appartements', 202, 1079.80, 0, 'Payé', null, '2025-10'),
    (v_org_id, v_gare_id, '2025-10-25', '2025-10-25', '3ème étage, 4.5p', 'Ticket Jumbo — Peinture pour rénovations',               '202 — Entretien appartements', 202, 131.05,  0, 'Payé', null, '2025-10'),
    (v_org_id, v_gare_id, '2025-10-30', '2025-10-30', '3ème étage, 4.5p', 'Ticket Jumbo — Silicone sanitaire + Pâte à modèle',      '202 — Entretien appartements', 202, 22.45,   0, 'Payé', null, '2025-10'),
    (v_org_id, v_gare_id, '2025-11-01', '2025-11-01', '3ème étage, 4.5p', 'Ticket Landi — Laque acrylique cadres de portes',        '202 — Entretien appartements', 202, 26.85,   0, 'Payé', null, '2025-11'),
    -- Entretien des espaces verts (204)
    (v_org_id, v_gare_id, '2025-01-16', '2025-01-16', 'Immeuble', 'Francisco Figueiredo — Entretien jardin — 1er semestre',        '204 — Entretien espaces verts', 204, 450.00, 0, 'Payé', null, '2025-01'),
    (v_org_id, v_gare_id, '2025-07-22', '2025-07-22', 'Immeuble', 'Francisco Figueiredo — Entretien jardin — 2ième semestre',      '204 — Entretien espaces verts', 204, 450.00, 0, 'Payé', null, '2025-07'),
    -- Entretien machines (205)
    (v_org_id, v_gare_id, '2025-10-21', '2025-10-21', 'Immeuble', 'MCM Electroménagers — Porte machine cassée — Fact. 25001135',   '205 — Entretien machines immeubles', 205, 230.85, 0, 'Payé', null, '2025-10'),
    -- Annonces (208)
    (v_org_id, v_gare_id, '2025-04-07', '2025-04-07', '1er étage, 2.5p',  'Matériels peinture Anne et Abregi / publication immoscout','208 — Annonces locatives & publicité', 208, 294.50, 0, 'Payé', null, '2025-04'),
    (v_org_id, v_gare_id, '2025-04-07', '2025-04-07', '1er étage, 2.5p',  'Publication annonce location appartement',                 '208 — Annonces locatives & publicité', 208, 129.00, 0, 'Payé', null, '2025-04'),
    -- Frais gestion locative (209)
    (v_org_id, v_gare_id, '2025-11-03', '2025-11-03', 'Immeuble', 'Propriétaires Services SA — Documents état des lieux — Fact. N°155965','209 — Frais de gestion locative', 209, 16.90, 0, 'Payé', null, '2025-11'),
    (v_org_id, v_gare_id, '2025-11-18', '2025-11-18', 'Immeuble', 'Chambre immobilière neuchâteloise',                                '209 — Frais de gestion locative', 209, 22.00, 0, 'Payé', null, '2025-11'),
    -- Frais divers (212)
    (v_org_id, v_gare_id, '2025-01-06', '2025-01-06', '3ème étage, 3.5p', 'Galaxus/Digitec — Achat d''un déshumidificateur',         '212 — Frais divers', 212, 255.00, 0, 'Payé', null, '2025-01'),
    -- Honoraires (214)
    (v_org_id, v_gare_id, '2025-12-31', '2025-12-31', 'Immeuble', 'Honoraire de gestion nov–déc 2025',                                '216 — Honoraires de gestion', 216, 976.27, 0, 'Payé', null, '2025-12'),
    -- Versement propriétaire (401)
    (v_org_id, v_gare_id, '2025-12-31', '2025-12-31', 'Immeuble', 'Jean-Marc Schenker / IBAN CH1608401000070450838',                 '401 — Versement au propriétaire', 401, 4000.00, 0, 'Payé', null, '2025-12');

  -- ─── 10. Transactions — Beaux-Arts 9 (Nov–Dec 2025) ────────
  insert into accounting_transactions
    (organization_id, building_id, date_invoice, date_payment, unit, description, category, account_number, debit, credit, status, tenant_name, month)
  values
    -- Loyers
    (v_org_id, v_beaux_id, '2025-11-30', '2025-11-30', 'Rez-de-chaussée', 'Novembre 2025 — Raffaele POLI',           '101 — Encaissements loyers', 101, 0, 1263.00, 'Payé', 'Raffaele POLI', '2025-11'),
    (v_org_id, v_beaux_id, '2025-11-30', '2025-11-30', '1er étage',       'Novembre 2025 — Sandrine COMBE',          '101 — Encaissements loyers', 101, 0, 1506.00, 'Payé', 'Sandrine COMBE', '2025-11'),
    (v_org_id, v_beaux_id, '2025-11-30', '2025-11-30', '3ème étage',      'Novembre 2025 — Catherine BAUER-HAINARD', '101 — Encaissements loyers', 101, 0, 1800.00, 'Payé', 'Catherine BAUER-HAINARD', '2025-11'),
    (v_org_id, v_beaux_id, '2025-12-31', '2025-12-31', 'Rez-de-chaussée', 'Décembre 2025 — Raffaele POLI',           '101 — Encaissements loyers', 101, 0, 1263.00, 'Payé', 'Raffaele POLI', '2025-12'),
    (v_org_id, v_beaux_id, '2025-12-31', '2025-12-31', '1er étage',       'Décembre 2025 — Sandrine COMBE',          '101 — Encaissements loyers', 101, 0, 1506.00, 'Payé', 'Sandrine COMBE', '2025-12'),
    (v_org_id, v_beaux_id, '2025-12-31', '2025-12-31', '3ème étage',      'Décembre 2025 — Catherine BAUER-HAINARD', '101 — Encaissements loyers', 101, 0, 1800.00, 'Payé', 'Catherine BAUER-HAINARD', '2025-12'),
    -- Acomptes de charges
    (v_org_id, v_beaux_id, '2025-11-30', '2025-11-30', 'Rez-de-chaussée', 'Novembre 2025 — Raffaele POLI',           '103 — Acomptes de charges', 103, 0, 60.00, 'Payé', 'Raffaele POLI', '2025-11'),
    (v_org_id, v_beaux_id, '2025-11-30', '2025-11-30', '1er étage',       'Novembre 2025 — Sandrine COMBE',          '103 — Acomptes de charges', 103, 0, 60.00, 'Payé', 'Sandrine COMBE', '2025-11'),
    (v_org_id, v_beaux_id, '2025-11-30', '2025-11-30', '3ème étage',      'Novembre 2025 — Catherine BAUER-HAINARD', '103 — Acomptes de charges', 103, 0, 55.00, 'Payé', 'Catherine BAUER-HAINARD', '2025-11'),
    (v_org_id, v_beaux_id, '2025-11-30', '2025-11-30', '4ème étage',      'Novembre 2025 — Emile FARINE',            '103 — Acomptes de charges', 103, 0, 80.00, 'Payé', 'Emile FARINE', '2025-11'),
    (v_org_id, v_beaux_id, '2025-12-31', '2025-12-31', 'Rez-de-chaussée', 'Décembre 2025 — Raffaele POLI',           '103 — Acomptes de charges', 103, 0, 60.00, 'Payé', 'Raffaele POLI', '2025-12'),
    (v_org_id, v_beaux_id, '2025-12-31', '2025-12-31', '1er étage',       'Décembre 2025 — Sandrine COMBE',          '103 — Acomptes de charges', 103, 0, 60.00, 'Payé', 'Sandrine COMBE', '2025-12'),
    (v_org_id, v_beaux_id, '2025-12-31', '2025-12-31', '3ème étage',      'Décembre 2025 — Catherine BAUER-HAINARD', '103 — Acomptes de charges', 103, 0, 55.00, 'Payé', 'Catherine BAUER-HAINARD', '2025-12'),
    (v_org_id, v_beaux_id, '2025-12-31', '2025-12-31', '4ème étage',      'Décembre 2025 — Emile FARINE',            '103 — Acomptes de charges', 103, 0, 80.00, 'Payé', 'Emile FARINE', '2025-12'),
    -- Entretien appart (202)
    (v_org_id, v_beaux_id, '2025-11-21', '2025-11-21', '1er étage',       '2R technique — Remplacement mélangeur évier cuisine — Fact. N°251194', '202 — Entretien appartements', 202, 665.05, 0, 'Payé', null, '2025-11'),
    -- Électricité (213)
    (v_org_id, v_beaux_id, '2025-10-31', '2025-10-31', '2ième étage',     'Viteos — Électricité — Fact. N°8''674''699 — Mai à oct. 25',           '213 — Électricité', 213, 293.35, 0, 'Payé', null, '2025-10'),
    (v_org_id, v_beaux_id, '2025-10-31', '2025-10-31', 'Combes',          'Viteos — Électricité app. combes — Fact. N°8''674''698',               '213 — Électricité', 213, 71.35,  0, 'Payé', null, '2025-10'),
    (v_org_id, v_beaux_id, '2025-10-31', '2025-10-31', 'Immeuble',        'Viteos — Électricité communs — Fact. N°8''671''756',                    '213 — Électricité', 213, 37.45,  0, 'Payé', null, '2025-10'),
    -- Gaz (214)
    (v_org_id, v_beaux_id, '2025-10-31', '2025-10-31', '2ième étage',     'Viteos — Gaz — Fact. N°8''675''183 — Mai à oct. 25',                   '214 — Gaz', 214, 222.45, 0, 'Payé', null, '2025-10'),
    -- Eau (215)
    (v_org_id, v_beaux_id, '2025-10-31', '2025-10-31', 'Immeuble',        'Viteos — Eau — Fact. N°8''671''755 — Mai à oct. 25',                   '215 — Eau', 215, 843.00, 0, 'Payé', null, '2025-10'),
    -- Rénovation complète 2e étage (302)
    (v_org_id, v_beaux_id, '2025-10-06', '2025-10-06', '2ième étage', '2R Technique — Acompte N°1 — Installation sanitaire',                      '302 — Rénovation complète appartement 2e étage', 302, 8666.30,  0, 'Payé', null, '2025-10'),
    (v_org_id, v_beaux_id, '2025-10-21', '2025-10-21', '2ième étage', 'Mantuano — Acompte N°1 — Fact. N°25''160 — Travaux maçonnerie',            '302 — Rénovation complète appartement 2e étage', 302, 10900.00, 0, 'Payé', null, '2025-10'),
    (v_org_id, v_beaux_id, '2025-11-11', '2025-11-11', '2ième étage', 'Borko — Sous-bassement — Fact. N°7147',                                    '302 — Rénovation complète appartement 2e étage', 302, 908.05,   0, 'Payé', null, '2025-11'),
    (v_org_id, v_beaux_id, '2025-11-13', '2025-11-13', '2ième étage', 'Sahli — Acompte N°1 — Fact. RE-00568',                                     '302 — Rénovation complète appartement 2e étage', 302, 8000.00,  0, 'Payé', null, '2025-11'),
    (v_org_id, v_beaux_id, '2025-11-18', '2025-11-18', '2ième étage', 'ISP Agencements — Pose cuisine — Acompte N°1',                             '302 — Rénovation complète appartement 2e étage', 302, 9680.00,  0, 'Payé', null, '2025-11'),
    (v_org_id, v_beaux_id, '2025-11-18', '2025-11-18', '2ième étage', 'ISP Agencements — Pose cuisine — Acompte N°2',                             '302 — Rénovation complète appartement 2e étage', 302, 12100.00, 0, 'Payé', null, '2025-11'),
    -- Centralisation chauffage (303)
    (v_org_id, v_beaux_id, '2025-09-30', '2025-09-30', 'Immeuble', 'Obrist — Tubage conduit de fumée — Fact. N°250407',                           '303 — Centralisation du chauffage', 303, 5947.15,  0, 'Payé', null, '2025-09'),
    (v_org_id, v_beaux_id, '2025-10-16', '2025-10-16', 'Immeuble', 'Jacot — Acompte N°1 — Fact. N°252152 — Centralisation chauffage',             '303 — Centralisation du chauffage', 303, 25000.00, 0, 'Payé', null, '2025-10'),
    (v_org_id, v_beaux_id, '2025-10-21', '2025-10-21', 'Immeuble', 'Mantuano — Acompte N°1 — Fact. N°25''161 — Travaux maçonnerie',               '303 — Centralisation du chauffage', 303, 400.00,   0, 'Payé', null, '2025-10'),
    (v_org_id, v_beaux_id, '2025-11-13', '2025-11-13', 'Immeuble', 'Sahli — Acompte N°1 — Fact. RE-00548',                                        '303 — Centralisation du chauffage', 303, 5000.00,  0, 'Payé', null, '2025-11'),
    -- Honoraires de gestion (216)
    (v_org_id, v_beaux_id, '2025-12-31', '2025-12-31', 'Immeuble', 'Honoraire de gestion nov–déc 2025',                                           '216 — Honoraires de gestion', 216, 456.90,  0, 'Payé', null, '2025-12'),
    -- Versement propriétaire (401)
    (v_org_id, v_beaux_id, '2025-12-31', '2025-12-31', 'Immeuble', 'Jean-Marc Schenker / IBAN CH1608401000070450838',                             '401 — Versement au propriétaire', 401, 4000.00, 0, 'Payé', null, '2025-12');

  raise notice 'Seed complete: 2 buildings, 14 tenants, ~100 transactions inserted';
end
$$;
