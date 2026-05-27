exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION public.register_user(
      p_email text,
      p_password_hash text,
      p_name text,
      p_role text DEFAULT 'student'
    )
    RETURNS TABLE(id uuid)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      v_email text;
      v_role text;
    BEGIN
      v_email := lower(trim(p_email));
      v_role := coalesce(nullif(trim(p_role), ''), 'student');

      IF v_email = '' OR p_password_hash IS NULL OR p_password_hash = '' THEN
        RAISE EXCEPTION 'email and password hash are required'
          USING ERRCODE = '22023';
      END IF;

      IF v_role NOT IN ('student', 'teacher') THEN
        RAISE EXCEPTION 'invalid role'
          USING ERRCODE = '22023';
      END IF;

      IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = v_email) THEN
        RAISE EXCEPTION 'user already exists'
          USING ERRCODE = '23505';
      END IF;

      RETURN QUERY
      INSERT INTO public.users (email, password_hash, name, role)
      VALUES (
        v_email,
        p_password_hash,
        coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1)),
        v_role
      )
      RETURNING users.id;
    END;
    $$;
  `);

  pgm.sql(`REVOKE ALL ON FUNCTION public.register_user(text, text, text, text) FROM PUBLIC`);
  pgm.sql(`GRANT EXECUTE ON FUNCTION public.register_user(text, text, text, text) TO anon, authenticated, service_role`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP FUNCTION IF EXISTS public.register_user(text, text, text, text)`);
};
