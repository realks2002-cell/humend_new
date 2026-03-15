-- 도착 판정 반경을 250m → 200m로 변경
CREATE OR REPLACE FUNCTION check_arrival_distance(
  p_shift_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius DOUBLE PRECISION DEFAULT 200
)
RETURNS TABLE (
  is_arrived BOOLEAN,
  distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_lat DOUBLE PRECISION;
  v_client_lng DOUBLE PRECISION;
  v_distance DOUBLE PRECISION;
BEGIN
  -- shift에 연결된 고객사 좌표 조회
  SELECT c.latitude, c.longitude
  INTO v_client_lat, v_client_lng
  FROM daily_shifts ds
  JOIN clients c ON c.id = ds.client_id
  WHERE ds.id = p_shift_id;

  IF v_client_lat IS NULL OR v_client_lng IS NULL THEN
    RETURN QUERY SELECT false, NULL::DOUBLE PRECISION;
    RETURN;
  END IF;

  -- PostGIS ST_Distance (미터 단위, geography 타입)
  v_distance := ST_Distance(
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(v_client_lng, v_client_lat), 4326)::geography
  );

  RETURN QUERY SELECT (v_distance <= p_radius), v_distance;
END;
$$;
