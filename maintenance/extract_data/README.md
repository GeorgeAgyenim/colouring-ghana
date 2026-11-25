# Colouring Ghana Data Extract

This extract contains a snapshot of contributions to Colouring Ghana, a citizen science platform
collecting information on buildings in Ghana.

The data included are open data, licensed under the Open Data Commons Open Database License
(ODbL, http://opendatacommons.org/licenses/odbl/) by Colouring Ghana contributors.

You are free to copy, distribute, transmit and adapt the data, as long as you credit Colouring
Ghana and our contributors. If you alter or build upon our data, you may distribute the
result only under the same licence.


## Contents

This extract contains three files:

- README.md
- building_attributes.csv
- edit_history.csv

Both CSV files were read from the database at the same moment, so they agree with each other.
Building footprint geometries are not included.


## Building Attributes

One row per building, with every attribute the platform holds for it: the same values the
platform's building API returns. Most fields are optional and empty until someone adds them.

- `building_id`: unique building ID for Colouring Ghana buildings
- `revision_id`: the latest change to this building, cross-references `revision_id` in
  edit_history.csv
- `geometry_id`: ID of the building's footprint shape (the shapes themselves are not included)

The other column names start with the topic they belong to, for example:

- `location_…`: building name, address and GhanaPost GPS address, coordinates
- `current_landuse_…`: current land use
- `typology_…`, `size_…`: building type, number of storeys, heights, floor areas
- `construction_…`: structural system, materials, roof, walls
- `date_…`, `age_…`, `facade_…`, `extension_…`, `survival_…`: when the building and its parts
  were built, and what survives
- `planning_…`: protection and planning status
- `sust_…`, `energy_…`: sustainability ratings and energy features
- `context_…`: surroundings, such as street width and distance to green space
- `community_…`, `likes_total`: what contributors say about the building
- `disaster_…`: damage from disasters

A field's `…_source_type` and `…_source_links` columns record where its value came from.
Columns that hold lists use PostgreSQL's array form, for example `{brick,"burnt clay"}`.


## Edit History

Each change to the Colouring Ghana database is recorded, so it is possible to explore how the
dataset evolves over time.

The edit history logs changes made by contributors, with the following fields:

- `revision_id`: unique change id, referenced by building_attributes
- `revision_timestamp`: date and time of the change
- `building_id`: Colouring Ghana building ID, references building_attributes
- `forward_patch`: the changes made, encoded as a JSON string where keys are attribute/column
  names, and values are the values set by this change.
- `reverse_patch`: the reverse of the change, encoded as a JSON string. This shows what the
  values were before this change was made.
- `user`: username of the contributor who made the change

For example a forward patch might show a building date being provided, along with its source:

    {"date_year": 1957, "date_source_type": "Assessed by eye/personal knowledge of the building"}

Where the reverse patch shows that there was no previous data stored:

    {"date_year": null, "date_source_type": null}
