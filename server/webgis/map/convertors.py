import json

def geojson2xlsx(data):
    # use https://openpyxl.readthedocs.io/en/stable/
    pass


def geojson2csv(data):
    rows = []

    data = json.loads(data)

    # TODO this should be done in more robust way: some feature attributes may
    # be missing by the first feature -> preferably using gdal -> preferably
    # using gdal
    rows.append(",".join([p for p in data["features"][0]["properties"].keys()]))

    for feature in data["features"]:
        values = [v  for v in feature["properties"].values()]
        values = list(map(_none2str, values))
        rows.append(",".join(values))

    return "\n".join(rows)


def geojson2shp(data):
    # use https://pypi.org/project/pygdaltools/
    pass


def geojson2gpkg(data):
    # use https://openpyxl.readthedocs.io/en/stable/
    pass


def _none2str(val):
    if val is None:
        return ""
    else:
        return val
