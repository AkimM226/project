/*
# Add reset_database function

Adds a SECURITY DEFINER function that clears all event data while preserving:
- Organisateur accounts (Akim, Nathanaël)
- match_config (reset to defaults: 0/0/50)

Tables cleared:
- participants
- promesses
- inscriptions_staff
- donneurs_spontanes

Non-organisateur users (mobilisateur, staff) are also deleted since their
associated data (inscriptions_staff) is being wiped.

EXECUTE granted to anon, authenticated.
*/

CREATE OR REPLACE FUNCTION reset_database()
RETURNS jsonb AS $$
BEGIN
  DELETE FROM donneurs_spontanes;
  DELETE FROM promesses;
  DELETE FROM inscriptions_staff;
  DELETE FROM participants;
  DELETE FROM utilisateurs WHERE role != 'organisateur';
  UPDATE match_config SET score_bonus_garcons = 0, score_bonus_filles = 0, objectif_global = 50 WHERE id = 1;
  
  RETURN jsonb_build_object('success', true, 'message', 'Database reset complete');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reset_database() TO anon, authenticated;
