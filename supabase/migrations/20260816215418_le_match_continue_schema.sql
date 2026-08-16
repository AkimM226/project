/*
# Le Match Continue — Initial Schema Setup

## Overview
Complete database schema for the CDS "Le Match Continue" event:
- Boys vs Girls match (Aug 27) → score = bonus
- Blood donation drive (Aug 28) → goal: 50+ donors
- PIN-based auth with 3 roles (organisateur, mobilisateur, staff)
- Cross-table phone uniqueness enforced via triggers

## New Tables

1. `utilisateurs` — App access accounts
   - id (uuid PK), prenom (text), pin (text, 4 digits, unique), role (text), created_at
   - Roles: 'organisateur', 'mobilisateur', 'staff'

2. `participants` — Game recruiters (boys vs girls)
   - id, nom, telephone (unique), genre (M/F), role_joueur (joueur/spectateur)
   - present (bool, default false) — tracks if recruiter showed up on Aug 28
   - timestamp_pointage, saisi_par_utilisateur_id, created_at

3. `promesses` — People promised by recruiters
   - id, recruteur_id (FK participants), nom_personne, telephone (unique)
   - statut (en_attente/presente/en_litige), saisi_par_utilisateur_id
   - timestamp_enregistrement, timestamp_pointage

4. `inscriptions_staff` — People registered by staff (outside game)
   - id, staff_utilisateur_id (FK utilisateurs), nom, telephone (unique)
   - statut (en_attente/presente), timestamp_enregistrement, timestamp_pointage

5. `donneurs_spontanes` — Walk-in donors not found in any other table
   - id, nom, telephone, timestamp_pointage

6. `match_config` — Singleton config (one row, id=1)
   - score_bonus_garcons, score_bonus_filles, objectif_global (default 50)

## Functions (all SECURITY DEFINER)
- `generate_unique_pin()` — generates a unique 4-digit PIN
- `verify_pin(pin)` — returns user info (id, prenom, role) or null
- `create_user(prenom, role)` — creates user with unique PIN, returns full record
- `check_telephone(phone)` — checks all 4 tables for phone existence
- `pointer_personne(phone, nom)` — atomic pointage across all sources
- `get_dashboard_stats()` — returns aggregated stats for dashboard

## Triggers
- `enforce_telephone_uniqueness` — BEFORE INSERT on participants, promesses, inscriptions_staff, donneurs_spontanes
  Prevents cross-table phone duplicates (phone can only exist in one table)

## Security
- RLS enabled on all tables
- `utilisateurs`: anon can SELECT non-pin columns only (column-level GRANT)
  No direct INSERT policy (use create_user function)
  UPDATE and DELETE allowed for anon (admin operations)
- All other tables: full CRUD for anon, authenticated (client-side role enforcement)
- All functions: EXECUTE granted to anon, authenticated

## Seed Data
- 2 organizer accounts: Akim (PIN 1305), Nathanaël (PIN 1805)
- Default match_config: bonus 0-0, goal 50
*/

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS utilisateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom text NOT NULL,
  pin text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('organisateur', 'mobilisateur', 'staff')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  telephone text NOT NULL UNIQUE,
  genre text NOT NULL CHECK (genre IN ('M', 'F')),
  role_joueur text NOT NULL CHECK (role_joueur IN ('joueur', 'spectateur')),
  present boolean NOT NULL DEFAULT false,
  timestamp_pointage timestamptz,
  saisi_par_utilisateur_id uuid REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruteur_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  nom_personne text NOT NULL,
  telephone text NOT NULL UNIQUE,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'presente', 'en_litige')),
  saisi_par_utilisateur_id uuid REFERENCES utilisateurs(id) ON DELETE SET NULL,
  timestamp_enregistrement timestamptz DEFAULT now(),
  timestamp_pointage timestamptz
);

CREATE TABLE IF NOT EXISTS inscriptions_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_utilisateur_id uuid REFERENCES utilisateurs(id) ON DELETE SET NULL,
  nom text NOT NULL,
  telephone text NOT NULL UNIQUE,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'presente')),
  timestamp_enregistrement timestamptz DEFAULT now(),
  timestamp_pointage timestamptz
);

