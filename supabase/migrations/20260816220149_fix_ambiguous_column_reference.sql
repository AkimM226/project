/*
# Fix: ambiguous column reference in create_user and verify_pin functions

The `create_user` function used unqualified column names in its RETURNING clause,
which conflicted with the output column variable names (id, prenom, pin, role).
This caused "column reference 'id' is ambiguous" when adding users.

Fix: DROP and recreate both functions with qualified column references and
explicitly named output parameters to avoid any ambiguity.
*/

DROP FUNCTION IF EXISTS create_user(text, text);
DROP FUNCTION IF EXISTS verify_pin(text);

CREATE OR REPLACE FUNCTION verify_pin(p_pin text)
RETURNS TABLE(v_id uuid, v_prenom text, v_role text) AS $$
BEGIN
  SELECT u.id, u.prenom, u.role INTO v_id, v_prenom, v_role
  FROM utilisateurs u
  WHERE u.pin = p_pin;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_user(p_prenom text, p_role text)
RETURNS TABLE(v_id uuid, v_prenom text, v_pin text, v_role text) AS $$
DECLARE
  v_generated_pin text;
BEGIN
  v_generated_pin := generate_unique_pin();
  INSERT INTO utilisateurs (prenom, pin, role) VALUES (p_prenom, v_generated_pin, p_role)
  RETURNING utilisateurs.id, utilisateurs.prenom, utilisateurs.pin, utilisateurs.role
  INTO v_id, v_prenom, v_pin, v_role;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_user(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_pin(text) TO anon, authenticated;
