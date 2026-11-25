#!/usr/bin/env python3
"""Make an open data extract of Colouring Ghana and list it on the downloads page.

Writes data-extract-<UTC time>.zip into EXTRACTS_DIRECTORY and adds a row to bulk_extracts.
The app serves EXTRACTS_DIRECTORY at /downloads/ (app/src/server.tsx) and the downloads page
lists bulk_extracts (app/src/api/services/dataExtract.ts).

The zip holds README.md (this folder), building_attributes.csv (export_attributes.sql) and
edit_history.csv (export_edit_history.sql).

Environment: PGHOST, PGDATABASE, PGUSER, PGPASSWORD, optional PGPORT (default 5432), and
EXTRACTS_DIRECTORY: an absolute path, the same value the app is started with.
The database role needs SELECT on buildings, logs and users, and INSERT on bulk_extracts.
No superuser is needed: the CSVs are streamed to this machine, not written by the database server.

Run from the repository root:
    python3 -m venv maintenance/.venv
    maintenance/.venv/bin/pip install -r maintenance/requirements.txt
    maintenance/.venv/bin/python maintenance/extract_data/extract_data.py

To refresh the extract every night at 03:00, a cron entry such as:
    0 3 * * * cd /path/to/colouring-ghana && . /path/to/env-file && maintenance/.venv/bin/python maintenance/extract_data/extract_data.py
"""

import datetime
import os
from pathlib import Path
import tempfile
import zipfile

import psycopg2


SCRIPT_DIRECTORY = Path(__file__).resolve().parent

# (file name in the zip, query that fills it)
CSV_EXPORTS = [
    ('building_attributes.csv', 'export_attributes.sql'),
    ('edit_history.csv', 'export_edit_history.sql'),
]


class ZipFileExistsError(Exception):
    pass


def get_connection():
    return psycopg2.connect(
        host=os.environ['PGHOST'],
        port=os.environ.get('PGPORT', '5432'),
        dbname=os.environ['PGDATABASE'],
        user=os.environ['PGUSER'],
        password=os.environ['PGPASSWORD']
    )


def get_extract_zip_file_path(current_time):
    base_dir = Path(os.environ['EXTRACTS_DIRECTORY'])
    # The app runs from app/ and this script from the repository root: a relative path would
    # point them at different folders and every download link would break.
    if not base_dir.is_absolute():
        raise ValueError('EXTRACTS_DIRECTORY must be an absolute path')
    file_name = f"data-extract-{current_time:%Y-%m-%d-%H_%M_%S}.zip"
    return base_dir / file_name


def add_extract_record_to_database(connection, zip_file_path, extracted_time):
    with connection.cursor() as cur:
        truncated_time = extracted_time.replace(second=0, microsecond=0)
        cur.execute('''INSERT INTO
                bulk_extracts (extracted_on, extract_path)
            VALUES
                (%s, %s)
        ''', (truncated_time, str(zip_file_path)))

        connection.commit()


def read_sql(file_name):
    return (SCRIPT_DIRECTORY / file_name).read_text().strip().rstrip(';')


def export_csvs(connection, out_dir):
    """Write each CSV in CSV_EXPORTS into out_dir.

    All queries read one snapshot (REPEATABLE READ), so every revision_id in the building
    attributes is in the edit history of the same extract.
    """
    connection.set_client_encoding('UTF8')
    connection.set_session(isolation_level='REPEATABLE READ', readonly=True)
    try:
        with connection.cursor() as cur:
            for csv_name, sql_file in CSV_EXPORTS:
                with open(out_dir / csv_name, 'wb') as csv_file:
                    # COPY cannot take its query as a parameter; the text comes from this
                    # folder's .sql files, never from input.
                    cur.copy_expert(f'COPY ({read_sql(sql_file)}) TO STDOUT WITH CSV HEADER', csv_file)
    finally:
        # A lost connection is already closed; touching it would hide the original error.
        if not connection.closed:
            connection.rollback()
            connection.set_session(isolation_level='DEFAULT', readonly='DEFAULT')


def make_data_extract(current_time, connection, zip_file_path):
    if zip_file_path.exists():
        raise ZipFileExistsError('Archive file under specified name already exists')

    zip_file_path.parent.mkdir(parents=True, exist_ok=True)
    # Written under a hidden name and renamed when complete. The app does not serve dot files,
    # so a half-written zip, or one left by a killed run, is never downloadable.
    partial_path = zip_file_path.with_name('.' + zip_file_path.name + '.partial')

    try:
        with tempfile.TemporaryDirectory() as tmp:
            csv_dir = Path(tmp)
            export_csvs(connection, csv_dir)

            with zipfile.ZipFile(partial_path, mode='w', compression=zipfile.ZIP_DEFLATED) as newzip:
                newzip.write(SCRIPT_DIRECTORY / 'README.md', arcname='README.md')
                for csv_name, _ in CSV_EXPORTS:
                    newzip.write(csv_dir / csv_name, arcname=csv_name)

        os.replace(partial_path, zip_file_path)
        add_extract_record_to_database(connection, zip_file_path, current_time)
    except BaseException:
        partial_path.unlink(missing_ok=True)
        zip_file_path.unlink(missing_ok=True)
        raise


def main():
    # Timezone-aware, so extracted_on (timestamptz) is right whatever the database's time zone.
    current_time = datetime.datetime.now(datetime.timezone.utc)
    conn = get_connection()
    try:
        zip_file_path = get_extract_zip_file_path(current_time)
        make_data_extract(current_time, conn, zip_file_path)
    finally:
        conn.close()


if __name__ == '__main__':
    main()