CREATE TABLE IF NOT EXISTS donneurs_spontanes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text,
  telephone text NOT NULL UNIQUE,
  timestamp_pointage timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS match_config (
  id int PRIMARY KEY DEFAULT 1,
  score_bonus_garcons int NOT NULL DEFAULT 0,
  score_bonus_filles int NOT NULL DEFAULT 0,
  objectif_global int NOT NULL DEFAULT 50,
  CHECK (id = 1)
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_participants_genre ON participants(genre);
CREATE INDEX IF NOT EXISTS idx_promesses_recruteur_id ON promesses(recruteur_id);
CREATE INDEX IF NOT EXISTS idx_promesses_statut ON promesses(statut);
CREATE INDEX IF NOT EXISTS idx_inscriptions_staff_staff_id ON inscriptions_staff(staff_utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_staff_statut ON inscriptions_staff(statut);

-- ============================================================
-- 3. ENABLE RLS
-- ============================================================

ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE promesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE donneurs_spontanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_config ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. POLICIES
-- ============================================================

-- utilisateurs: SELECT non-pin columns only, UPDATE, DELETE (no direct INSERT)
REVOKE SELECT ON utilisateurs FROM anon, authenticated;
GRANT SELECT (id, prenom, role, created_at) ON utilisateurs TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_utilisateurs" ON utilisateurs;
CREATE POLICY "anon_select_utilisateurs" ON utilisateurs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_update_utilisateurs" ON utilisateurs;
CREATE POLICY "anon_update_utilisateurs" ON utilisateurs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_utilisateurs" ON utilisateurs;
CREATE POLICY "anon_delete_utilisateurs" ON utilisateurs FOR DELETE
  TO anon, authenticated USING (true);

-- participants: full CRUD
DROP POLICY IF EXISTS "anon_select_participants" ON participants;
CREATE POLICY "anon_select_participants" ON participants FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_participants" ON participants;
CREATE POLICY "anon_insert_participants" ON participants FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_participants" ON participants;
CREATE POLICY "anon_update_participants" ON participants FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_participants" ON participants;
CREATE POLICY "anon_delete_participants" ON participants FOR DELETE
  TO anon, authenticated USING (true);

-- promesses: full CRUD
DROP POLICY IF EXISTS "anon_select_promesses" ON promesses;
CREATE POLICY "anon_select_promesses" ON promesses FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_promesses" ON promesses;
CREATE POLICY "anon_insert_promesses" ON promesses FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_promesses" ON promesses;
CREATE POLICY "anon_update_promesses" ON promesses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_promesses" ON promesses;
CREATE POLICY "anon_delete_promesses" ON promesses FOR DELETE
  TO anon, authenticated USING (true);

-- inscriptions_staff: full CRUD
DROP POLICY IF EXISTS "anon_select_inscriptions_staff" ON inscriptions_staff;
CREATE POLICY "anon_select_inscriptions_staff" ON inscriptions_staff FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_inscriptions_staff" ON inscriptions_staff;
CREATE POLICY "anon_insert_inscriptions_staff" ON inscriptions_staff FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_inscriptions_staff" ON inscriptions_staff;
CREATE POLICY "anon_update_inscriptions_staff" ON inscriptions_staff FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_inscriptions_staff" ON inscriptions_staff;
CREATE POLICY "anon_delete_inscriptions_staff" ON inscriptions_staff FOR DELETE
  TO anon, authenticated USING (true);

-- donneurs_spontanes: full CRUD
DROP POLICY IF EXISTS "anon_select_donneurs_spontanes" ON donneurs_spontanes;
CREATE POLICY "anon_select_donneurs_spontanes" ON donneurs_spontanes FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_donneurs_spontanes" ON donneurs_spontanes;
CREATE POLICY "anon_insert_donneurs_spontanes" ON donneurs_spontanes FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_donneurs_spontanes" ON donneurs_spontanes;
CREATE POLICY "anon_update_donneurs_spontanes" ON donneurs_spontanes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_donneurs_spontanes" ON donneurs_spontanes;
CREATE POLICY "anon_delete_donneurs_spontanes" ON donneurs_spontanes FOR DELETE
  TO anon, authenticated USING (true);

-- match_config: SELECT + UPDATE
DROP POLICY IF EXISTS "anon_select_match_config" ON match_config;
CREATE POLICY "anon_select_match_config" ON match_config FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_update_match_config" ON match_config;
CREATE POLICY "anon_update_match_config" ON match_config FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- generate_unique_pin: generates a unique 4-digit PIN
CREATE OR REPLACE FUNCTION generate_unique_pin()
RETURNS text AS $$
DECLARE
  v_pin text;
  v_attempts int := 0;
BEGIN
  LOOP
    v_pin := lpad(floor(random() * 10000)::text, 4, '0');
    IF NOT EXISTS (SELECT 1 FROM utilisateurs WHERE pin = v_pin) THEN
      RETURN v_pin;
    END IF;
    v_attempts := v_attempts + 1;
    IF v_attempts > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique PIN';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- verify_pin: returns user info (without pin) or null
CREATE OR REPLACE FUNCTION verify_pin(p_pin text)
RETURNS TABLE(id uuid, prenom text, role text) AS $$
BEGIN
  SELECT u.id, u.prenom, u.role INTO id, prenom, role
  FROM utilisateurs u
  WHERE u.pin = p_pin;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- create_user: creates a user with a unique PIN, returns full record
CREATE OR REPLACE FUNCTION create_user(p_prenom text, p_role text)
RETURNS TABLE(id uuid, prenom text, pin text, role text) AS $$
DECLARE
  v_pin text;
BEGIN
  v_pin := generate_unique_pin();
  INSERT INTO utilisateurs (prenom, pin, role) VALUES (p_prenom, v_pin, p_role)
  RETURNING id, prenom, pin, role INTO id, prenom, pin, role;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- check_telephone: checks all tables for phone existence
CREATE OR REPLACE FUNCTION check_telephone(p_telephone text)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object('exists', true, 'source', 'participant', 'nom', nom, 'genre', genre)
  INTO v_result FROM participants WHERE telephone = p_telephone;

  IF v_result IS NULL THEN
    SELECT jsonb_build_object('exists', true, 'source', 'promesse', 'nom', p.nom_personne, 'recruteur', r.nom, 'genre', r.genre)
    INTO v_result FROM promesses p JOIN participants r ON p.recruteur_id = r.id WHERE p.telephone = p_telephone;
  END IF;

  IF v_result IS NULL THEN
    SELECT jsonb_build_object('exists', true, 'source', 'staff', 'nom', nom)
    INTO v_result FROM inscriptions_staff WHERE telephone = p_telephone;
  END IF;

  IF v_result IS NULL THEN
    SELECT jsonb_build_object('exists', true, 'source', 'spontane', 'nom', nom)
    INTO v_result FROM donneurs_spontanes WHERE telephone = p_telephone;
  END IF;

  IF v_result IS NULL THEN
    v_result := jsonb_build_object('exists', false);
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- pointer_personne: atomic pointage across all sources
CREATE OR REPLACE FUNCTION pointer_personne(p_telephone text, p_nom text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_participant RECORD;
  v_promesse RECORD;
  v_staff RECORD;
  v_spontane RECORD;
BEGIN
  -- 1. Check participants (recruiters showing up themselves)
  SELECT id, nom, genre, present INTO v_participant
  FROM participants WHERE telephone = p_telephone;
  IF v_participant.id IS NOT NULL THEN
    IF v_participant.present THEN
      RETURN jsonb_build_object('status', 'already_pointed', 'type', 'recruteur', 'nom', v_participant.nom, 'equipe', CASE WHEN v_participant.genre = 'M' THEN 'garcons' ELSE 'filles' END);
    END IF;
    UPDATE participants SET present = true, timestamp_pointage = now() WHERE id = v_participant.id;
    RETURN jsonb_build_object('status', 'success', 'type', 'recruteur', 'nom', v_participant.nom, 'equipe', CASE WHEN v_participant.genre = 'M' THEN 'garcons' ELSE 'filles' END);
  END IF;

  -- 2. Check promesses
  SELECT p.id, p.nom_personne, p.statut, r.nom as recruteur_nom, r.genre as recruteur_genre
  INTO v_promesse
  FROM promesses p JOIN participants r ON p.recruteur_id = r.id
  WHERE p.telephone = p_telephone;
  IF v_promesse.id IS NOT NULL THEN
    IF v_promesse.statut = 'presente' THEN
      RETURN jsonb_build_object('status', 'already_pointed', 'type', 'promesse', 'nom', v_promesse.nom_personne, 'equipe', CASE WHEN v_promesse.recruteur_genre = 'M' THEN 'garcons' ELSE 'filles' END);
    END IF;
    UPDATE promesses SET statut = 'presente', timestamp_pointage = now() WHERE id = v_promesse.id;
    RETURN jsonb_build_object('status', 'success', 'type', 'promesse', 'nom', v_promesse.nom_personne, 'recruteur', v_promesse.recruteur_nom, 'equipe', CASE WHEN v_promesse.recruteur_genre = 'M' THEN 'garcons' ELSE 'filles' END);
  END IF;

  -- 3. Check inscriptions_staff
  SELECT id, nom, statut INTO v_staff
  FROM inscriptions_staff WHERE telephone = p_telephone;
  IF v_staff.id IS NOT NULL THEN
    IF v_staff.statut = 'presente' THEN
      RETURN jsonb_build_object('status', 'already_pointed', 'type', 'staff', 'nom', v_staff.nom);
    END IF;
    UPDATE inscriptions_staff SET statut = 'presente', timestamp_pointage = now() WHERE id = v_staff.id;
    RETURN jsonb_build_object('status', 'success', 'type', 'staff', 'nom', v_staff.nom);
  END IF;

  -- 4. Check donneurs_spontanes
  SELECT id, nom INTO v_spontane FROM donneurs_spontanes WHERE telephone = p_telephone;
  IF v_spontane.id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_pointed', 'type', 'spontane', 'nom', v_spontane.nom);
  END IF;

  -- 5. Not found - create spontaneous donor
  INSERT INTO donneurs_spontanes (nom, telephone) VALUES (COALESCE(p_nom, 'Donneur spontane'), p_telephone);
  RETURN jsonb_build_object('status', 'success', 'type', 'spontane', 'nom', COALESCE(p_nom, 'Donneur spontane'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_dashboard_stats: aggregated stats for dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS jsonb AS $$
DECLARE
  v_config RECORD;
  v_promesses_g int;
  v_promesses_f int;
  v_recruteurs_g int;
  v_recruteurs_f int;
  v_staff_presentes int;
  v_spontanes int;
  v_total_promesses int;
  v_total_inscriptions int;
BEGIN
  SELECT * INTO v_config FROM match_config WHERE id = 1;

  SELECT COUNT(*) INTO v_promesses_g
  FROM promesses p JOIN participants r ON p.recruteur_id = r.id
  WHERE p.statut = 'presente' AND r.genre = 'M';

  SELECT COUNT(*) INTO v_promesses_f
  FROM promesses p JOIN participants r ON p.recruteur_id = r.id
  WHERE p.statut = 'presente' AND r.genre = 'F';

  SELECT COUNT(*) INTO v_recruteurs_g
  FROM participants WHERE present = true AND genre = 'M';

  SELECT COUNT(*) INTO v_recruteurs_f
  FROM participants WHERE present = true AND genre = 'F';

  SELECT COUNT(*) INTO v_staff_presentes
  FROM inscriptions_staff WHERE statut = 'presente';

  SELECT COUNT(*) INTO v_spontanes
  FROM donneurs_spontanes;

  SELECT COUNT(*) INTO v_total_promesses FROM promesses;

  SELECT COUNT(*) INTO v_total_inscriptions FROM inscriptions_staff;

  RETURN jsonb_build_object(
    'bonusGarcons', v_config.score_bonus_garcons,
    'bonusFilles', v_config.score_bonus_filles,
    'objectif', v_config.objectif_global,
    'mobilisationGarcons', v_promesses_g + v_recruteurs_g,
    'mobilisationFilles', v_promesses_f + v_recruteurs_f,
    'promessesPresentesGarcons', v_promesses_g,
    'promessesPresentesFilles', v_promesses_f,
    'recruteursPresentsGarcons', v_recruteurs_g,
    'recruteursPresentsFilles', v_recruteurs_f,
    'staffPresentes', v_staff_presentes,
    'spontanes', v_spontanes,
    'scoreGarcons', v_promesses_g + v_recruteurs_g + v_config.score_bonus_garcons,
    'scoreFilles', v_promesses_f + v_recruteurs_f + v_config.score_bonus_filles,
    'totalPresent', v_promesses_g + v_promesses_f + v_recruteurs_g + v_recruteurs_f + v_staff_presentes + v_spontanes,
    'totalPromesses', v_total_promesses,
    'totalInscriptions', v_total_inscriptions
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_telephone_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME != 'participants' AND EXISTS (SELECT 1 FROM participants WHERE telephone = NEW.telephone) THEN
    RAISE EXCEPTION 'DUPLICATE_PHONE';
  END IF;
  IF TG_TABLE_NAME != 'promesses' AND EXISTS (SELECT 1 FROM promesses WHERE telephone = NEW.telephone) THEN
    RAISE EXCEPTION 'DUPLICATE_PHONE';
  END IF;
  IF TG_TABLE_NAME != 'inscriptions_staff' AND EXISTS (SELECT 1 FROM inscriptions_staff WHERE telephone = NEW.telephone) THEN
    RAISE EXCEPTION 'DUPLICATE_PHONE';
  END IF;
  IF TG_TABLE_NAME != 'donneurs_spontanes' AND EXISTS (SELECT 1 FROM donneurs_spontanes WHERE telephone = NEW.telephone) THEN
    RAISE EXCEPTION 'DUPLICATE_PHONE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_telephone_unique_participants ON participants;
CREATE TRIGGER trigger_telephone_unique_participants
  BEFORE INSERT ON participants
  FOR EACH ROW EXECUTE FUNCTION enforce_telephone_uniqueness();

DROP TRIGGER IF EXISTS trigger_telephone_unique_promesses ON promesses;
CREATE TRIGGER trigger_telephone_unique_promesses
  BEFORE INSERT ON promesses
  FOR EACH ROW EXECUTE FUNCTION enforce_telephone_uniqueness();

DROP TRIGGER IF EXISTS trigger_telephone_unique_inscriptions_staff ON inscriptions_staff;
CREATE TRIGGER trigger_telephone_unique_inscriptions_staff
  BEFORE INSERT ON inscriptions_staff
  FOR EACH ROW EXECUTE FUNCTION enforce_telephone_uniqueness();

DROP TRIGGER IF EXISTS trigger_telephone_unique_donneurs_spontanes ON donneurs_spontanes;
CREATE TRIGGER trigger_telephone_unique_donneurs_spontanes
  BEFORE INSERT ON donneurs_spontanes
  FOR EACH ROW EXECUTE FUNCTION enforce_telephone_uniqueness();

-- ============================================================
-- 7. GRANTS
-- ============================================================

GRANT EXECUTE ON FUNCTION verify_pin(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_user(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_telephone(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION pointer_personne(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO anon, authenticated;

-- ============================================================
-- 8. SEED DATA
-- ============================================================

INSERT INTO match_config (id, score_bonus_garcons, score_bonus_filles, objectif_global)
VALUES (1, 0, 0, 50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO utilisateurs (prenom, pin, role) VALUES
  ('Akim', '1305', 'organisateur'),
  ('Nathanael', '1805', 'organisateur')
ON CONFLICT (pin) DO NOTHING;
