echo "Adding new geometries to geometries table..."
psql -c "INSERT INTO geometries ( source_id, geometry_geom )
         SELECT source_id, geometry_geom
         FROM new_geometries;"

echo "Flushing geometry tile cache..."
curl -s -X POST http://localhost:3000/tiles/cache/clear-geometry \
     -H "x-admin-secret: ${ADMIN_SECRET}" \
  && echo "Geometry cache flushed successfully" \
  || echo "Warning: failed to flush geometry cache (is the app running?)"