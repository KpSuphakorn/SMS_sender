from bson import ObjectId

def convert_objectid_to_str(data):
    if isinstance(data, list):
        return [convert_objectid_to_str(item) for item in data]
    if isinstance(data, dict):
        return {key: convert_objectid_to_str(value) for key, value in data.items()}
    if isinstance(data, ObjectId):
        return str(data)
    return data